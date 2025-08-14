/**
 * Logging utility for Astrium.js
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerOptions {
  level: LogLevel
  prefix?: string
  colors?: boolean
  timestamp?: boolean
}

export class Logger {
  private level: LogLevel
  private prefix: string
  private colors: boolean
  private timestamp: boolean

  constructor(options: LoggerOptions = { level: LogLevel.INFO }) {
    this.level = options.level
    this.prefix = options.prefix || "[Astrium]"
    this.colors = options.colors ?? true
    this.timestamp = options.timestamp ?? true
  }

  private formatMessage(level: string, message: string): string {
    const parts: string[] = []

    if (this.timestamp) {
      parts.push(new Date().toISOString())
    }

    parts.push(this.prefix)
    parts.push(`[${level}]`)
    parts.push(message)

    return parts.join(" ")
  }

  private colorize(text: string, color: string): string {
    if (!this.colors) return text

    const colors: Record<string, string> = {
      reset: "\x1b[0m",
      red: "\x1b[31m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      gray: "\x1b[90m",
    }

    return `${colors[color] || ""}${text}${colors.reset}`
  }

  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(this.colorize(this.formatMessage("DEBUG", message), "gray"), ...args)
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(this.colorize(this.formatMessage("INFO", message), "blue"), ...args)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.colorize(this.formatMessage("WARN", message), "yellow"), ...args)
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.colorize(this.formatMessage("ERROR", message), "red"), ...args)
    }
  }
}
