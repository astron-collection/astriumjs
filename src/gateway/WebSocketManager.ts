/**
 * WebSocket connection manager for Discord Gateway
 */

import WebSocket from "ws"
import { EventEmitter } from "events"
import type { AstriumClient } from "../client/AstriumClient"
import { AstriumWebSocketError } from "../errors/AstriumError"
import { GatewayOpcodes, GatewayCloseCodes } from "../constants/Gateway"
import type { GatewayPayload, GatewayIdentifyData } from "../types/GatewayTypes"

export interface WebSocketManagerEvents {
  ready: [any]
  resumed: []
  disconnect: [number, string]
  reconnecting: []
  error: [Error]
  debug: [string]
  raw: [GatewayPayload]
}

export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private lastHeartbeatAck = true
  private sequence: number | null = null
  private sessionId: string | null = null
  private resumeGatewayUrl: string | null = null
  private reconnectAttempts = 0
  private isReconnecting = false

  constructor(
    private client: AstriumClient,
    private shardId = 0,
    private totalShards = 1,
  ) {
    super()
  }

  /**
   * Connect to Discord Gateway
   */
  async connect(gatewayUrl?: string): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.client.logger.warn("WebSocket is already connected")
      return
    }

    const url = gatewayUrl || this.resumeGatewayUrl || "wss://gateway.discord.gg/?v=10&encoding=json"

    this.client.logger.debug(`Connecting to Gateway: ${url}`)

    try {
      this.ws = new WebSocket(url)
      this.setupEventHandlers()

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new AstriumWebSocketError("Connection timeout"))
        }, this.client.options.ws.connectionTimeout)

        this.ws!.once("open", () => {
          clearTimeout(timeout)
          this.client.logger.debug("WebSocket connection established")
          resolve()
        })

        this.ws!.once("error", (error) => {
          clearTimeout(timeout)
          reject(new AstriumWebSocketError(`Connection failed: ${error.message}`))
        })
      })
    } catch (error) {
      throw new AstriumWebSocketError(`Failed to create WebSocket: ${error}`)
    }
  }

  /**
   * Disconnect from Gateway
   */
  async disconnect(code = 1000, reason = "Normal closure"): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.ws) {
      this.ws.close(code, reason)
      this.ws = null
    }

    this.sequence = null
    this.sessionId = null
    this.resumeGatewayUrl = null
    this.reconnectAttempts = 0
    this.isReconnecting = false
  }

  /**
   * Send payload to Gateway
   */
  send(payload: GatewayPayload): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.client.logger.warn("Cannot send payload: WebSocket not connected")
      return
    }

    const data = JSON.stringify(payload)
    this.client.logger.debug("Sending payload:", payload.op, payload.t)
    this.ws.send(data)
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return

    this.ws.on("message", (data) => {
      try {
        const payload: GatewayPayload = JSON.parse(data.toString())
        this.handlePayload(payload)
      } catch (error) {
        this.client.logger.error("Failed to parse Gateway payload:", error)
      }
    })

    this.ws.on("close", (code, reason) => {
      this.client.logger.debug(`WebSocket closed: ${code} ${reason}`)
      this.handleClose(code, reason.toString())
    })

    this.ws.on("error", (error) => {
      this.client.logger.error("WebSocket error:", error)
      this.emit("error", new AstriumWebSocketError(error.message))
    })
  }

  /**
   * Handle incoming Gateway payload
   */
  private handlePayload(payload: GatewayPayload): void {
    this.emit("raw", payload)

    if (payload.s !== null) {
      this.sequence = payload.s
    }

    switch (payload.op) {
      case GatewayOpcodes.DISPATCH:
        this.handleDispatch(payload)
        break

      case GatewayOpcodes.HEARTBEAT:
        this.sendHeartbeat()
        break

      case GatewayOpcodes.RECONNECT:
        this.client.logger.info("Gateway requested reconnect")
        this.reconnect()
        break

      case GatewayOpcodes.INVALID_SESSION:
        this.client.logger.warn("Invalid session, identifying again")
        this.sessionId = null
        this.sequence = null
        setTimeout(() => this.identify(), 5000)
        break

      case GatewayOpcodes.HELLO:
        this.handleHello(payload.d)
        break

      case GatewayOpcodes.HEARTBEAT_ACK:
        this.lastHeartbeatAck = true
        this.client.logger.debug("Received heartbeat ACK")
        break

      default:
        this.client.logger.debug(`Unknown opcode: ${payload.op}`)
    }
  }

  /**
   * Handle DISPATCH events
   */
  private handleDispatch(payload: GatewayPayload): void {
    switch (payload.t) {
      case "READY":
        this.handleReady(payload.d)
        break

      case "RESUMED":
        this.client.logger.info("Session resumed")
        this.isReconnecting = false
        this.reconnectAttempts = 0
        this.emit("resumed")
        break

      default:
        // Forward all events to the client
        this.client.emit(payload.t!.toLowerCase() as any, payload.d)
    }
  }

  /**
   * Handle READY event
   */
  private handleReady(data: any): void {
    this.sessionId = data.session_id
    this.resumeGatewayUrl = data.resume_gateway_url
    this.isReconnecting = false
    this.reconnectAttempts = 0

    this.client.logger.info(`Shard ${this.shardId} ready`)
    this.emit("ready", data)
  }

  /**
   * Handle HELLO event and start heartbeating
   */
  private handleHello(data: any): void {
    this.client.logger.debug(`Received HELLO, heartbeat interval: ${data.heartbeat_interval}ms`)

    // Start heartbeating
    this.startHeartbeat(data.heartbeat_interval)

    // Identify or resume
    if (this.sessionId && this.sequence !== null) {
      this.resume()
    } else {
      this.identify()
    }
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(interval: number): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      if (!this.lastHeartbeatAck) {
        this.client.logger.warn("Heartbeat not acknowledged, reconnecting")
        this.reconnect()
        return
      }

      this.sendHeartbeat()
    }, interval)

    // Send initial heartbeat
    this.sendHeartbeat()
  }

  /**
   * Send heartbeat
   */
  private sendHeartbeat(): void {
    this.lastHeartbeatAck = false
    this.send({
      op: GatewayOpcodes.HEARTBEAT,
      d: this.sequence,
    })
    this.client.logger.debug("Sent heartbeat")
  }

  /**
   * Send IDENTIFY payload
   */
  private identify(): void {
    const identifyData: GatewayIdentifyData = {
      token: this.client.token!,
      intents: this.calculateIntents(),
      properties: {
        os: process.platform,
        browser: "astrium.js",
        device: "astrium.js",
      },
      shard: [this.shardId, this.totalShards],
    }

    this.send({
      op: GatewayOpcodes.IDENTIFY,
      d: identifyData,
    })

    this.client.logger.debug("Sent IDENTIFY")
  }

  /**
   * Send RESUME payload
   */
  private resume(): void {
    this.send({
      op: GatewayOpcodes.RESUME,
      d: {
        token: this.client.token!,
        session_id: this.sessionId!,
        seq: this.sequence!,
      },
    })

    this.client.logger.debug("Sent RESUME")
  }

  /**
   * Calculate intent bits
   */
  private calculateIntents(): number {
    return this.client.options.intents.reduce((bits, intent) => {
      const bit = require("../constants/GatewayIntents").GatewayIntentBits[intent]
      return bit ? bits | bit : bits
    }, 0)
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(code: number, reason: string): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    this.emit("disconnect", code, reason)

    // Check if we should reconnect
    if (this.shouldReconnect(code)) {
      this.reconnect()
    } else {
      this.client.logger.error(`WebSocket closed with non-recoverable code: ${code}`)
    }
  }

  /**
   * Check if we should attempt to reconnect
   */
  private shouldReconnect(code: number): boolean {
    const nonRecoverableCodes = [
      GatewayCloseCodes.AUTHENTICATION_FAILED,
      GatewayCloseCodes.INVALID_SHARD,
      GatewayCloseCodes.SHARDING_REQUIRED,
      GatewayCloseCodes.INVALID_API_VERSION,
      GatewayCloseCodes.INVALID_INTENTS,
      GatewayCloseCodes.DISALLOWED_INTENTS,
    ]

    return !nonRecoverableCodes.includes(code) && this.reconnectAttempts < this.client.options.ws.maxReconnectAttempts
  }

  /**
   * Attempt to reconnect
   */
  private async reconnect(): Promise<void> {
    if (this.isReconnecting) return

    this.isReconnecting = true
    this.reconnectAttempts++

    this.client.logger.info(
      `Reconnecting... (attempt ${this.reconnectAttempts}/${this.client.options.ws.maxReconnectAttempts})`,
    )
    this.emit("reconnecting")

    // Close current connection
    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws.close()
      this.ws = null
    }

    // Wait before reconnecting
    await new Promise((resolve) => setTimeout(resolve, this.client.options.ws.reconnectDelay))

    try {
      await this.connect()
    } catch (error) {
      this.client.logger.error("Reconnection failed:", error)

      if (this.reconnectAttempts < this.client.options.ws.maxReconnectAttempts) {
        this.reconnect()
      } else {
        this.client.logger.error("Max reconnection attempts reached")
        this.emit("error", new AstriumWebSocketError("Max reconnection attempts reached"))
      }
    }
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Get current ping
   */
  get ping(): number {
    // This would need to be calculated based on heartbeat timing
    return -1 // Placeholder
  }

  // Event emitter type safety
  public on<K extends keyof WebSocketManagerEvents>(
    event: K,
    listener: (...args: WebSocketManagerEvents[K]) => void,
  ): this {
    return super.on(event, listener)
  }

  public emit<K extends keyof WebSocketManagerEvents>(event: K, ...args: WebSocketManagerEvents[K]): boolean {
    return super.emit(event, ...args)
  }
}
