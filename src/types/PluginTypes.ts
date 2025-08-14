/**
 * Plugin system type definitions
 */

export interface Plugin {
  /** Plugin name */
  name: string

  /** Plugin version */
  version: string

  /** Plugin description */
  description?: string

  /** Plugin author */
  author?: string

  /** Plugin dependencies */
  dependencies?: string[]

  /** Initialize the plugin */
  init(client: any, options?: Record<string, any>): Promise<void> | void

  /** Cleanup when plugin is unloaded */
  destroy?(): Promise<void> | void
}

export interface PluginManager {
  /** Load a plugin */
  load(plugin: Plugin | string, options?: Record<string, any>): Promise<void>

  /** Unload a plugin */
  unload(name: string): Promise<void>

  /** Get loaded plugin */
  get(name: string): Plugin | undefined

  /** Get all loaded plugins */
  getAll(): Plugin[]

  /** Check if plugin is loaded */
  has(name: string): boolean
}
