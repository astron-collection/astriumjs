/**
 * Command system usage example
 */

import { AstriumClient } from "../src"
import { SlashCommandBuilder, PrefixCommandBuilder } from "../src/commands/CommandBuilder"

const client = new AstriumClient({
  token: process.env.DISCORD_TOKEN || "YOUR_BOT_TOKEN",
  intents: ["GUILDS", "GUILD_MESSAGES", "MESSAGE_CONTENT"],
  logging: {
    level: "debug",
  },
})

client.on("ready", async () => {
  console.log(`🚀 ${client.user?.username} is ready!`)

  // Register slash commands
  await registerSlashCommands()

  // Register prefix commands
  registerPrefixCommands()
})

async function registerSlashCommands() {
  // Simple ping command
  const pingCommand = new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!")
    .setExecute(async (context) => {
      await context.reply(`🏓 Pong! Latency: ${client.ping}ms`)
    })
    .build()

  // Echo command with options
  const echoCommand = new SlashCommandBuilder()
    .setName("echo")
    .setDescription("Echoes your message")
    .addStringOption("message", "The message to echo", { required: true })
    .addBooleanOption("ephemeral", "Whether the response should be ephemeral")
    .setExecute(async (context) => {
      const message = context.getOption<string>("message")
      const ephemeral = context.getOption<boolean>("ephemeral") || false

      await context.reply({
        content: `📢 ${message}`,
        ephemeral,
      })
    })
    .build()

  // User info command
  const userInfoCommand = new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Get information about a user")
    .addUserOption("user", "The user to get info about")
    .setGuildOnly(true)
    .setCooldown(5)
    .setExecute(async (context) => {
      const user = context.getOption("user") || context.interaction.user || context.interaction.member?.user

      await context.reply({
        content: `👤 **User Information**\n🏷️ Username: ${user.username}\n🆔 ID: ${user.id}\n🤖 Bot: ${user.bot ? "Yes" : "No"}`,
      })
    })
    .build()

  // Register all slash commands
  await client.commands.registerSlashCommands([pingCommand, echoCommand, userInfoCommand])
}

function registerPrefixCommands() {
  // Simple ping command
  const pingCommand = new PrefixCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!")
    .setAliases(["p", "pong"])
    .setExecute(async (context) => {
      await context.reply(`🏓 Pong! Latency: ${client.ping}ms`)
    })
    .build()

  // Echo command
  const echoCommand = new PrefixCommandBuilder()
    .setName("echo")
    .setDescription("Echoes your message")
    .setAliases(["say", "repeat"])
    .setExecute(async (context) => {
      if (context.args.length === 0) {
        await context.reply("❌ Please provide a message to echo!")
        return
      }

      const message = context.args.join(" ")
      await context.reply(`📢 ${message}`)
    })
    .build()

  // Help command
  const helpCommand = new PrefixCommandBuilder()
    .setName("help")
    .setDescription("Shows available commands")
    .setAliases(["h", "commands"])
    .setExecute(async (context) => {
      const help = client.commands.generateHelp()

      let helpText = "📋 **Available Commands**\n\n"

      if (help.slash.length > 0) {
        helpText += "**Slash Commands:**\n"
        for (const cmd of help.slash) {
          helpText += `• \`/${cmd.name}\` - ${cmd.description}\n`
        }
        helpText += "\n"
      }

      if (help.prefix.length > 0) {
        helpText += "**Prefix Commands:**\n"
        for (const cmd of help.prefix) {
          helpText += `• \`!${cmd.name}\` - ${cmd.description}`
          if (cmd.aliases && cmd.aliases.length > 0) {
            helpText += ` (aliases: ${cmd.aliases.map((a) => `\`${a}\``).join(", ")})`
          }
          helpText += "\n"
        }
      }

      await context.reply(helpText)
    })
    .build()

  // Math command with cooldown
  const mathCommand = new PrefixCommandBuilder()
    .setName("math")
    .setDescription("Performs basic math operations")
    .setAliases(["calc", "calculate"])
    .setCooldown(3)
    .setExecute(async (context) => {
      if (context.args.length < 3) {
        await context.reply("❌ Usage: `!math <number1> <operator> <number2>`\nExample: `!math 5 + 3`")
        return
      }

      const [num1Str, operator, num2Str] = context.args
      const num1 = Number.parseFloat(num1Str)
      const num2 = Number.parseFloat(num2Str)

      if (isNaN(num1) || isNaN(num2)) {
        await context.reply("❌ Please provide valid numbers!")
        return
      }

      let result: number
      switch (operator) {
        case "+":
          result = num1 + num2
          break
        case "-":
          result = num1 - num2
          break
        case "*":
        case "×":
          result = num1 * num2
          break
        case "/":
        case "÷":
          if (num2 === 0) {
            await context.reply("❌ Cannot divide by zero!")
            return
          }
          result = num1 / num2
          break
        default:
          await context.reply("❌ Supported operators: `+`, `-`, `*`, `/`")
          return
      }

      await context.reply(`🧮 ${num1} ${operator} ${num2} = **${result}**`)
    })
    .build()

  // Register all prefix commands
  client.commands.registerPrefixCommands([pingCommand, echoCommand, helpCommand, mathCommand])
}

// Handle process termination
process.on("SIGINT", async () => {
  console.log("🛑 Shutting down...")
  await client.destroy()
  process.exit(0)
})

// Start the bot
client.login().catch(console.error)
