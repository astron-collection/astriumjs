import type { CacheManager } from "./CacheManager.js"
import { Logger } from "../utils/Logger.js"

export interface CacheableEntity {
  id: string
  [key: string]: any
}

export class EntityCache<T extends CacheableEntity> {
  private logger = new Logger(`EntityCache<${this.entityType}>`)

  constructor(
    private cacheManager: CacheManager,
    private entityType: string,
    private defaultTTL = 300000, // 5 minutes
    private provider = "default",
  ) {}

  private getKey(id: string): string {
    return `${this.entityType}:${id}`
  }

  async get(id: string): Promise<T | null> {
    const key = this.getKey(id)
    return this.cacheManager.get<T>(key, this.provider)
  }

  async set(entity: T, ttl?: number): Promise<void> {
    const key = this.getKey(entity.id)
    await this.cacheManager.set(key, entity, ttl || this.defaultTTL, this.provider)
    this.logger.debug(`Cached ${this.entityType} with ID: ${entity.id}`)
  }

  async delete(id: string): Promise<boolean> {
    const key = this.getKey(id)
    const deleted = await this.cacheManager.delete(key, this.provider)
    if (deleted) {
      this.logger.debug(`Removed ${this.entityType} from cache: ${id}`)
    }
    return deleted
  }

  async has(id: string): Promise<boolean> {
    const key = this.getKey(id)
    return this.cacheManager.has(key, this.provider)
  }

  async getMany(ids: string[]): Promise<(T | null)[]> {
    const keys = ids.map((id) => this.getKey(id))
    return this.cacheManager.mget<T>(keys, this.provider)
  }

  async setMany(entities: T[], ttl?: number): Promise<void> {
    const entries = entities.map((entity) => ({
      key: this.getKey(entity.id),
      value: entity,
      ttl: ttl || this.defaultTTL,
    }))

    await this.cacheManager.mset(entries, this.provider)
    this.logger.debug(`Cached ${entities.length} ${this.entityType} entities`)
  }

  // Cache with fallback for single entity
  async getOrFetch(id: string, fetcher: (id: string) => Promise<T | null>, ttl?: number): Promise<T | null> {
    const key = this.getKey(id)
    return this.cacheManager.getOrSet(key, () => fetcher(id), ttl || this.defaultTTL, this.provider)
  }

  // Invalidate pattern-based keys (for memory cache only)
  async invalidatePattern(pattern: string): Promise<void> {
    // This is a simplified implementation
    // In a real Redis implementation, you'd use SCAN with pattern matching
    this.logger.debug(`Invalidating cache pattern: ${pattern}`)
  }

  // Update entity in cache
  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const existing = await this.get(id)
    if (!existing) return null

    const updated = { ...existing, ...updates } as T
    await this.set(updated)
    return updated
  }
}
