/**
 * Base plugin class for easier plugin development
 */

import type { Plugin } from "../types/PluginTypes"

export abstract class BasePlugin implements Plugin {
  abstract readonly name: string
  abstract readonly version: string
  abstract readonly description?: string
  abstract readonly author?: string
  readonly dependencies?: string[] = []

  protected client: any
  protected logger: any
  protected context: any

  /**
   * Initialize the plugin
   */
  async init(context: any, options?: Record<string, any>): Promise<void> {
    this.context = context
    this.client = context.client
    this.logger = context.logger

    this.logger.debug(`Initializing plugin: ${this.name}`)

    // Call the plugin-specific initialization
    await this.onInit(options)

    // Register default hooks
    this.registerHooks()

    this.logger.debug(`Plugin ${this.name} initialized successfully`)
  }

  /**
   * Cleanup when plugin is unloaded
   */
  async destroy(): Promise<void> {
    this.logger.debug(`Destroying plugin: ${this.name}`)

    // Call plugin-specific cleanup
    await this.onDestroy()

    this.logger.debug(`Plugin ${this.name} destroyed successfully`)
  }

  /**
   * Plugin-specific initialization (override in subclass)
   */
  protected async onInit(options?: Record<string, any>): Promise<void> {
    // Override in subclass
  }

  /**
   * Plugin-specific cleanup (override in subclass)
   */
  protected async onDestroy(): Promise<void> {
    // Override in subclass
  }

  /**
   * Register plugin hooks (override in subclass)
   */
  protected registerHooks(): void {
    // Override in subclass
  }

  /**
   * Register a hook
   */
  protected registerHook(hookName: string, handler: (...args: any[]) => any, priority = 0): void {
    if (this.context) {
      this.context.registerHook(hookName, handler, priority)
    }
  }

  /**
   * Unregister a hook
   */
  protected unregisterHook(hookName: string): void {
    if (this.context) {
      this.context.unregisterHook(hookName)
    }
  }

  /**
   * Execute hooks
   */
  protected async executeHooks(hookName: string, ...args: any[]): Promise<any[]> {
    if (this.context) {
      return this.context.executeHooks(hookName, ...args)
    }
    return []
  }

  /**
   * Get another plugin
   */
  protected getPlugin(name: string): Plugin | undefined {
    if (this.context) {
      return this.context.getPlugin(name)
    }
    return undefined
  }

  /**
   * Log a message
   */
  protected log(level: "debug" | "info" | "warn" | "error", message: string, ...args: any[]): void {
    if (this.logger) {
      this.logger[level](`[${this.name}] ${message}`, ...args)
    }
  }
}
