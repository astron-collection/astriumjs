/**
 * Plugin system usage example
 */

import { AstriumClient } from "../src"
import { BasePlugin } from "../src/plugins/BasePlugin"
import { AutoReconnectPlugin, MessageLoggerPlugin } from "../src/plugins/BuiltinPlugins"

// Example custom plugin
class CustomGreetingPlugin extends BasePlugin {
  readonly name = "custom-greeting"
  readonly version = "1.0.0"
  readonly description = "Greets new members"
  readonly author = "Example Developer"

  private greetingChannel?: string
  private greetingMessage = "Welcome to the server, {user}!"

  protected async onInit(options?: Record<string, any>): Promise<void> {
    this.greetingChannel = options?.channel
    this.greetingMessage = options?.message || this.greetingMessage

    this.log("info", `Greeting plugin initialized for channel: ${this.greetingChannel}`)
  }

  protected registerHooks(): void {
    this.registerHook("guild.memberAdd", this.handleMemberAdd.bind(this), 0)
  }

  private async handleMemberAdd(member: any): Promise<void> {
    if (!this.greetingChannel) return

    try {
      const message = this.greetingMessage.replace("{user}", `<@${member.user.id}>`)

      await this.client.rest.post(`/channels/${this.greetingChannel}/messages`, {
        body: { content: message },
      })

      this.log("info", `Greeted new member: ${member.user.username}`)
    } catch (error) {
      this.log("error", "Failed to send greeting:", error)
    }
  }
}

// Example analytics plugin
class AnalyticsPlugin extends BasePlugin {
  readonly name = "analytics"
  readonly version = "1.0.0"
  readonly description = "Collects bot usage analytics"
  readonly author = "Example Developer"

  private stats = {
    messagesProcessed: 0,
    commandsExecuted: 0,
    startTime: Date.now(),
  }

  protected registerHooks(): void {
    this.registerHook("message.create", this.handleMessage.bind(this), -100)
    this.registerHook("command.execute", this.handleCommand.bind(this), -100)
  }

  private async handleMessage(message: any): Promise<void> {
    this.stats.messagesProcessed++
  }

  private async handleCommand(commandName: string): Promise<void> {
    this.stats.commandsExecuted++
    this.log("debug", `Command executed: ${commandName} (total: ${this.stats.commandsExecuted})`)
  }

  public getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
    }
  }
}

const client = new AstriumClient({
  token: process.env.DISCORD_TOKEN || "YOUR_BOT_TOKEN",
  intents: ["GUILDS", "GUILD_MESSAGES", "MESSAGE_CONTENT", "GUILD_MEMBERS"],
  logging: {
    level: "debug",
  },
  // Load plugins from configuration
  plugins: [
    {
      plugin: new AutoReconnectPlugin(),
      options: {
        maxAttempts: 10,
        delay: 3000,
      },
    },
    {
      plugin: new MessageLoggerPlugin(),
      options: {
        logBots: false,
        logDMs: true,
      },
    },
  ],
})

client.on("ready", async () => {
  console.log(`🚀 ${client.user?.username} is ready!`)

  // Load additional plugins after ready
  const greetingPlugin = new CustomGreetingPlugin()
  await client.plugins.load(greetingPlugin, {
    channel: "123456789012345678", // Replace with actual channel ID
    message: "🎉 Welcome {user}! Please read the rules.",
  })

  const analyticsPlugin = new AnalyticsPlugin()
  await client.plugins.load(analyticsPlugin)

  // Show plugin status
  console.log("📦 Loaded plugins:")
  for (const plugin of client.plugins.getAll()) {
    console.log(`  • ${plugin.name} v${plugin.version} - ${plugin.description}`)
  }

  // Show analytics every 30 seconds
  setInterval(() => {
    const analytics = client.plugins.get("analytics") as AnalyticsPlugin
    if (analytics) {
      console.log("📊 Analytics:", analytics.getStats())
    }
  }, 30000)
})

// Plugin event handlers
client.plugins.on("pluginLoaded", (plugin) => {
  console.log(`✅ Plugin loaded: ${plugin.name} v${plugin.version}`)
})

client.plugins.on("pluginUnloaded", (name) => {
  console.log(`❌ Plugin unloaded: ${name}`)
})

client.plugins.on("pluginError", (plugin, error) => {
  console.error(`💥 Plugin error in ${plugin.name}:`, error)
})

// Example commands to manage plugins
client.on("messageCreate", async (message) => {
  if (message.author?.bot) return
  if (!message.content.startsWith("!")) return

  const args = message.content.slice(1).split(" ")
  const command = args.shift()?.toLowerCase()

  if (command === "plugins") {
    const plugins = client.plugins.getAll()
    let response = "📦 **Loaded Plugins:**\n"

    for (const plugin of plugins) {
      const status = client.plugins.getStatus(plugin.name)
      response += `• **${plugin.name}** v${plugin.version} - ${status?.status}\n`
    }

    await client.rest.post(`/channels/${message.channel_id}/messages`, {
      body: { content: response },
    })
  }

  if (command === "reload" && args[0]) {
    try {
      await client.plugins.reload(args[0])
      await client.rest.post(`/channels/${message.channel_id}/messages`, {
        body: { content: `✅ Reloaded plugin: ${args[0]}` },
      })
    } catch (error) {
      await client.rest.post(`/channels/${message.channel_id}/messages`, {
        body: { content: `❌ Failed to reload plugin: ${error}` },
      })
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
