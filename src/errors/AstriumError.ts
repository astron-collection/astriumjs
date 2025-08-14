/**
 * Custom error classes for Astrium.js
 */

export class AstriumError extends Error {
  public readonly name = "AstriumError"

  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    Error.captureStackTrace(this, AstriumError)
  }
}

export class AstriumAPIError extends AstriumError {
  public readonly name = "AstriumAPIError"

  constructor(
    message: string,
    public readonly status: number,
    public readonly method: string,
    public readonly url: string,
    public readonly requestData?: any,
  ) {
    super(message, "API_ERROR")
    Error.captureStackTrace(this, AstriumAPIError)
  }
}

export class AstriumWebSocketError extends AstriumError {
  public readonly name = "AstriumWebSocketError"

  constructor(
    message: string,
    public readonly closeCode?: number,
  ) {
    super(message, "WEBSOCKET_ERROR")
    Error.captureStackTrace(this, AstriumWebSocketError)
  }
}

export class AstriumValidationError extends AstriumError {
  public readonly name = "AstriumValidationError"

  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message, "VALIDATION_ERROR")
    Error.captureStackTrace(this, AstriumValidationError)
  }
}
