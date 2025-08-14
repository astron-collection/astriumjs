import { AstriumClient, GatewayIntents, SlashCommandBuilder } from "../src/index.js"

// Complete example showcasing all features
const client = new AstriumClient({
  token: process.env.DISCORD_TOKEN!,
  intents: [GatewayIntents.GUILDS, GatewayIntents.GUILD_MESSAGES, GatewayIntents.MESSAGE_CONTENT],
  cache: {
    // Optional Redis cache
    // redis: redisClient,
    options: {
      ttl: 300000, // 5 minutes
      maxSize: 1000,
      strategy: "lru",
    },
  },
  commands: {
    prefix: "!",
    registerSlashCommands: true,
  },
  plugins: {
    autoLoad: true,
    directory: "./plugins",
  },
})

// Event handling with middleware
client.events.use(async (event, next) => {
  console.log(`Processing event: ${event.type}`)
  await next()
})

// Register slash command
const pingCommand = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with Pong!")
  .setExecute(async (interaction) => {
    const cached = await client.cache.get("ping_count")
    const count = ((cached as number) || 0) + 1
    await client.cache.set("ping_count", count)

    await interaction.reply(`Pong! This is ping #${count}`)
  })

client.commands.registerSlashCommand(pingCommand)

// Register prefix command
client.commands.registerPrefixCommand({
  name: "info",
  description: "Shows bot information",
  execute: async (message, args) => {
    const guilds = await client.guildCache.getMany(["123", "456"])
    await message.reply(`Bot is running in ${guilds.length} cached guilds!`)
  },
})

// Event listeners
client.on("ready", () => {
  console.log(`${client.user?.username} is ready!`)
})

client.on("messageCreate", async (message) => {
  if (message.author.bot) return

  // Cache user data
  await client.userCache.set({
    id: message.author.id,
    username: message.author.username,
    lastSeen: new Date().toISOString(),
  })
})

// Connect to Discord
client.connect()
