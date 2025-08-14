# Astrium.js Discord Librairy

A modern, high-performance Discord library for JavaScript and TypeScript.

## Features

- 🚀 **High Performance** - Built for speed and efficiency with optimized WebSocket and REST handling
- 🔧 **Modular Architecture** - Plugin system for extensibility without core modifications
- 📦 **TypeScript First** - Full type safety and IntelliSense support with comprehensive type definitions
- 🌐 **Sharding Support** - Built-in sharding for large bots with automatic shard management
- 💾 **Flexible Caching** - Memory and Redis caching options with entity-specific cache management
- ⚡ **Modern API** - Clean, intuitive developer experience with async/await support
- 🔌 **Plugin System** - Extend functionality with hooks, middleware, and lifecycle management
- 🎯 **Command System** - Built-in slash and prefix command handling with builders and validation
- 📡 **Event System** - Advanced event handling with middleware, filtering, and priority support
- 🔄 **Auto-Reconnection** - Robust connection handling with automatic reconnection and session resuming

## Quick Start

```typescript
import { AstriumClient, GatewayIntents, SlashCommandBuilder } from 'astrium.js'

const client = new AstriumClient({
  token: 'YOUR_BOT_TOKEN',
  intents: [GatewayIntents.GUILDS, GatewayIntents.GUILD_MESSAGES, GatewayIntents.MESSAGE_CONTENT],
  cache: {
    provider: 'memory',
    options: {
      ttl: 300000, // 5 minutes
      maxSize: 1000,
      strategy: 'lru'
    }
  },
  commands: {
    prefix: '!',
    registerSlashCommands: true
  }
})

// Register a slash command
const pingCommand = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong!')
  .setExecute(async (interaction) => {
    await interaction.reply('Pong!')
  })

client.commands.registerSlashCommand(pingCommand)

// Register a prefix command
client.commands.registerPrefixCommand({
  name: 'info',
  description: 'Shows bot information',
  execute: async (message, args) => {
    await message.reply(`Bot uptime: ${client.uptime}ms`)
  }
})

// Event handling with middleware
client.events.use(async (event, next) => {
  console.log(`Processing event: ${event.type}`)
  await next()
})

client.on('ready', () => {
  console.log(`${client.user?.username} is ready!`)
})

client.on('messageCreate', async (message) => {
  if (message.author.bot) return
  
  // Cache user data automatically
  await client.userCache.set({
    id: message.author.id,
    username: message.author.username,
    lastSeen: new Date().toISOString()
  })
})

client.connect()
```

## Advanced Usage

### Caching with Redis

```typescript
import Redis from 'ioredis'

const redis = new Redis({
  host: 'localhost',
  port: 6379
})

const client = new AstriumClient({
  token: 'YOUR_BOT_TOKEN',
  intents: [GatewayIntents.GUILDS],
  cache: {
    provider: 'redis',
    redis: redis,
    options: {
      ttl: 600000 // 10 minutes
    }
  }
})
```

### Plugin Development

```typescript
import { BasePlugin } from 'astrium.js'

class MyPlugin extends BasePlugin {
  constructor() {
    super({
      name: 'my-plugin',
      version: '1.0.0',
      description: 'My custom plugin'
    })
  }

  async onLoad() {
    this.client.logger.info('MyPlugin loaded!')
    
    // Register hooks
    this.registerHook('message.create', async (message) => {
      // Custom message processing
    })
  }

  async onUnload() {
    this.client.logger.info('MyPlugin unloaded!')
  }
}

// Load the plugin
client.plugins.load(new MyPlugin())
```

### Event Middleware

```typescript
// Add logging middleware
client.events.use(async (event, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  console.log(`Event ${event.type} processed in ${duration}ms`)
})

// Add filtering middleware
client.events.use('messageCreate', async (event, next) => {
  if (event.data.author.bot) return // Skip bot messages
  await next()
})
```

## Installation

```bash
npm install astrium.js
# or
yarn add astrium.js
# or
pnpm add astrium.js
```

### Dependencies

Astrium.js has minimal dependencies:
- `ws` - WebSocket client
- `undici` - HTTP client (optional, falls back to fetch)

Optional dependencies:
- `ioredis` - For Redis caching support

## API Reference

### Core Classes

- **AstriumClient** - Main client class
- **CacheManager** - Cache management with multiple providers
- **CommandManager** - Slash and prefix command handling
- **EventManager** - Advanced event system with middleware
- **PluginManager** - Plugin lifecycle and hook management
- **RESTManager** - Discord REST API client with rate limiting
- **WebSocketManager** - Gateway connection management

### Builders

- **SlashCommandBuilder** - Build slash commands with validation
- **PrefixCommandBuilder** - Build prefix commands with parsing

### Cache Providers

- **MemoryCacheProvider** - In-memory caching with LRU/FIFO eviction
- **RedisCacheProvider** - Redis-based distributed caching
- **EntityCache** - Specialized caching for Discord entities

## Configuration

### Client Options

```typescript
interface AstriumClientOptions {
  token: string
  intents: GatewayIntents[]
  apiVersion?: number
  sharding?: ShardingOptions
  cache?: CacheOptions
  logging?: LoggingOptions
  plugins?: PluginOptions[]
  rest?: RESTOptions
  ws?: WebSocketOptions
  commands?: CommandOptions
}
```

### Environment Variables

Set your Discord bot token:
```bash
DISCORD_TOKEN=your_bot_token_here
```

## Examples

Check out the `/examples` directory for complete working examples:

- `basic-bot.ts` - Simple bot with basic commands
- `advanced-bot.ts` - Advanced features showcase
- `plugin-system-example.ts` - Custom plugin development
- `caching-example.ts` - Cache usage patterns
- `complete-bot-example.ts` - Full-featured bot implementation

## Performance

Astrium.js is designed for high performance:

- **Memory efficient** - Smart caching with configurable limits and TTL
- **Rate limit aware** - Built-in rate limiting with queue management
- **Connection resilient** - Automatic reconnection with exponential backoff
- **Event optimized** - Efficient event processing with middleware pipeline
- **Type safe** - Zero runtime type checking overhead

## Comparison

| Feature | Astrium.js | discord.js | Eris |
|---------|------------|------------|------|
| TypeScript | ✅ First-class | ✅ Good | ⚠️ Community |
| Plugin System | ✅ Built-in | ❌ No | ❌ No |
| Caching | ✅ Multi-provider | ✅ Memory only | ✅ Memory only |
| Event Middleware | ✅ Advanced | ❌ No | ❌ No |
| Command System | ✅ Built-in | ⚠️ Separate | ❌ No |
| Bundle Size | ✅ Minimal | ⚠️ Large | ✅ Small |

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/astron-collection/astriumjs.git
cd astriumjs
npm install
npm run build
npm test
```

## Support

- 📖 [Documentation](https://astriumjs.org) (coming soon)
- 💬 [Discord Server](https://discord.gg/astrium) (coming soon)
- 🐛 [Issue Tracker](https://github.com/astron-collection/astriumjs/issues)
- 📧 [Email Support](mailto:support@astriumjs.org)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Made with ❤️ by the Astrium.js team
