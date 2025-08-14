/**
 * Core client type definitions
 */

export interface AstriumClientOptions {
  /** Discord bot token */
  token: string

  /** Gateway intents for receiving events */
  intents: GatewayIntents[]

  /** API version to use (default: 10) */
  apiVersion?: number

  /** Sharding configuration */
  sharding?: ShardingOptions

  /** Caching configuration */
  cache?: CacheOptions

  /** Logging configuration */
  logging?: LoggingOptions

  /** Plugin configuration */
  plugins?: PluginOptions[]

  /** REST API configuration */
  rest?: RESTOptions

  /** WebSocket configuration */
  ws?: WebSocketOptions

  /** Command configuration */
  commands?: CommandOptions
}

export interface ShardingOptions {
  /** Total number of shards */
  totalShards?: number | "auto"

  /** Shard IDs this process should handle */
  shardList?: number[]

  /** Sharding mode */
  mode?: "process" | "worker"
}

export interface CacheOptions {
  /** Cache provider type */
  provider?: "memory" | "redis"

  /** Redis client instance (if using Redis) */
  redis?: any

  /** Cache provider options */
  options?: {
    ttl?: number
    maxSize?: number
    strategy?: "lru" | "fifo"
  }

  /** Cache TTL in seconds for different entity types */
  ttl?: {
    guilds?: number
    users?: number
    channels?: number
    messages?: number
  }

  /** Maximum cache sizes for different entity types */
  limits?: {
    guilds?: number
    users?: number
    channels?: number
    messages?: number
  }
}

export interface CommandOptions {
  /** Prefix for text commands */
  prefix?: string

  /** Whether to register slash commands automatically */
  registerSlashCommands?: boolean

  /** Guild ID for development slash commands */
  devGuildId?: string
}

export interface LoggingOptions {
  /** Log level */
  level: "debug" | "info" | "warn" | "error"

  /** Custom logger instance */
  logger?: any

  /** Log to file */
  file?: string
}

export interface RESTOptions {
  /** Request timeout in milliseconds */
  timeout?: number

  /** Rate limit handling */
  rateLimitRetryLimit?: number

  /** Global request delay */
  globalRequestsPerSecond?: number
}

export interface WebSocketOptions {
  /** Connection timeout */
  connectionTimeout?: number

  /** Reconnection attempts */
  maxReconnectAttempts?: number

  /** Reconnection delay */
  reconnectDelay?: number
}

export interface PluginOptions {
  /** Plugin name or constructor */
  plugin: string | Plugin

  /** Plugin configuration */
  options?: Record<string, any>
}

export type GatewayIntents =
  | "GUILDS"
  | "GUILD_MEMBERS"
  | "GUILD_MODERATION"
  | "GUILD_EMOJIS_AND_STICKERS"
  | "GUILD_INTEGRATIONS"
  | "GUILD_WEBHOOKS"
  | "GUILD_INVITES"
  | "GUILD_VOICE_STATES"
  | "GUILD_PRESENCES"
  | "GUILD_MESSAGES"
  | "GUILD_MESSAGE_REACTIONS"
  | "GUILD_MESSAGE_TYPING"
  | "DIRECT_MESSAGES"
  | "DIRECT_MESSAGE_REACTIONS"
  | "DIRECT_MESSAGE_TYPING"
  | "MESSAGE_CONTENT"
  | "GUILD_SCHEDULED_EVENTS"
  | "AUTO_MODERATION_CONFIGURATION"
  | "AUTO_MODERATION_EXECUTION"

export interface ClientEvents {
  ready: []
  error: [Error]
  warn: [string]
  debug: [string]
  disconnect: [number, string]
  reconnecting: []
  resumed: []

  // Guild events
  guildCreate: [any] // Will be properly typed later
  guildUpdate: [any, any]
  guildDelete: [any]

  // Message events
  messageCreate: [any]
  messageUpdate: [any, any]
  messageDelete: [any]

  // Interaction events
  interactionCreate: [any]
}

// Import Plugin type from PluginTypes
import type { Plugin } from "./PluginTypes"
