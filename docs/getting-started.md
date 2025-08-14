# Getting Started with Astrium.js

This guide will help you get up and running with Astrium.js quickly.

## Installation

### Using npm
\`\`\`bash
npm install astrium.js
\`\`\`

### Using yarn
\`\`\`bash
yarn add astrium.js
\`\`\`

### Using pnpm
\`\`\`bash
pnpm add astrium.js
\`\`\`

## Prerequisites

- Node.js 18.0.0 or higher
- A Discord application and bot token
- Basic knowledge of JavaScript/TypeScript and Discord's API

## Creating Your First Bot

### 1. Set up your project

Create a new directory and initialize your project:

\`\`\`bash
mkdir my-discord-bot
cd my-discord-bot
npm init -y
npm install astrium.js
\`\`\`

### 2. Create your bot file

Create a file called `bot.js` (or `bot.ts` for TypeScript):

\`\`\`javascript
import { AstriumClient, GatewayIntentBits } from 'astrium.js';

const client = new AstriumClient({
  token: 'YOUR_BOT_TOKEN',
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Event listener for when the bot is ready
client.on('ready', (user) => {
  console.log(`Logged in as ${user.username}!`);
});

// Event listener for messages
client.on('messageCreate', (message) => {
  if (message.content === '!ping') {
    message.reply('Pong!');
  }
});

// Connect to Discord
client.connect();
\`\`\`

### 3. Get your bot token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select an existing one
3. Go to the "Bot" section
4. Copy your bot token
5. Replace `'YOUR_BOT_TOKEN'` in your code with your actual token

### 4. Run your bot

\`\`\`bash
node bot.js
\`\`\`

## Basic Bot Setup with TypeScript

For TypeScript users, here's a more comprehensive setup:

\`\`\`typescript
import { 
  AstriumClient, 
  GatewayIntentBits, 
  SlashCommandBuilder,
  type AstriumClientOptions 
} from 'astrium.js';

const clientOptions: AstriumClientOptions = {
  token: process.env.DISCORD_TOKEN!,
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  cache: {
    provider: 'memory',
    ttl: 300000, // 5 minutes
    maxSize: 1000
  },
  logging: {
    level: 'info',
    format: 'pretty'
  }
};

const client = new AstriumClient(clientOptions);

// Register a slash command
const pingCommand = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong!')
  .setExecute(async (interaction) => {
    await interaction.reply('Pong!');
  });

client.commands.register(pingCommand);

// Event handlers
client.on('ready', (user) => {
  console.log(`${user.username} is online!`);
});

client.on('error', (error) => {
  console.error('Client error:', error);
});

// Connect to Discord
client.connect().catch(console.error);
\`\`\`

## Environment Variables

It's recommended to use environment variables for sensitive data:

Create a `.env` file:
\`\`\`
DISCORD_TOKEN=your_bot_token_here
GUILD_ID=your_test_guild_id
\`\`\`

Install dotenv:
\`\`\`bash
npm install dotenv
\`\`\`

Load environment variables:
\`\`\`javascript
import 'dotenv/config';
import { AstriumClient } from 'astrium.js';

const client = new AstriumClient({
  token: process.env.DISCORD_TOKEN,
  // ... other options
});
\`\`\`

## Next Steps

Now that you have a basic bot running, you can explore more advanced features:

- [Command System](./api-reference.md#command-system) - Learn about slash and prefix commands
- [Event Handling](./api-reference.md#event-system) - Handle Discord events with filters and middleware
- [Plugin System](./plugin-development.md) - Extend your bot with plugins
- [Caching](./advanced-usage.md#caching) - Optimize performance with caching
- [Examples](./examples.md) - See more complex bot examples

## Common Issues

### Bot not responding to commands
- Make sure your bot has the necessary permissions in your Discord server
- Check that you've included the required intents
- Verify your bot token is correct

### TypeScript errors
- Ensure you're using Node.js 18+ with TypeScript 4.8+
- Install type definitions: `npm install @types/node`

### Connection issues
- Check your internet connection
- Verify Discord's API status
- Ensure your token hasn't been regenerated
