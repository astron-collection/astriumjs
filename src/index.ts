/**
 * Astrium.js - A modern, high-performance Discord library
 *
 * @author Astrium Team
 * @license MIT
 */

// Core exports
export { AstriumClient } from "./client/AstriumClient.js"
export { AstriumError, AstriumAPIError } from "./errors/AstriumError.js"
export { Logger, LogLevel } from "./utils/Logger.js"

// Cache exports
export { CacheManager, MemoryCacheProvider, RedisCacheProvider } from "./cache/CacheManager.js"
export { EntityCache } from "./cache/EntityCache.js"
export type { CacheProvider, CacheOptions as CacheProviderOptions } from "./cache/CacheManager.js"
export type { CacheableEntity } from "./cache/EntityCache.js"

// Command exports
export { CommandManager } from "./commands/CommandManager.js"
export { SlashCommandBuilder, PrefixCommandBuilder } from "./commands/CommandBuilder.js"

// Event exports
export { EventManager } from "./events/EventManager.js"
export { EventFilter } from "./events/EventFilters.js"
export type { EventMiddleware } from "./events/EventMiddleware.js"

// Plugin exports
export { PluginManager } from "./plugins/PluginManager.js"
export { BasePlugin } from "./plugins/BasePlugin.js"

// REST exports
export { RESTManager } from "./rest/RESTManager.js"
export { APIRoutes } from "./rest/APIRoutes.js"

// WebSocket exports
export { WebSocketManager } from "./gateway/WebSocketManager.js"

// Type exports
export type {
  AstriumClientOptions,
  ClientEvents,
  GatewayIntents,
  CacheOptions,
  ShardingOptions,
  CommandOptions,
  LoggingOptions,
  RESTOptions,
  WebSocketOptions,
} from "./types/ClientTypes.js"

export type {
  Command,
  SlashCommand,
  PrefixCommand,
  CommandContext,
  SlashCommandContext,
  PrefixCommandContext,
} from "./types/CommandTypes.js"

export type {
  Plugin,
  PluginOptions,
  PluginHook,
  PluginMetadata,
} from "./types/PluginTypes.js"

export type {
  GatewayPayload,
  GatewayOpcodes,
  GatewayCloseEventCodes,
} from "./types/GatewayTypes.js"

export type {
  APIResponse,
  APIError,
  RateLimitData,
  RequestOptions,
} from "./rest/APITypes.js"

// Constants
export { GatewayIntentBits } from "./constants/GatewayIntents.js"
export { APIVersion, BASE_URL } from "./constants/API.js"
export { GatewayOpcodes, GatewayCloseEventCodes } from "./constants/Gateway.js"

// Utility exports
export { sleep, formatDuration, parseSnowflake } from "./utils/Helpers.js"
