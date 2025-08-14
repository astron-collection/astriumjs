/**
 * Built-in plugins for Astrium.js
 */

import { BasePlugin } from "./BasePlugin"

/**
 * Auto-reconnect plugin
 */
export class AutoReconnectPlugin extends BasePlugin {
  readonly name = "auto-reconnect"
  readonly version = "1.0.0"
  readonly description = "Automatically reconnects to Discord when connection is lost"
  readonly author = "Astrium Team"

  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 5000

  protected async onInit(options?: Record<string, any>): Promise<void> {
    this.maxReconnectAttempts = options?.maxAttempts || 5
    this.reconnectDelay = options?.delay || 5000

    this.log("info", `Auto-reconnect enabled (max attempts: ${this.maxReconnectAttempts})`)
  }

  protected registerHooks(): void {
    this.registerHook("client.disconnect", this.handleDisconnect.bind(this), 100)
    this.registerHook("client.ready", this.handleReady.bind(this), 100)
  }

  private async handleDisconnect(code: number, reason: string): Promise<void> {
    this.log("warn", `Disconnected: ${code} - ${reason}`)

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      this.log("info", `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(async () => {
        try {
          await this.client.login()
        } catch (error) {
          this.log("error", "Reconnection failed:", error)
        }
      }, this.reconnectDelay)
    } else {
      this.log("error", "Max reconnection attempts reached")
    }
  }

  private async handleReady(): Promise<void> {
    this.reconnectAttempts = 0
    this.log("info", "Successfully reconnected")
  }
}

/**
 * Command cooldown plugin
 */
export class CommandCooldownPlugin extends BasePlugin {
  readonly name = "command-cooldown"
  readonly version = "1.0.0"
  readonly description = "Adds global command cooldown functionality"
  readonly author = "Astrium Team"

  private cooldowns = new Map<string, Map<string, number>>()
  private globalCooldown = 1000 // 1 second default

  protected async onInit(options?: Record<string, any>): Promise<void> {
    this.globalCooldown = options?.globalCooldown || 1000
    this.log("info", `Command cooldown enabled (global: ${this.globalCooldown}ms)`)
  }

  protected registerHooks(): void {
    this.registerHook("command.before", this.handleCommandBefore.bind(this), 1000)
    this.registerHook("command.after", this.handleCommandAfter.bind(this), -1000)
  }

  private async handleCommandBefore(commandName: string, userId: string): Promise<boolean> {
    const userCooldowns = this.cooldowns.get(userId) || new Map()
    const lastUsed = userCooldowns.get(commandName) || 0
    const now = Date.now()

    if (now - lastUsed < this.globalCooldown) {
      this.log("debug", `Command ${commandName} on cooldown for user ${userId}`)
      return false // Prevent command execution
    }

    return true // Allow command execution
  }

  private async handleCommandAfter(commandName: string, userId: string): Promise<void> {
    let userCooldowns = this.cooldowns.get(userId)
    if (!userCooldowns) {
      userCooldowns = new Map()
      this.cooldowns.set(userId, userCooldowns)
    }

    userCooldowns.set(commandName, Date.now())
  }
}

/**
 * Message logger plugin
 */
export class MessageLoggerPlugin extends BasePlugin {
  readonly name = "message-logger"
  readonly version = "1.0.0"
  readonly description = "Logs all messages to console"
  readonly author = "Astrium Team"

  private logBots = false
  private logDMs = true

  protected async onInit(options?: Record<string, any>): Promise<void> {
    this.logBots = options?.logBots || false
    this.logDMs = options?.logDMs || true

    this.log("info", "Message logging enabled")
  }

  protected registerHooks(): void {
    this.registerHook("message.create", this.handleMessage.bind(this), 0)
  }

  private async handleMessage(message: any): Promise<void> {
    // Skip bot messages if configured
    if (!this.logBots && message.author?.bot) {
      return
    }

    // Skip DMs if configured
    if (!this.logDMs && !message.guild_id) {
      return
    }

    const guildInfo = message.guild_id ? `[Guild: ${message.guild_id}]` : "[DM]"
    const channelInfo = `[Channel: ${message.channel_id}]`
    const userInfo = `${message.author?.username}#${message.author?.discriminator}`

    this.log("info", `${guildInfo} ${channelInfo} ${userInfo}: ${message.content}`)
  }
}
