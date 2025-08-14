# Examples

This section contains practical examples of using Astrium.js for various Discord bot scenarios.

## Table of Contents

- [Basic Bot](#basic-bot)
- [Command Bot](#command-bot)
- [Event Handling](#event-handling)
- [Plugin Usage](#plugin-usage)
- [Advanced Features](#advanced-features)
- [Real-World Examples](#real-world-examples)

## Basic Bot

A simple bot that responds to messages and shows online status.

\`\`\`typescript
import { AstriumClient, GatewayIntentBits } from 'astrium.js';

const client = new AstriumClient({
  token: process.env.DISCORD_TOKEN!,
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('ready', (user) => {
  console.log(`${user.username} is online!`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  
  if (message.content === '!hello') {
    message.reply('Hello there! 👋');
  }
});

client.connect();
\`\`\`

## Command Bot

A bot with both slash commands and prefix commands.

\`\`\`typescript
import { 
  AstriumClient, 
  GatewayIntentBits, 
  SlashCommandBuilder,
  PrefixCommandBuilder 
} from 'astrium.js';

const client = new AstriumClient({
  token: process.env.DISCORD_TOKEN!,
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  commands: {
    prefix: '!',
    caseSensitive: false
  }
});

// Slash command
const pingSlash = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check bot latency')
  .setExecute(async (interaction) => {
    const latency = Date.now() - interaction.createdTimestamp;
    await interaction.reply(`🏓 Pong! Latency: ${latency}ms`);
  });

// Prefix command
const pingPrefix = new PrefixCommandBuilder()
  .setName('ping')
  .setDescription('Check bot latency')
  .setAliases(['p', 'latency'])
  .setExecute(async (message) => {
    const latency = Date.now() - message.createdTimestamp;
    await message.reply(`🏓 Pong! Latency: ${latency}ms`);
  });

// User info command with options
const userInfo = new SlashCommandBuilder()
  .setName('userinfo')
  .setDescription('Get information about a user')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user to get info about')
      .setRequired(false)
  )
  .setExecute(async (interaction) => {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild?.members.fetch(user.id);
    
    const embed = {
      title: `User Info: ${user.username}`,
      thumbnail: { url: user.displayAvatarURL() },
      fields: [
        { name: 'ID', value: user.id, inline: true },
        { name: 'Created', value: user.createdAt.toDateString(), inline: true },
        { name: 'Joined', value: member?.joinedAt?.toDateString() || 'Unknown', inline: true }
      ],
      color: 0x5865F2
    };
    
    await interaction.reply({ embeds: [embed] });
  });

// Register commands
client.commands.register(pingSlash);
client.commands.register(pingPrefix);
client.commands.register(userInfo);

client.on('ready', (user) => {
  console.log(`${user.username} is ready with ${client.commands.getAll().length} commands!`);
});

client.connect();
\`\`\`

## Event Handling

Advanced event handling with filters and middleware.

\`\`\`typescript
import { 
  AstriumClient, 
  GatewayIntentBits, 
  EventFilter,
  type EventMiddleware 
} from 'astrium.js';

const client = new AstriumClient({
  token: process.env.DISCORD_TOKEN!,
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Event filter - only process messages from specific guilds
const guildFilter = new EventFilter()
  .setName('guild-whitelist')
  .setCondition((event, data) => {
    if (event === 'messageCreate') {
      const allowedGuilds = ['123456789012345678', '876543210987654321'];
      return allowedGuilds.includes(data.guildId);
    }
    return true;
  });

// Event middleware - logging
const loggingMiddleware: EventMiddleware = {
  name: 'event-logger',
  priority: 1,
  execute: async (event, data, next) => {
    console.log(`[${new Date().toISOString()}] Event: ${event}`);
    await next();
  }
};

// Event middleware - rate limiting
const rateLimitMiddleware: EventMiddleware = {
  name: 'rate-limiter',
  priority: 2,
  execute: async (event, data, next) => {
    if (event === 'messageCreate') {
      const userId = data.author.id;
      const key = `ratelimit:${userId}`;
      
      const count = await client.cache.get(key) || 0;
      if (count >= 5) {
        console.log(`Rate limited user: ${userId}`);
        return; // Don't call next(), blocking the event
      }
      
      await client.cache.set(key, count + 1, 60000); // 1 minute TTL
    }
    await next();
  }
};

// Add filters and middleware
client.events.addFilter(guildFilter);
client.events.addMiddleware(loggingMiddleware);
client.events.addMiddleware(rateLimitMiddleware);

// Event handlers
client.on('messageCreate', (message) => {
  if (message.content.includes('bad word')) {
    message.delete();
    message.author.send('Please keep the chat clean!');
  }
});

client.on('guildMemberAdd', (member) => {
  const welcomeChannel = member.guild.channels.cache.find(
    channel => channel.name === 'welcome'
  );
  
  if (welcomeChannel) {
    welcomeChannel.send(`Welcome to the server, ${member}! 🎉`);
  }
});

client.on('error', (error) => {
  console.error('Client error:', error);
});

client.connect();
\`\`\`

## Plugin Usage

Using and creating plugins to extend functionality.

\`\`\`typescript
import { 
  AstriumClient, 
  GatewayIntentBits, 
  BasePlugin 
} from 'astrium.js';

// Custom plugin
class ModerationPlugin extends BasePlugin {
  constructor() {
    super({
      name: 'moderation',
      version: '1.0.0',
      description: 'Basic moderation commands',
      author: 'Your Name'
    });
  }

  async onLoad() {
    console.log('Moderation plugin loaded!');
    
    // Add commands when plugin loads
    const kickCommand = new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a user from the server')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('User to kick')
          .setRequired(true)
      )
      .addStringOption(option =>
        option.setName('reason')
          .setDescription('Reason for kick')
          .setRequired(false)
      )
      .setPermissions(['KICK_MEMBERS'])
      .setExecute(async (interaction) => {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        try {
          await interaction.guild?.members.kick(user, reason);
          await interaction.reply(`✅ Kicked ${user.username} for: ${reason}`);
        } catch (error) {
          await interaction.reply('❌ Failed to kick user.');
        }
      });

    this.client.commands.register(kickCommand);
  }

  async onUnload() {
    console.log('Moderation plugin unloaded!');
    // Clean up commands
    this.client.commands.unregister('kick');
  }
}

// Auto-role plugin
class AutoRolePlugin extends BasePlugin {
  constructor() {
    super({
      name: 'auto-role',
      version: '1.0.0',
      description: 'Automatically assign roles to new members'
    });
  }

  async onLoad() {
    this.client.on('guildMemberAdd', this.handleMemberJoin.bind(this));
  }

  private async handleMemberJoin(member: any) {
    const autoRoleId = '123456789012345678'; // Configure this
    const role = member.guild.roles.cache.get(autoRoleId);
    
    if (role) {
      try {
        await member.roles.add(role);
        console.log(`Auto-assigned role to ${member.user.username}`);
      } catch (error) {
        console.error('Failed to assign auto-role:', error);
      }
    }
  }
}

// Main bot setup
const client = new AstriumClient({
  token: process.env.DISCORD_TOKEN!,
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// Load plugins
client.plugins.load(new ModerationPlugin());
client.plugins.load(new AutoRolePlugin());

client.on('ready', (user) => {
  console.log(`${user.username} is ready with ${client.plugins.getAll().length} plugins!`);
});

client.connect();
\`\`\`

## Advanced Features

Showcasing advanced features like caching, sharding, and error handling.

\`\`\`typescript
import { 
  AstriumClient, 
  GatewayIntentBits,
  RedisCacheProvider 
} from 'astrium.js';

const client = new AstriumClient({
  token: process.env.DISCORD_TOKEN!,
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  
  // Advanced caching with Redis
  cache: {
    provider: new RedisCacheProvider({
      host: 'localhost',
      port: 6379,
      password: process.env.REDIS_PASSWORD
    }),
    ttl: 300000, // 5 minutes default TTL
    maxSize: 10000
  },
  
  // Sharding configuration
  sharding: {
    mode: 'auto',
    shardCount: 'auto',
    respawn: true
  },
  
  // REST API configuration
  rest: {
    timeout: 15000,
    retries: 3,
    rateLimitStrategy: 'queue'
  },
  
  // Logging configuration
  logging: {
    level: 'info',
    format: 'json',
    file: './logs/bot.log'
  }
});

// Advanced command with caching
const serverStats = new SlashCommandBuilder()
  .setName('serverstats')
  .setDescription('Get server statistics')
  .setCooldown(30) // 30 second cooldown
  .setExecute(async (interaction) => {
    const guildId = interaction.guildId!;
    const cacheKey = `stats:${guildId}`;
    
    // Try to get from cache first
    let stats = await client.cache.get(cacheKey);
    
    if (!stats) {
      // Calculate stats if not cached
      const guild = interaction.guild!;
      stats = {
        memberCount: guild.memberCount,
        channelCount: guild.channels.cache.size,
        roleCount: guild.roles.cache.size,
        emojiCount: guild.emojis.cache.size,
        boostLevel: guild.premiumTier,
        boostCount: guild.premiumSubscriptionCount
      };
      
      // Cache for 5 minutes
      await client.cache.set(cacheKey, stats, 300000);
    }
    
    const embed = {
      title: `📊 Server Statistics`,
      fields: [
        { name: '👥 Members', value: stats.memberCount.toString(), inline: true },
        { name: '📝 Channels', value: stats.channelCount.toString(), inline: true },
        { name: '🎭 Roles', value: stats.roleCount.toString(), inline: true },
        { name: '😀 Emojis', value: stats.emojiCount.toString(), inline: true },
        { name: '🚀 Boost Level', value: stats.boostLevel.toString(), inline: true },
        { name: '💎 Boosts', value: stats.boostCount.toString(), inline: true }
      ],
      color: 0x5865F2,
      footer: { text: 'Stats cached for 5 minutes' }
    };
    
    await interaction.reply({ embeds: [embed] });
  });

client.commands.register(serverStats);

// Error handling
client.on('error', (error) => {
  console.error('Client error:', error);
});

client.on('shardError', (error, shardId) => {
  console.error(`Shard ${shardId} error:`, error);
});

client.on('rateLimited', (rateLimitData) => {
  console.warn('Rate limited:', rateLimitData);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await client.disconnect();
  process.exit(0);
});

client.connect();
\`\`\`

## Real-World Examples

### Music Bot

\`\`\`typescript
import { AstriumClient, GatewayIntentBits, SlashCommandBuilder } from 'astrium.js';

class MusicBot {
  private client: AstriumClient;
  private queues = new Map();

  constructor() {
    this.client = new AstriumClient({
      token: process.env.DISCORD_TOKEN!,
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
    });

    this.setupCommands();
  }

  private setupCommands() {
    const playCommand = new SlashCommandBuilder()
      .setName('play')
      .setDescription('Play a song')
      .addStringOption(option =>
        option.setName('query')
          .setDescription('Song name or URL')
          .setRequired(true)
      )
      .setExecute(async (interaction) => {
        const query = interaction.options.getString('query')!;
        const member = interaction.member;
        
        if (!member?.voice?.channel) {
          return interaction.reply('❌ You need to be in a voice channel!');
        }

        // Music playing logic here
        await interaction.reply(`🎵 Playing: ${query}`);
      });

    this.client.commands.register(playCommand);
  }

  start() {
    this.client.connect();
  }
}

const bot = new MusicBot();
bot.start();
\`\`\`

### Ticket System

\`\`\`typescript
import { AstriumClient, GatewayIntentBits, SlashCommandBuilder } from 'astrium.js';

class TicketSystem {
  private client: AstriumClient;

  constructor() {
    this.client = new AstriumClient({
      token: process.env.DISCORD_TOKEN!,
      intents: [GatewayIntentBits.Guilds]
    });

    this.setupCommands();
  }

  private setupCommands() {
    const ticketCommand = new SlashCommandBuilder()
      .setName('ticket')
      .setDescription('Create a support ticket')
      .addStringOption(option =>
        option.setName('reason')
          .setDescription('Reason for the ticket')
          .setRequired(true)
      )
      .setExecute(async (interaction) => {
        const reason = interaction.options.getString('reason')!;
        const guild = interaction.guild!;
        const user = interaction.user;

        // Create ticket channel
        const ticketChannel = await guild.channels.create({
          name: `ticket-${user.username}`,
          type: 'GUILD_TEXT',
          permissionOverwrites: [
            {
              id: guild.id,
              deny: ['VIEW_CHANNEL']
            },
            {
              id: user.id,
              allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
            }
          ]
        });

        await ticketChannel.send(`🎫 Ticket created by ${user}\nReason: ${reason}`);
        await interaction.reply({ content: `Ticket created: ${ticketChannel}`, ephemeral: true });
      });

    this.client.commands.register(ticketCommand);
  }

  start() {
    this.client.connect();
  }
}

const ticketBot = new TicketSystem();
ticketBot.start();
\`\`\`

These examples demonstrate the flexibility and power of Astrium.js for building various types of Discord bots. Each example showcases different features and patterns you can use in your own projects.
