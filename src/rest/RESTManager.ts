/**
 * REST API manager for Discord API requests
 */

import { EventEmitter } from "events"
import type { AstriumClient } from "../client/AstriumClient"
import { AstriumAPIError } from "../errors/AstriumError"
import { APIBaseURL } from "../constants/API"

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  body?: any
  headers?: Record<string, string>
  files?: FileData[]
  reason?: string
  auth?: boolean
  versioned?: boolean
}

export interface FileData {
  name: string
  data: Buffer | Uint8Array
  contentType?: string
}

export interface RateLimitData {
  limit: number
  remaining: number
  reset: number
  resetAfter: number
  bucket?: string
  global: boolean
}

export interface QueuedRequest {
  endpoint: string
  options: RequestOptions
  resolve: (value: any) => void
  reject: (error: Error) => void
  retries: number
}

export class RESTManager extends EventEmitter {
  private globalReset = 0
  private globalRemaining = 1
  private buckets = new Map<string, RateLimitData>()
  private queues = new Map<string, QueuedRequest[]>()
  private processing = new Set<string>()

  constructor(private client: AstriumClient) {
    super()
  }

  /**
   * Make a request to the Discord API
   */
  async request(endpoint: string, options: RequestOptions = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        endpoint,
        options: {
          method: "GET",
          auth: true,
          versioned: true,
          ...options,
        },
        resolve,
        reject,
        retries: 0,
      }

      this.queueRequest(queuedRequest)
    })
  }

  /**
   * Queue a request for processing
   */
  private queueRequest(request: QueuedRequest): void {
    const bucketId = this.getBucketId(request.endpoint, request.options.method!)

    if (!this.queues.has(bucketId)) {
      this.queues.set(bucketId, [])
    }

    this.queues.get(bucketId)!.push(request)
    this.processQueue(bucketId)
  }

  /**
   * Process queued requests for a bucket
   */
  private async processQueue(bucketId: string): Promise<void> {
    if (this.processing.has(bucketId)) return

    const queue = this.queues.get(bucketId)
    if (!queue || queue.length === 0) return

    this.processing.add(bucketId)

    while (queue.length > 0) {
      const request = queue.shift()!

      try {
        // Check global rate limit
        if (this.globalRemaining <= 0 && Date.now() < this.globalReset) {
          const delay = this.globalReset - Date.now()
          this.client.logger.warn(`Global rate limit hit, waiting ${delay}ms`)
          await this.sleep(delay)
        }

        // Check bucket rate limit
        const bucket = this.buckets.get(bucketId)
        if (bucket && bucket.remaining <= 0 && Date.now() < bucket.reset * 1000) {
          const delay = bucket.reset * 1000 - Date.now()
          this.client.logger.debug(`Rate limit hit for ${bucketId}, waiting ${delay}ms`)
          await this.sleep(delay)
        }

        const response = await this.executeRequest(request)
        request.resolve(response)
      } catch (error) {
        if (error instanceof AstriumAPIError && error.status === 429) {
          // Rate limited, retry after delay
          const retryAfter = Number.parseInt(error.requestData?.retry_after || "1000")
          this.client.logger.warn(`Rate limited, retrying after ${retryAfter}ms`)

          await this.sleep(retryAfter)
          queue.unshift(request) // Put back at front of queue
          continue
        }

        if (request.retries < this.client.options.rest.rateLimitRetryLimit) {
          request.retries++
          this.client.logger.debug(
            `Retrying request (${request.retries}/${this.client.options.rest.rateLimitRetryLimit})`,
          )
          queue.unshift(request)
          continue
        }

        request.reject(error as Error)
      }
    }

    this.processing.delete(bucketId)
  }

  /**
   * Execute a single request
   */
  private async executeRequest(request: QueuedRequest): Promise<any> {
    const { endpoint, options } = request
    const url = this.buildURL(endpoint, options.versioned!)

    const headers: Record<string, string> = {
      "User-Agent": `DiscordBot (astrium.js, 0.1.0)`,
      ...options.headers,
    }

    if (options.auth && this.client.token) {
      headers.Authorization = `Bot ${this.client.token}`
    }

    if (options.reason) {
      headers["X-Audit-Log-Reason"] = encodeURIComponent(options.reason)
    }

    let body: string | FormData | undefined
    let contentType: string | undefined

    if (options.files && options.files.length > 0) {
      // Handle file uploads with multipart/form-data
      const formData = new FormData()

      options.files.forEach((file, index) => {
        const blob = new Blob([file.data], { type: file.contentType || "application/octet-stream" })
        formData.append(`files[${index}]`, blob, file.name)
      })

      if (options.body) {
        formData.append("payload_json", JSON.stringify(options.body))
      }

      body = formData
    } else if (options.body) {
      body = JSON.stringify(options.body)
      contentType = "application/json"
    }

    if (contentType) {
      headers["Content-Type"] = contentType
    }

    this.client.logger.debug(`${options.method} ${url}`)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.client.options.rest.timeout)

    try {
      const response = await fetch(url, {
        method: options.method,
        headers,
        body,
        signal: controller.signal,
      })

      clearTimeout(timeout)

      // Update rate limit info
      this.updateRateLimits(response, this.getBucketId(endpoint, options.method!))

      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = { message: response.statusText }
        }

        throw new AstriumAPIError(
          errorData.message || `HTTP ${response.status}`,
          response.status,
          options.method!,
          url,
          errorData,
        )
      }

      // Handle different response types
      const contentType = response.headers.get("content-type")
      if (contentType?.includes("application/json")) {
        return await response.json()
      } else if (response.status === 204) {
        return null
      } else {
        return await response.text()
      }
    } catch (error) {
      clearTimeout(timeout)

      if (error instanceof AstriumAPIError) {
        throw error
      }

      throw new AstriumAPIError(`Request failed: ${error}`, 0, options.method!, url)
    }
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimits(response: Response, bucketId: string): void {
    const limit = Number.parseInt(response.headers.get("x-ratelimit-limit") || "1")
    const remaining = Number.parseInt(response.headers.get("x-ratelimit-remaining") || "1")
    const reset = Number.parseInt(response.headers.get("x-ratelimit-reset") || "0")
    const resetAfter = Number.parseInt(response.headers.get("x-ratelimit-reset-after") || "0")
    const bucket = response.headers.get("x-ratelimit-bucket")
    const global = response.headers.get("x-ratelimit-global") === "true"

    if (global) {
      this.globalRemaining = remaining
      this.globalReset = Date.now() + resetAfter * 1000
    } else {
      this.buckets.set(bucketId, {
        limit,
        remaining,
        reset,
        resetAfter,
        bucket,
        global: false,
      })
    }

    this.client.logger.debug(`Rate limit updated for ${bucketId}: ${remaining}/${limit}`)
  }

  /**
   * Get bucket ID for rate limiting
   */
  private getBucketId(endpoint: string, method: string): string {
    // Simplified bucket ID generation
    // In a real implementation, this would be more sophisticated
    return `${method}:${endpoint.split("?")[0]}`
  }

  /**
   * Build full URL for request
   */
  private buildURL(endpoint: string, versioned: boolean): string {
    const base = versioned ? APIBaseURL : "https://discord.com/api"
    return `${base}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Convenience methods for common HTTP verbs
  async get(endpoint: string, options: Omit<RequestOptions, "method"> = {}): Promise<any> {
    return this.request(endpoint, { ...options, method: "GET" })
  }

  async post(endpoint: string, options: Omit<RequestOptions, "method"> = {}): Promise<any> {
    return this.request(endpoint, { ...options, method: "POST" })
  }

  async put(endpoint: string, options: Omit<RequestOptions, "method"> = {}): Promise<any> {
    return this.request(endpoint, { ...options, method: "PUT" })
  }

  async patch(endpoint: string, options: Omit<RequestOptions, "method"> = {}): Promise<any> {
    return this.request(endpoint, { ...options, method: "PATCH" })
  }

  async delete(endpoint: string, options: Omit<RequestOptions, "method"> = {}): Promise<any> {
    return this.request(endpoint, { ...options, method: "DELETE" })
  }
}
