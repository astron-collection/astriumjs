/**
 * Basic bot example using Astrium.js
 */

import { AstriumClient } from "../src"

const client = new AstriumClient({
  token: process.env.DISCORD_TOKEN || "YOUR_BOT_TOKEN",
  intents: ["GUILDS", "GUILD_MESSAGES", "MESSAGE_CONTENT"],
  logging: {
    level: "debug",
  },
})

client.on("ready", () => {
  console.log(`🚀 ${client.user?.username} is ready!`)
  console.log(`📊 Uptime: ${client.uptime}ms`)
  console.log(`🏓 Ping: ${client.ping}ms`)
})

client.on("error", (error) => {
  console.error("Client error:", error)
})

client.on("warn", (warning) => {
  console.warn("Client warning:", warning)
})

client.on("disconnect", (code, reason) => {
  console.log(`🔌 Disconnected: ${code} - ${reason}`)
})

client.on("reconnecting", () => {
  console.log("🔄 Reconnecting to Discord...")
})

client.on("resumed", () => {
  console.log("✅ Connection resumed")
})

// Example message handler (will be replaced with proper command system later)
client.on("messageCreate", (message) => {
  if (message.author?.bot) return

  if (message.content === "!ping") {
    message.reply(`🏓 Pong! Latency: ${client.ping}ms`)
  }

  if (message.content === "!info") {
    message.reply(`
📋 **Bot Information**
🤖 Name: ${client.user?.username}
⏱️ Uptime: ${client.uptime ? Math.floor(client.uptime / 1000) : 0}s
🏓 Ping: ${client.ping}ms
🔧 Library: Astrium.js v0.1.0
    `)
  }
})

// Handle process termination
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down...")
  await client.destroy()
  process.exit(0)
})

// Start the bot
client.login().catch(console.error)
