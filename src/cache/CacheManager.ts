import { Logger } from "../utils/Logger.js"
import { AstriumError } from "../errors/AstriumError.js"

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of items
  strategy?: "lru" | "fifo" // Eviction strategy
}

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<boolean>
  clear(): Promise<void>
  has(key: string): Promise<boolean>
  size(): Promise<number>
}

export class MemoryCacheProvider implements CacheProvider {
  private cache = new Map<string, { value: any; expires: number }>()
  private accessOrder = new Map<string, number>() // For LRU
  private insertOrder: string[] = [] // For FIFO
  private accessCounter = 0

  constructor(private options: CacheOptions = {}) {
    this.options = {
      ttl: 300000, // 5 minutes default
      maxSize: 1000,
      strategy: "lru",
      ...options,
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)

    if (!item) return null

    if (Date.now() > item.expires) {
      this.cache.delete(key)
      this.accessOrder.delete(key)
      this.removeFromInsertOrder(key)
      return null
    }

    // Update access order for LRU
    if (this.options.strategy === "lru") {
      this.accessOrder.set(key, ++this.accessCounter)
    }

    return item.value as T
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expires = Date.now() + (ttl || this.options.ttl || 300000)

    // Check if we need to evict items
    if (this.cache.size >= (this.options.maxSize || 1000) && !this.cache.has(key)) {
      this.evictOldest()
    }

    this.cache.set(key, { value, expires })

    if (this.options.strategy === "lru") {
      this.accessOrder.set(key, ++this.accessCounter)
    } else {
      if (!this.insertOrder.includes(key)) {
        this.insertOrder.push(key)
      }
    }
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key)
    this.accessOrder.delete(key)
    this.removeFromInsertOrder(key)
    return deleted
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.accessOrder.clear()
    this.insertOrder = []
    this.accessCounter = 0
  }

  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key)
    if (!item) return false

    if (Date.now() > item.expires) {
      await this.delete(key)
      return false
    }

    return true
  }

  async size(): Promise<number> {
    // Clean expired items first
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        await this.delete(key)
      }
    }
    return this.cache.size
  }

  private evictOldest(): void {
    if (this.options.strategy === "lru") {
      let oldestKey = ""
      let oldestAccess = Number.POSITIVE_INFINITY

      for (const [key, access] of this.accessOrder.entries()) {
        if (access < oldestAccess) {
          oldestAccess = access
          oldestKey = key
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey)
        this.accessOrder.delete(oldestKey)
      }
    } else {
      // FIFO
      const oldestKey = this.insertOrder.shift()
      if (oldestKey) {
        this.cache.delete(oldestKey)
        this.accessOrder.delete(oldestKey)
      }
    }
  }

  private removeFromInsertOrder(key: string): void {
    const index = this.insertOrder.indexOf(key)
    if (index > -1) {
      this.insertOrder.splice(index, 1)
    }
  }
}

export class RedisCacheProvider implements CacheProvider {
  private redis: any // Redis client
  private logger = new Logger("RedisCacheProvider")

  constructor(
    private redisClient: any,
    private options: CacheOptions = {},
  ) {
    this.redis = redisClient
    this.options = {
      ttl: 300000, // 5 minutes default
      ...options,
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      this.logger.error("Failed to get from Redis cache:", error)
      return null
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      const expiry = Math.floor((ttl || this.options.ttl || 300000) / 1000)
      await this.redis.setex(key, expiry, serialized)
    } catch (error) {
      this.logger.error("Failed to set Redis cache:", error)
      throw new AstriumError("Cache set failed", "CACHE_ERROR")
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key)
      return result > 0
    } catch (error) {
      this.logger.error("Failed to delete from Redis cache:", error)
      return false
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redis.flushdb()
    } catch (error) {
      this.logger.error("Failed to clear Redis cache:", error)
      throw new AstriumError("Cache clear failed", "CACHE_ERROR")
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(key)
      return exists > 0
    } catch (error) {
      this.logger.error("Failed to check Redis cache:", error)
      return false
    }
  }

  async size(): Promise<number> {
    try {
      return await this.redis.dbsize()
    } catch (error) {
      this.logger.error("Failed to get Redis cache size:", error)
      return 0
    }
  }
}

export class CacheManager {
  private providers = new Map<string, CacheProvider>()
  private logger = new Logger("CacheManager")

  constructor() {
    // Set up default memory cache
    this.providers.set("default", new MemoryCacheProvider())
  }

  addProvider(name: string, provider: CacheProvider): void {
    this.providers.set(name, provider)
    this.logger.debug(`Added cache provider: ${name}`)
  }

  getProvider(name = "default"): CacheProvider {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new AstriumError(`Cache provider '${name}' not found`, "CACHE_ERROR")
    }
    return provider
  }

  // Convenience methods for default provider
  async get<T>(key: string, provider = "default"): Promise<T | null> {
    return this.getProvider(provider).get<T>(key)
  }

  async set<T>(key: string, value: T, ttl?: number, provider = "default"): Promise<void> {
    return this.getProvider(provider).set(key, value, ttl)
  }

  async delete(key: string, provider = "default"): Promise<boolean> {
    return this.getProvider(provider).delete(key)
  }

  async clear(provider = "default"): Promise<void> {
    return this.getProvider(provider).clear()
  }

  async has(key: string, provider = "default"): Promise<boolean> {
    return this.getProvider(provider).has(key)
  }

  // Cache with fallback function
  async getOrSet<T>(key: string, fallback: () => Promise<T>, ttl?: number, provider = "default"): Promise<T> {
    const cached = await this.get<T>(key, provider)
    if (cached !== null) {
      return cached
    }

    const value = await fallback()
    await this.set(key, value, ttl, provider)
    return value
  }

  // Batch operations
  async mget<T>(keys: string[], provider = "default"): Promise<(T | null)[]> {
    const cacheProvider = this.getProvider(provider)
    return Promise.all(keys.map((key) => cacheProvider.get<T>(key)))
  }

  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>, provider = "default"): Promise<void> {
    const cacheProvider = this.getProvider(provider)
    await Promise.all(entries.map(({ key, value, ttl }) => cacheProvider.set(key, value, ttl)))
  }
}
