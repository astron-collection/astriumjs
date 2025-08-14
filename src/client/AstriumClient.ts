/**
 * Main Astrium client class
 */

import { EventEmitter } from "events"
import type { AstriumClientOptions, ClientEvents, GatewayIntents } from "../types/ClientTypes"
import { Logger, LogLevel } from "../utils/Logger"
import { AstriumError } from "../errors/AstriumError"
import { GatewayIntentBits } from "../constants/GatewayIntents"
import { WebSocketManager } from "../gateway/WebSocketManager"
import { RESTManager } from "../rest/RESTManager"
import { EventManager } from "../events/EventManager"
import { CommandManager } from "../commands/CommandManager"
import { PluginManager } from "../plugins/PluginManager"
import { CacheManager, MemoryCacheProvider, RedisCacheProvider } from "../cache/CacheManager"
import { EntityCache } from "../cache/EntityCache"

export class AstriumClient extends EventEmitter {
  public readonly options: Required<AstriumClientOptions>
  public readonly logger: Logger
  public token: string | null = null
  public user: any = null // Will be properly typed later
  public readyAt: Date | null = null
  public readonly rest: RESTManager
  public readonly events: EventManager
  public readonly commands: CommandManager
  public readonly plugins: PluginManager
  public readonly cache: CacheManager
  public readonly guildCache: EntityCache<any>
  public readonly userCache: EntityCache<any>
  public readonly channelCache: EntityCache<any>
  public readonly messageCache: EntityCache<any>

  private wsManager: WebSocketManager | null = null
  private _ready = false

  constructor(options: AstriumClientOptions) {
    super()

    // Validate required options
    if (!options.token) {
      throw new AstriumError("Client token is required")
    }

    if (!options.intents || options.intents.length === 0) {
      throw new AstriumError("At least one intent is required")
    }

    // Set default options
    this.options = {
      token: options.token,
      intents: options.intents,
      apiVersion: options.apiVersion ?? 10,
      sharding: {
        totalShards: "auto",
        shardList: [0],
        mode: "process",
        ...options.sharding,
      },
      cache: {
        provider: "memory",
        ttl: {
          guilds: 3600,
          users: 1800,
          channels: 3600,
          messages: 300,
        },
        limits: {
          guilds: 1000,
          users: 10000,
          channels: 5000,
          messages: 1000,
        },
        ...options.cache,
      },
      logging: {
        level: "info",
        ...options.logging,
      },
      plugins: options.plugins ?? [],
      rest: {
        timeout: 15000,
        rateLimitRetryLimit: 3,
        globalRequestsPerSecond: 50,
        ...options.rest,
      },
      ws: {
        connectionTimeout: 30000,
        maxReconnectAttempts: 5,
        reconnectDelay: 5000,
        ...options.ws,
      },
    }

    // Initialize logger
    this.logger = new Logger({
      level: this.getLogLevel(this.options.logging.level),
      prefix: "[Astrium]",
      colors: true,
      timestamp: true,
    })

    this.token = this.options.token

    this.rest = new RESTManager(this)
    this.events = new EventManager(this)
    this.commands = new CommandManager(this)
    this.plugins = new PluginManager(this)

    this.cache = new CacheManager()
    this.setupCaching()

    this.guildCache = new EntityCache(this.cache, "guild", this.options.cache.ttl?.guilds)
    this.userCache = new EntityCache(this.cache, "user", this.options.cache.ttl?.users)
    this.channelCache = new EntityCache(this.cache, "channel", this.options.cache.ttl?.channels)
    this.messageCache = new EntityCache(this.cache, "message", this.options.cache.ttl?.messages)

    this.logger.debug("AstriumClient initialized with options:", {
      intents: this.options.intents,
      apiVersion: this.options.apiVersion,
      sharding: this.options.sharding,
    })
  }

  private getLogLevel(level: string): LogLevel {
    switch (level) {
      case "debug":
        return LogLevel.DEBUG
      case "info":
        return LogLevel.INFO
      case "warn":
        return LogLevel.WARN
      case "error":
        return LogLevel.ERROR
      default:
        return LogLevel.INFO
    }
  }

  /**
   * Calculate intent bits from intent names
   */
  private calculateIntents(intents: GatewayIntents[]): number {
    return intents.reduce((bits, intent) => {
      const bit = GatewayIntentBits[intent]
      if (bit === undefined) {
        this.logger.warn(`Unknown intent: ${intent}`)
        return bits
      }
      return bits | bit
    }, 0)
  }

  private setupCaching(): void {
    // Setup Redis cache if provided
    if (this.options.cache?.redis) {
      const redisProvider = new RedisCacheProvider(this.options.cache.redis, this.options.cache.options)
      this.cache.addProvider("redis", redisProvider)
      this.logger.debug("Redis cache provider configured")
    }

    // Setup memory cache with options
    if (this.options.cache?.options) {
      const memoryProvider = new MemoryCacheProvider(this.options.cache.options)
      this.cache.addProvider("memory", memoryProvider)
      this.logger.debug("Memory cache provider configured")
    }
  }

  /**
   * Connect to Discord
   */
  async login(token?: string): Promise<string> {
    if (token) {
      this.token = token
    }

    if (!this.token) {
      throw new AstriumError("No token provided")
    }

    this.logger.info("Connecting to Discord...")

    try {
      // Load plugins from configuration
      if (this.options.plugins.length > 0) {
        await this.plugins.loadFromConfig(this.options.plugins)
      }

      try {
        const gatewayInfo = await this.rest.get("/gateway/bot")
        this.logger.debug("Gateway info retrieved:", gatewayInfo)
      } catch (error) {
        this.logger.error("Failed to retrieve gateway info:", error)
        throw new AstriumError("Invalid token or API connection failed")
      }

      this.wsManager = new WebSocketManager(this, 0, 1)

      this.wsManager.on("ready", (data) => {
        this._ready = true
        this.readyAt = new Date()
        this.user = data.user
        this.userCache.set({ id: data.user.id, ...data.user })
        this.logger.info(`Successfully connected as ${data.user.username}#${data.user.discriminator}`)
        this.events.emitEvent("ready")
        this.plugins.executeHooks("client.ready")
      })

      this.wsManager.on("resumed", () => {
        this.events.emitEvent("resumed")
        this.plugins.executeHooks("client.resumed")
      })

      this.wsManager.on("disconnect", (code, reason) => {
        this.events.emitEvent("disconnect", code, reason)
        this.plugins.executeHooks("client.disconnect", code, reason)
      })

      this.wsManager.on("reconnecting", () => {
        this.events.emitEvent("reconnecting")
        this.plugins.executeHooks("client.reconnecting")
      })

      this.wsManager.on("error", (error) => {
        this.events.emitEvent("error", error)
        this.plugins.executeHooks("client.error", error)
      })

      this.wsManager.on("debug", (message) => {
        this.events.emitEvent("debug", message)
      })

      // Connect to Gateway
      await this.wsManager.connect()

      return this.token
    } catch (error) {
      this.logger.error("Failed to connect to Discord:", error)
      throw error
    }
  }

  /**
   * Disconnect from Discord
   */
  async destroy(): Promise<void> {
    this.logger.info("Disconnecting from Discord...")

    // Execute plugin hooks
    await this.plugins.executeHooks("client.destroy")

    // Unload all plugins
    await this.plugins.unloadAll()

    await this.cache.clear("default")
    if (this.options.cache?.redis) {
      await this.cache.clear("redis")
    }

    if (this.wsManager) {
      await this.wsManager.disconnect()
      this.wsManager = null
    }

    this.events.removeAllListeners()

    this._ready = false
    this.readyAt = null
    this.user = null

    this.logger.info("Disconnected from Discord")
  }

  /**
   * Check if client is ready
   */
  get isReady(): boolean {
    return this._ready
  }

  /**
   * Get uptime in milliseconds
   */
  get uptime(): number | null {
    return this.readyAt ? Date.now() - this.readyAt.getTime() : null
  }

  /**
   * Get WebSocket ping
   */
  get ping(): number {
    return this.wsManager?.ping ?? -1
  }

  public on<K extends keyof ClientEvents>(
    event: K,
    listener: (...args: ClientEvents[K]) => void | Promise<void>,
    options?: {
      priority?: number
      filter?: (...args: ClientEvents[K]) => boolean
    },
  ): this {
    this.events.on(event, listener, options)
    return this
  }

  public once<K extends keyof ClientEvents>(
    event: K,
    listener: (...args: ClientEvents[K]) => void | Promise<void>,
    options?: {
      priority?: number
      filter?: (...args: ClientEvents[K]) => boolean
    },
  ): this {
    this.events.once(event, listener, options)
    return this
  }

  public emit<K extends keyof ClientEvents>(event: K, ...args: ClientEvents[K]): boolean {
    this.events.emitEvent(event, ...args)
    return super.emit(event, ...args)
  }

  /**
   * Remove event listener by ID
   */
  public removeListener(id: string): boolean {
    return this.events.removeListener(id)
  }

  /**
   * Get event statistics
   */
  public getEventStats(event?: string) {
    return this.events.getEventStats(event)
  }

  /**
   * Convenience method for connecting (alias for login)
   */
  async connect(token?: string): Promise<string> {
    return this.login(token)
  }
}
