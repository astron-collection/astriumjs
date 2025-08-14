/**
 * REST API usage example
 */

import { AstriumClient } from "../src"

const client = new AstriumClient({
  token: process.env.DISCORD_TOKEN || "YOUR_BOT_TOKEN",
  intents: ["GUILDS", "GUILD_MESSAGES", "MESSAGE_CONTENT"],
  logging: {
    level: "debug",
  },
})

client.on("ready", async () => {
  console.log(`🚀 ${client.user?.username} is ready!`)

  try {
    // Example: Get current user info
    const currentUser = await client.rest.get("/users/@me")
    console.log("Current user:", currentUser)

    // Example: Get gateway info
    const gatewayInfo = await client.rest.get("/gateway/bot")
    console.log("Gateway info:", gatewayInfo)

    // Example: Get guilds (first 100)
    const guilds = await client.rest.get("/users/@me/guilds?limit=100")
    console.log(`Bot is in ${guilds.length} guilds`)

    // Example: Create a global slash command
    const command = {
      name: "ping",
      description: "Replies with Pong!",
      type: 1, // CHAT_INPUT
    }

    const createdCommand = await client.rest.post(`/applications/${currentUser.id}/commands`, {
      body: command,
    })
    console.log("Created command:", createdCommand)
  } catch (error) {
    console.error("REST API error:", error)
  }
})

client.on("interactionCreate", async (interaction) => {
  if (interaction.type !== 2) return // Not an application command
  if (interaction.data?.name !== "ping") return

  try {
    // Reply to the interaction
    await client.rest.post(`/interactions/${interaction.id}/${interaction.token}/callback`, {
      body: {
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: `🏓 Pong! Latency: ${client.ping}ms`,
        },
      },
    })
  } catch (error) {
    console.error("Failed to reply to interaction:", error)
  }
})

client.on("messageCreate", async (message) => {
  if (message.author?.bot) return

  if (message.content === "!channel-info") {
    try {
      // Get channel information
      const channel = await client.rest.get(`/channels/${message.channel_id}`)

      const reply = {
        content: `📋 **Channel Information**\n🏷️ Name: ${channel.name}\n🆔 ID: ${channel.id}\n📝 Type: ${channel.type}`,
      }

      await client.rest.post(`/channels/${message.channel_id}/messages`, {
        body: reply,
      })
    } catch (error) {
      console.error("Failed to get channel info:", error)
    }
  }

  if (message.content === "!guild-info") {
    try {
      // Get guild information
      const guild = await client.rest.get(`/guilds/${message.guild_id}`)

      const reply = {
        content: `🏰 **Guild Information**\n🏷️ Name: ${guild.name}\n🆔 ID: ${guild.id}\n👥 Members: ${guild.approximate_member_count || "Unknown"}`,
      }

      await client.rest.post(`/channels/${message.channel_id}/messages`, {
        body: reply,
      })
    } catch (error) {
      console.error("Failed to get guild info:", error)
    }
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
