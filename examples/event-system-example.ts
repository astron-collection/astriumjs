/**
 * Event system usage example
 */

import { AstriumClient } from "../src"
import { EventFilters } from "../src/events/EventFilters"
import { CommonMiddleware } from "../src/events/EventMiddleware"

const client = new AstriumClient({
  token: process.env.DISCORD_TOKEN || "YOUR_BOT_TOKEN",
  intents: ["GUILDS", "GUILD_MESSAGES", "MESSAGE_CONTENT"],
  logging: {
    level: "debug",
  },
})

// Example: High priority ready handler
client.on(
  "ready",
  () => {
    console.log(`🚀 ${client.user?.username} is ready! (High Priority)`)
  },
  { priority: 100 },
)

// Example: Low priority ready handler
client.on(
  "ready",
  () => {
    console.log(`📊 Bot statistics loaded (Low Priority)`)
  },
  { priority: -100 },
)

// Example: Message handler with filters
client.on(
  "messageCreate",
  (message) => {
    console.log(`📝 Non-bot message: ${message.content}`)
  },
  {
    filter: EventFilters.noBots(),
    priority: 50,
  },
)

// Example: Guild-specific message handler
const GUILD_ID = "123456789012345678"
client.on(
  "messageCreate",
  (message) => {
    console.log(`🏰 Guild message: ${message.content}`)
  },
  {
    filter: EventFilters.byGuild(GUILD_ID),
  },
)

// Example: Command-like message handler
client.on(
  "messageCreate",
  (message) => {
    console.log(`🤖 Command detected: ${message.content}`)
  },
  {
    filter: EventFilters.and(EventFilters.noBots(), EventFilters.messageContent(/^!/)),
  },
)

// Example: Add global middleware
client.events.addMiddleware(
  CommonMiddleware.rateLimiter(5, 60000), // 5 events per minute per user
)

client.events.addMiddleware(CommonMiddleware.metrics())

// Example: One-time event listener
client.once("ready", () => {
  console.log("🎉 This will only run once!")
})

// Example: Custom middleware
client.events.addMiddleware({
  name: "customLogger",
  priority: 500,
  handler: (event, data, next) => {
    if (event === "messageCreate") {
      console.log(`📨 Message middleware: ${data.content?.substring(0, 50)}...`)
    }
    next()
  },
})

// Example: Error handling
client.events.on("handlerError", (error, listener, context) => {
  console.error(`❌ Handler error in ${context.event}:`, error)
})

// Example: Event statistics
client.on("ready", () => {
  setInterval(() => {
    const stats = client.getEventStats()
    console.log("📊 Event Statistics:", stats)
  }, 30000) // Every 30 seconds
})

// Handle process termination
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down...")
  await client.destroy()
  process.exit(0)
})

// Start the bot
client.login().catch(console.error)
