/**
 * Common event middleware for Astrium.js
 */

import type { EventMiddleware } from "./EventManager"

export class CommonMiddleware {
  /**
   * Rate limiting middleware
   */
  static rateLimiter(maxEvents: number, windowMs: number): EventMiddleware {
    const eventCounts = new Map<string, { count: number; resetTime: number }>()

    return {
      name: "rateLimiter",
      priority: 900,
      handler: (event, data, next) => {
        const now = Date.now()
        const key = `${event}:${data?.author?.id || data?.user?.id || "unknown"}`

        let eventData = eventCounts.get(key)
        if (!eventData || now > eventData.resetTime) {
          eventData = { count: 0, resetTime: now + windowMs }
          eventCounts.set(key, eventData)
        }

        if (eventData.count >= maxEvents) {
          data.__prevented = true
          return
        }

        eventData.count++
        next()
      },
    }
  }

  /**
   * Validation middleware
   */
  static validator(schema: (data: any) => boolean): EventMiddleware {
    return {
      name: "validator",
      priority: 800,
      handler: (event, data, next) => {
        if (!schema(data)) {
          data.__prevented = true
          return
        }
        next()
      },
    }
  }

  /**
   * Transform data middleware
   */
  static transformer(transform: (data: any) => any): EventMiddleware {
    return {
      name: "transformer",
      priority: 700,
      handler: (event, data, next) => {
        const transformed = transform(data)
        Object.assign(data, transformed)
        next()
      },
    }
  }

  /**
   * Caching middleware
   */
  static cache(ttl = 60000): EventMiddleware {
    const cache = new Map<string, { data: any; expires: number }>()

    return {
      name: "cache",
      priority: 600,
      handler: (event, data, next) => {
        const key = `${event}:${JSON.stringify(data)}`
        const cached = cache.get(key)

        if (cached && Date.now() < cached.expires) {
          Object.assign(data, cached.data)
          data.__cached = true
        } else {
          cache.set(key, { data: { ...data }, expires: Date.now() + ttl })
        }

        next()
      },
    }
  }

  /**
   * Metrics collection middleware
   */
  static metrics(): EventMiddleware {
    const metrics = new Map<string, { count: number; totalTime: number; avgTime: number }>()

    return {
      name: "metrics",
      priority: -900,
      handler: (event, data, next) => {
        const startTime = Date.now()

        const originalNext = next
        next = () => {
          const duration = Date.now() - startTime
          const metric = metrics.get(event) || { count: 0, totalTime: 0, avgTime: 0 }

          metric.count++
          metric.totalTime += duration
          metric.avgTime = metric.totalTime / metric.count

          metrics.set(event, metric)
          originalNext()
        }

        next()
      },
    }
  }

  /**
   * Error handling middleware
   */
  static errorHandler(onError: (error: Error, event: string, data: any) => void): EventMiddleware {
    return {
      name: "errorHandler",
      priority: -1000,
      handler: (event, data, next) => {
        try {
          next()
        } catch (error) {
          onError(error as Error, event, data)
        }
      },
    }
  }
}
