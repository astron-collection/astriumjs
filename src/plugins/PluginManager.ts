/**
 * Plugin management system for Astrium.js
 */

import { EventEmitter } from "events"
import type { AstriumClient } from "../client/AstriumClient"
import type { Plugin, PluginOptions } from "../types/PluginTypes"
import { AstriumError } from "../errors/AstriumError"

export interface LoadedPlugin {
  plugin: Plugin
  options: Record<string, any>
  loadedAt: Date
  status: "loading" | "loaded" | "error" | "unloading"
  error?: Error
}

export interface PluginHook {
  name: string
  handler: (...args: any[]) => any
  priority: number
  plugin: string
}

export interface PluginManagerEvents {
  pluginLoaded: [Plugin]
  pluginUnloaded: [string]
  pluginError: [Plugin, Error]
  hookRegistered: [string, PluginHook]
  hookUnregistered: [string, string]
}

export class PluginManager extends EventEmitter {
  private plugins = new Map<string, LoadedPlugin>()
  private hooks = new Map<string, PluginHook[]>()
  private pluginPaths = new Set<string>()

  constructor(private client: AstriumClient) {
    super()
  }

  /**
   * Load a plugin
   */
  async load(plugin: Plugin | string, options: Record<string, any> = {}): Promise<void> {
    let pluginInstance: Plugin

    if (typeof plugin === "string") {
      // Load plugin from path or name
      pluginInstance = await this.loadPluginFromPath(plugin)
    } else {
      pluginInstance = plugin
    }

    // Check if plugin is already loaded
    if (this.plugins.has(pluginInstance.name)) {
      throw new AstriumError(`Plugin '${pluginInstance.name}' is already loaded`)
    }

    // Validate plugin
    this.validatePlugin(pluginInstance)

    // Check dependencies
    await this.checkDependencies(pluginInstance)

    const loadedPlugin: LoadedPlugin = {
      plugin: pluginInstance,
      options,
      loadedAt: new Date(),
      status: "loading",
    }

    this.plugins.set(pluginInstance.name, loadedPlugin)

    try {
      // Initialize plugin
      await this.initializePlugin(pluginInstance, options)

      loadedPlugin.status = "loaded"
      this.client.logger.info(`Plugin '${pluginInstance.name}' loaded successfully`)
      this.emit("pluginLoaded", pluginInstance)
    } catch (error) {
      loadedPlugin.status = "error"
      loadedPlugin.error = error as Error
      this.client.logger.error(`Failed to load plugin '${pluginInstance.name}':`, error)
      this.emit("pluginError", pluginInstance, error as Error)
      throw error
    }
  }

  /**
   * Unload a plugin
   */
  async unload(name: string): Promise<void> {
    const loadedPlugin = this.plugins.get(name)
    if (!loadedPlugin) {
      throw new AstriumError(`Plugin '${name}' is not loaded`)
    }

    loadedPlugin.status = "unloading"

    try {
      // Call plugin destroy method if it exists
      if (loadedPlugin.plugin.destroy) {
        await loadedPlugin.plugin.destroy()
      }

      // Remove plugin hooks
      this.removePluginHooks(name)

      // Remove from loaded plugins
      this.plugins.delete(name)

      this.client.logger.info(`Plugin '${name}' unloaded successfully`)
      this.emit("pluginUnloaded", name)
    } catch (error) {
      loadedPlugin.status = "error"
      loadedPlugin.error = error as Error
      this.client.logger.error(`Failed to unload plugin '${name}':`, error)
      throw error
    }
  }

  /**
   * Get a loaded plugin
   */
  get(name: string): Plugin | undefined {
    return this.plugins.get(name)?.plugin
  }

  /**
   * Get all loaded plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values()).map((loaded) => loaded.plugin)
  }

  /**
   * Check if a plugin is loaded
   */
  has(name: string): boolean {
    return this.plugins.has(name)
  }

  /**
   * Get plugin status
   */
  getStatus(name: string): LoadedPlugin | undefined {
    return this.plugins.get(name)
  }

  /**
   * Get all plugin statuses
   */
  getAllStatuses(): Map<string, LoadedPlugin> {
    return new Map(this.plugins)
  }

  /**
   * Register a hook
   */
  registerHook(hookName: string, handler: (...args: any[]) => any, pluginName: string, priority = 0): void {
    const hook: PluginHook = {
      name: hookName,
      handler,
      priority,
      plugin: pluginName,
    }

    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, [])
    }

    const hooks = this.hooks.get(hookName)!
    hooks.push(hook)

    // Sort by priority (higher priority first)
    hooks.sort((a, b) => b.priority - a.priority)

    this.client.logger.debug(`Registered hook '${hookName}' for plugin '${pluginName}'`)
    this.emit("hookRegistered", hookName, hook)
  }

  /**
   * Unregister a hook
   */
  unregisterHook(hookName: string, pluginName: string): boolean {
    const hooks = this.hooks.get(hookName)
    if (!hooks) return false

    const index = hooks.findIndex((hook) => hook.plugin === pluginName)
    if (index === -1) return false

    hooks.splice(index, 1)

    if (hooks.length === 0) {
      this.hooks.delete(hookName)
    }

    this.client.logger.debug(`Unregistered hook '${hookName}' for plugin '${pluginName}'`)
    this.emit("hookUnregistered", hookName, pluginName)
    return true
  }

  /**
   * Execute hooks
   */
  async executeHooks(hookName: string, ...args: any[]): Promise<any[]> {
    const hooks = this.hooks.get(hookName)
    if (!hooks || hooks.length === 0) return []

    const results: any[] = []

    for (const hook of hooks) {
      try {
        const result = await hook.handler(...args)
        results.push(result)
      } catch (error) {
        this.client.logger.error(`Error executing hook '${hookName}' for plugin '${hook.plugin}':`, error)
        const plugin = this.plugins.get(hook.plugin)?.plugin
        if (plugin) {
          this.emit("pluginError", plugin, error as Error)
        }
      }
    }

    return results
  }

  /**
   * Execute hooks with filter
   */
  async executeHooksWithFilter(
    hookName: string,
    filter: (hook: PluginHook) => boolean,
    ...args: any[]
  ): Promise<any[]> {
    const hooks = this.hooks.get(hookName)
    if (!hooks || hooks.length === 0) return []

    const filteredHooks = hooks.filter(filter)
    const results: any[] = []

    for (const hook of filteredHooks) {
      try {
        const result = await hook.handler(...args)
        results.push(result)
      } catch (error) {
        this.client.logger.error(`Error executing hook '${hookName}' for plugin '${hook.plugin}':`, error)
        const plugin = this.plugins.get(hook.plugin)?.plugin
        if (plugin) {
          this.emit("pluginError", plugin, error as Error)
        }
      }
    }

    return results
  }

  /**
   * Get hooks for a specific hook name
   */
  getHooks(hookName: string): PluginHook[] {
    return [...(this.hooks.get(hookName) || [])]
  }

  /**
   * Get all hooks
   */
  getAllHooks(): Map<string, PluginHook[]> {
    return new Map(this.hooks)
  }

  /**
   * Load plugin from path
   */
  private async loadPluginFromPath(path: string): Promise<Plugin> {
    try {
      // In a real implementation, this would use dynamic imports
      // For now, we'll throw an error as this is a placeholder
      throw new AstriumError(`Dynamic plugin loading from path '${path}' is not yet implemented`)
    } catch (error) {
      throw new AstriumError(`Failed to load plugin from path '${path}': ${error}`)
    }
  }

  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: Plugin): void {
    if (!plugin.name || typeof plugin.name !== "string") {
      throw new AstriumError("Plugin must have a valid name")
    }

    if (!plugin.version || typeof plugin.version !== "string") {
      throw new AstriumError("Plugin must have a valid version")
    }

    if (!plugin.init || typeof plugin.init !== "function") {
      throw new AstriumError("Plugin must have an init function")
    }

    // Validate version format (basic semver check)
    if (!/^\d+\.\d+\.\d+/.test(plugin.version)) {
      throw new AstriumError("Plugin version must follow semantic versioning (x.y.z)")
    }
  }

  /**
   * Check plugin dependencies
   */
  private async checkDependencies(plugin: Plugin): Promise<void> {
    if (!plugin.dependencies || plugin.dependencies.length === 0) {
      return
    }

    for (const dependency of plugin.dependencies) {
      if (!this.plugins.has(dependency)) {
        throw new AstriumError(`Plugin '${plugin.name}' requires dependency '${dependency}' which is not loaded`)
      }

      const depPlugin = this.plugins.get(dependency)!
      if (depPlugin.status !== "loaded") {
        throw new AstriumError(`Plugin '${plugin.name}' requires dependency '${dependency}' which is not ready`)
      }
    }
  }

  /**
   * Initialize plugin
   */
  private async initializePlugin(plugin: Plugin, options: Record<string, any>): Promise<void> {
    // Create plugin context
    const context = this.createPluginContext(plugin)

    // Call plugin init
    await plugin.init(context, options)
  }

  /**
   * Create plugin context
   */
  private createPluginContext(plugin: Plugin): any {
    return {
      client: this.client,
      logger: this.client.logger,
      registerHook: (hookName: string, handler: (...args: any[]) => any, priority = 0) => {
        this.registerHook(hookName, handler, plugin.name, priority)
      },
      unregisterHook: (hookName: string) => {
        this.unregisterHook(hookName, plugin.name)
      },
      executeHooks: (hookName: string, ...args: any[]) => {
        return this.executeHooks(hookName, ...args)
      },
      getPlugin: (name: string) => {
        return this.get(name)
      },
      // Add more context methods as needed
    }
  }

  /**
   * Remove all hooks for a plugin
   */
  private removePluginHooks(pluginName: string): void {
    for (const [hookName, hooks] of this.hooks.entries()) {
      const filteredHooks = hooks.filter((hook) => hook.plugin !== pluginName)

      if (filteredHooks.length === 0) {
        this.hooks.delete(hookName)
      } else {
        this.hooks.set(hookName, filteredHooks)
      }
    }
  }

  /**
   * Load plugins from configuration
   */
  async loadFromConfig(pluginConfigs: PluginOptions[]): Promise<void> {
    for (const config of pluginConfigs) {
      try {
        await this.load(config.plugin, config.options)
      } catch (error) {
        this.client.logger.error(`Failed to load plugin from config:`, error)
      }
    }
  }

  /**
   * Unload all plugins
   */
  async unloadAll(): Promise<void> {
    const pluginNames = Array.from(this.plugins.keys())

    for (const name of pluginNames) {
      try {
        await this.unload(name)
      } catch (error) {
        this.client.logger.error(`Failed to unload plugin '${name}':`, error)
      }
    }
  }

  /**
   * Reload a plugin
   */
  async reload(name: string): Promise<void> {
    const loadedPlugin = this.plugins.get(name)
    if (!loadedPlugin) {
      throw new AstriumError(`Plugin '${name}' is not loaded`)
    }

    const plugin = loadedPlugin.plugin
    const options = loadedPlugin.options

    await this.unload(name)
    await this.load(plugin, options)
  }

  // Event emitter type safety
  public on<K extends keyof PluginManagerEvents>(event: K, listener: (...args: PluginManagerEvents[K]) => void): this {
    return super.on(event, listener)
  }

  public emit<K extends keyof PluginManagerEvents>(event: K, ...args: PluginManagerEvents[K]): boolean {
    return super.emit(event, ...args)
  }
}
