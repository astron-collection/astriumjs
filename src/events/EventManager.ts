/**
 * Event management system for Astrium.js
 */

import { EventEmitter } from "events"
import type { AstriumClient } from "../client/AstriumClient"
import { AstriumError } from "../errors/AstriumError"

export interface EventListener {
  id: string
  event: string
  handler: (...args: any[]) => void | Promise<void>
  priority: number
  once: boolean
  filter?: (...args: any[]) => boolean
  middleware?: EventMiddleware[]
}

export interface EventMiddleware {
  name: string
  handler: (event: string, data: any, next: () => void) => void | Promise<void>
  priority: number
}

export interface EventContext {
  event: string
  data: any
  client: AstriumClient
  timestamp: Date
  preventDefault: () => void
  stopPropagation: () => void
}

export class EventManager extends EventEmitter {
  private listeners = new Map<string, EventListener[]>()
  private middleware: EventMiddleware[] = []
  private eventStats = new Map<string, { count: number; lastTriggered: Date }>()

  constructor(private client: AstriumClient) {
    super()
    this.setupDefaultMiddleware()
  }

  /**
   * Add an event listener
   */
  addListener(
    event: string,
    handler: (...args: any[]) => void | Promise<void>,
    options: {
      priority?: number
      once?: boolean
      filter?: (...args: any[]) => boolean
      middleware?: EventMiddleware[]
    } = {},
  ): string {
    const id = this.generateListenerId()
    const listener: EventListener = {
      id,
      event,
      handler,
      priority: options.priority ?? 0,
      once: options.once ?? false,
      filter: options.filter,
      middleware: options.middleware ?? [],
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }

    const eventListeners = this.listeners.get(event)!
    eventListeners.push(listener)

    // Sort by priority (higher priority first)
    eventListeners.sort((a, b) => b.priority - a.priority)

    this.client.logger.debug(`Added event listener for '${event}' with priority ${listener.priority}`)
    return id
  }

  /**
   * Remove an event listener by ID
   */
  removeListener(id: string): boolean {
    for (const [event, listeners] of this.listeners.entries()) {
      const index = listeners.findIndex((listener) => listener.id === id)
      if (index !== -1) {
        listeners.splice(index, 1)
        if (listeners.length === 0) {
          this.listeners.delete(event)
        }
        this.client.logger.debug(`Removed event listener ${id}`)
        return true
      }
    }
    return false
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event)
      this.client.logger.debug(`Removed all listeners for '${event}'`)
    } else {
      this.listeners.clear()
      this.client.logger.debug("Removed all event listeners")
    }
  }

  /**
   * Add global middleware
   */
  addMiddleware(middleware: EventMiddleware): void {
    this.middleware.push(middleware)
    this.middleware.sort((a, b) => b.priority - a.priority)
    this.client.logger.debug(`Added middleware '${middleware.name}' with priority ${middleware.priority}`)
  }

  /**
   * Remove middleware by name
   */
  removeMiddleware(name: string): boolean {
    const index = this.middleware.findIndex((m) => m.name === name)
    if (index !== -1) {
      this.middleware.splice(index, 1)
      this.client.logger.debug(`Removed middleware '${name}'`)
      return true
    }
    return false
  }

  /**
   * Emit an event through the event system
   */
  async emitEvent(event: string, ...args: any[]): Promise<void> {
    // Update event statistics
    this.updateEventStats(event)

    const context: EventContext = {
      event,
      data: args,
      client: this.client,
      timestamp: new Date(),
      preventDefault: () => {
        context.data.__prevented = true
      },
      stopPropagation: () => {
        context.data.__stopped = true
      },
    }

    try {
      // Run global middleware
      await this.runMiddleware(context)

      if (context.data.__prevented) {
        this.client.logger.debug(`Event '${event}' was prevented by middleware`)
        return
      }

      // Get listeners for this event
      const listeners = this.listeners.get(event) || []
      const onceListeners: string[] = []

      for (const listener of listeners) {
        if (context.data.__stopped) {
          this.client.logger.debug(`Event '${event}' propagation stopped`)
          break
        }

        try {
          // Apply filter if present
          if (listener.filter && !listener.filter(...args)) {
            continue
          }

          // Run listener-specific middleware
          if (listener.middleware && listener.middleware.length > 0) {
            await this.runListenerMiddleware(context, listener.middleware)
            if (context.data.__prevented) continue
          }

          // Execute the handler
          await this.executeHandler(listener, context, args)

          // Mark for removal if it's a once listener
          if (listener.once) {
            onceListeners.push(listener.id)
          }
        } catch (error) {
          this.client.logger.error(`Error in event handler for '${event}':`, error)
          this.emit("handlerError", error, listener, context)
        }
      }

      // Remove once listeners
      for (const id of onceListeners) {
        this.removeListener(id)
      }

      // Emit to the main client EventEmitter as well
      this.client.emit(event as any, ...args)
    } catch (error) {
      this.client.logger.error(`Error processing event '${event}':`, error)
      this.emit("error", error)
    }
  }

  /**
   * Run global middleware
   */
  private async runMiddleware(context: EventContext): Promise<void> {
    for (const middleware of this.middleware) {
      if (context.data.__prevented) break

      await new Promise<void>((resolve, reject) => {
        try {
          const result = middleware.handler(context.event, context.data, resolve)
          if (result instanceof Promise) {
            result.then(() => resolve()).catch(reject)
          }
        } catch (error) {
          reject(error)
        }
      })
    }
  }

  /**
   * Run listener-specific middleware
   */
  private async runListenerMiddleware(context: EventContext, middleware: EventMiddleware[]): Promise<void> {
    const sortedMiddleware = [...middleware].sort((a, b) => b.priority - a.priority)

    for (const mw of sortedMiddleware) {
      if (context.data.__prevented) break

      await new Promise<void>((resolve, reject) => {
        try {
          const result = mw.handler(context.event, context.data, resolve)
          if (result instanceof Promise) {
            result.then(() => resolve()).catch(reject)
          }
        } catch (error) {
          reject(error)
        }
      })
    }
  }

  /**
   * Execute event handler safely
   */
  private async executeHandler(listener: EventListener, context: EventContext, args: any[]): Promise<void> {
    const startTime = Date.now()

    try {
      const result = listener.handler(...args)
      if (result instanceof Promise) {
        await result
      }

      const duration = Date.now() - startTime
      if (duration > 1000) {
        this.client.logger.warn(`Slow event handler for '${listener.event}' took ${duration}ms`)
      }
    } catch (error) {
      throw new AstriumError(`Handler error in '${listener.event}': ${error}`)
    }
  }

  /**
   * Update event statistics
   */
  private updateEventStats(event: string): void {
    const stats = this.eventStats.get(event) || { count: 0, lastTriggered: new Date() }
    stats.count++
    stats.lastTriggered = new Date()
    this.eventStats.set(event, stats)
  }

  /**
   * Get event statistics
   */
  getEventStats(
    event?: string,
  ): Map<string, { count: number; lastTriggered: Date }> | { count: number; lastTriggered: Date } | undefined {
    if (event) {
      return this.eventStats.get(event)
    }
    return new Map(this.eventStats)
  }

  /**
   * Get all listeners for an event
   */
  getListeners(event: string): EventListener[] {
    return [...(this.listeners.get(event) || [])]
  }

  /**
   * Get listener count for an event
   */
  getListenerCount(event: string): number {
    return this.listeners.get(event)?.length || 0
  }

  /**
   * Generate unique listener ID
   */
  private generateListenerId(): string {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Setup default middleware
   */
  private setupDefaultMiddleware(): void {
    // Rate limiting middleware
    this.addMiddleware({
      name: "rateLimiter",
      priority: 1000,
      handler: async (event, data, next) => {
        // Simple rate limiting logic could go here
        next()
      },
    })

    // Logging middleware
    this.addMiddleware({
      name: "logger",
      priority: -1000,
      handler: async (event, data, next) => {
        this.client.logger.debug(`Event '${event}' triggered`)
        next()
      },
    })
  }

  /**
   * Create a typed event listener helper
   */
  on<T extends keyof ClientEvents>(
    event: T,
    handler: (...args: ClientEvents[T]) => void | Promise<void>,
    options?: {
      priority?: number
      filter?: (...args: ClientEvents[T]) => boolean
      middleware?: EventMiddleware[]
    },
  ): string {
    return this.addListener(event, handler, options)
  }

  /**
   * Create a one-time event listener
   */
  once<T extends keyof ClientEvents>(
    event: T,
    handler: (...args: ClientEvents[T]) => void | Promise<void>,
    options?: {
      priority?: number
      filter?: (...args: ClientEvents[T]) => boolean
      middleware?: EventMiddleware[]
    },
  ): string {
    return this.addListener(event, handler, { ...options, once: true })
  }
}

// Import ClientEvents type
import type { ClientEvents } from "../types/ClientTypes"
