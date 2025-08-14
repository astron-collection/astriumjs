# API Reference

Complete API documentation for Astrium.js classes, methods, and types.

## Table of Contents

- [AstriumClient](#astriumclient)
- [Command System](#command-system)
- [Event System](#event-system)
- [Plugin System](#plugin-system)
- [Cache System](#cache-system)
- [REST Manager](#rest-manager)
- [WebSocket Manager](#websocket-manager)
- [Types](#types)

## AstriumClient

The main client class for interacting with Discord.

### Constructor

\`\`\`typescript
new AstriumClient(options: AstriumClientOptions)
\`\`\`

#### Parameters

- `options` - Configuration options for the client

#### Example

\`\`\`typescript
const client = new AstriumClient({
  token: 'your-bot-token',
  intents: [GatewayIntentBits.Guilds],
  cache: { provider: 'memory' }
});
\`\`\`

### Properties

#### `client.user`
- **Type**: `User | null`
- **Description**: The bot's user object when logged in

#### `client.commands`
- **Type**: `CommandManager`
- **Description**: Command manager instance for registering and handling commands

#### `client.events`
- **Type**: `EventManager`
- **Description**: Event manager for handling Discord events

#### `client.plugins`
- **Type**: `PluginManager`
- **Description**: Plugin manager for loading and managing plugins

#### `client.cache`
- **Type**: `CacheManager`
- **Description**: Cache manager for storing and retrieving cached data

#### `client.rest`
- **Type**: `RESTManager`
- **Description**: REST manager for making API requests

#### `client.ws`
- **Type**: `WebSocketManager`
- **Description**: WebSocket manager for gateway connections

### Methods

#### `connect()`
\`\`\`typescript
connect(): Promise<void>
\`\`\`
Connects the client to Discord.

#### `disconnect()`
\`\`\`typescript
disconnect(): Promise<void>
\`\`\`
Disconnects the client from Discord.

#### `on(event, listener)`
\`\`\`typescript
on<K extends keyof ClientEvents>(event: K, listener: ClientEvents[K]): this
\`\`\`
Registers an event listener.

#### `once(event, listener)`
\`\`\`typescript
once<K extends keyof ClientEvents>(event: K, listener: ClientEvents[K]): this
\`\`\`
Registers a one-time event listener.

#### `off(event, listener)`
\`\`\`typescript
off<K extends keyof ClientEvents>(event: K, listener: ClientEvents[K]): this
\`\`\`
Removes an event listener.

#### `emit(event, ...args)`
\`\`\`typescript
emit<K extends keyof ClientEvents>(event: K, ...args: Parameters<ClientEvents[K]>): boolean
\`\`\`
Emits an event.

### Events

#### `ready`
Emitted when the client is ready to start working.
\`\`\`typescript
client.on('ready', (user: User) => {
  console.log(`Logged in as ${user.username}`);
});
\`\`\`

#### `messageCreate`
Emitted when a message is created.
\`\`\`typescript
client.on('messageCreate', (message: Message) => {
  console.log(`Message: ${message.content}`);
});
\`\`\`

#### `interactionCreate`
Emitted when an interaction is created.
\`\`\`typescript
client.on('interactionCreate', (interaction: Interaction) => {
  if (interaction.isCommand()) {
    // Handle command interaction
  }
});
\`\`\`

#### `error`
Emitted when an error occurs.
\`\`\`typescript
client.on('error', (error: Error) => {
  console.error('Client error:', error);
});
\`\`\`

## Command System

The command system handles both slash commands and prefix commands.

### CommandManager

#### `register(command)`
\`\`\`typescript
register(command: Command): Promise<void>
\`\`\`
Registers a command with Discord.

#### `unregister(name)`
\`\`\`typescript
unregister(name: string): Promise<void>
\`\`\`
Unregisters a command.

#### `get(name)`
\`\`\`typescript
get(name: string): Command | undefined
\`\`\`
Gets a registered command by name.

#### `getAll()`
\`\`\`typescript
getAll(): Command[]
\`\`\`
Gets all registered commands.

### SlashCommandBuilder

Builder for creating slash commands.

\`\`\`typescript
const command = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong!')
  .addStringOption(option =>
    option.setName('message')
      .setDescription('Custom message')
      .setRequired(false)
  )
  .setExecute(async (interaction) => {
    const message = interaction.options.getString('message') || 'Pong!';
    await interaction.reply(message);
  });
\`\`\`

#### Methods

##### `setName(name)`
Sets the command name.

##### `setDescription(description)`
Sets the command description.

##### `addStringOption(builder)`
Adds a string option to the command.

##### `addIntegerOption(builder)`
Adds an integer option to the command.

##### `addBooleanOption(builder)`
Adds a boolean option to the command.

##### `addUserOption(builder)`
Adds a user option to the command.

##### `addChannelOption(builder)`
Adds a channel option to the command.

##### `addRoleOption(builder)`
Adds a role option to the command.

##### `setExecute(handler)`
Sets the command execution handler.

##### `setPermissions(permissions)`
Sets required permissions for the command.

##### `setCooldown(seconds)`
Sets a cooldown for the command.

### PrefixCommandBuilder

Builder for creating prefix commands.

\`\`\`typescript
const command = new PrefixCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong!')
  .setAliases(['p', 'pong'])
  .setExecute(async (message, args) => {
    await message.reply('Pong!');
  });
\`\`\`

## Event System

The event system provides advanced event handling with filters and middleware.

### EventManager

#### `addFilter(filter)`
\`\`\`typescript
addFilter(filter: EventFilter): void
\`\`\`
Adds an event filter.

#### `addMiddleware(middleware)`
\`\`\`typescript
addMiddleware(middleware: EventMiddleware): void
\`\`\`
Adds event middleware.

#### `removeFilter(filter)`
\`\`\`typescript
removeFilter(filter: EventFilter): void
\`\`\`
Removes an event filter.

#### `removeMiddleware(middleware)`
\`\`\`typescript
removeMiddleware(middleware: EventMiddleware): void
\`\`\`
Removes event middleware.

### EventFilter

Create custom event filters:

\`\`\`typescript
const guildFilter = new EventFilter()
  .setName('guild-only')
  .setCondition((event, data) => {
    return event === 'messageCreate' && data.guildId !== null;
  });

client.events.addFilter(guildFilter);
\`\`\`

### EventMiddleware

Create custom event middleware:

\`\`\`typescript
const loggingMiddleware: EventMiddleware = {
  name: 'logging',
  priority: 1,
  execute: async (event, data, next) => {
    console.log(`Event: ${event}`);
    await next();
  }
};

client.events.addMiddleware(loggingMiddleware);
\`\`\`

## Plugin System

The plugin system allows you to extend Astrium.js functionality.

### PluginManager

#### `load(plugin)`
\`\`\`typescript
load(plugin: Plugin): Promise<void>
\`\`\`
Loads a plugin.

#### `unload(name)`
\`\`\`typescript
unload(name: string): Promise<void>
\`\`\`
Unloads a plugin.

#### `get(name)`
\`\`\`typescript
get(name: string): Plugin | undefined
\`\`\`
Gets a loaded plugin by name.

#### `getAll()`
\`\`\`typescript
getAll(): Plugin[]
\`\`\`
Gets all loaded plugins.

### BasePlugin

Base class for creating plugins:

\`\`\`typescript
import { BasePlugin } from 'astrium.js';

export class MyPlugin extends BasePlugin {
  constructor() {
    super({
      name: 'my-plugin',
      version: '1.0.0',
      description: 'My custom plugin'
    });
  }

  async onLoad() {
    console.log('Plugin loaded!');
  }

  async onUnload() {
    console.log('Plugin unloaded!');
  }
}
\`\`\`

## Cache System

The cache system provides efficient data storage and retrieval.

### CacheManager

#### `get(key)`
\`\`\`typescript
get<T>(key: string): Promise<T | null>
\`\`\`
Gets a value from the cache.

#### `set(key, value, ttl?)`
\`\`\`typescript
set<T>(key: string, value: T, ttl?: number): Promise<void>
\`\`\`
Sets a value in the cache.

#### `delete(key)`
\`\`\`typescript
delete(key: string): Promise<void>
\`\`\`
Deletes a value from the cache.

#### `clear()`
\`\`\`typescript
clear(): Promise<void>
\`\`\`
Clears all cached values.

### EntityCache

Specialized cache for Discord entities:

\`\`\`typescript
// Cache a user
await client.cache.entities.users.set(user.id, user);

// Get a cached user
const cachedUser = await client.cache.entities.users.get(userId);

// Cache with TTL
await client.cache.entities.guilds.set(guild.id, guild, 300000); // 5 minutes
\`\`\`

## REST Manager

The REST manager handles HTTP requests to Discord's API.

### RESTManager

#### `get(route, options?)`
\`\`\`typescript
get<T>(route: string, options?: RequestOptions): Promise<T>
\`\`\`
Makes a GET request.

#### `post(route, data?, options?)`
\`\`\`typescript
post<T>(route: string, data?: any, options?: RequestOptions): Promise<T>
\`\`\`
Makes a POST request.

#### `put(route, data?, options?)`
\`\`\`typescript
put<T>(route: string, data?: any, options?: RequestOptions): Promise<T>
\`\`\`
Makes a PUT request.

#### `patch(route, data?, options?)`
\`\`\`typescript
patch<T>(route: string, data?: any, options?: RequestOptions): Promise<T>
\`\`\`
Makes a PATCH request.

#### `delete(route, options?)`
\`\`\`typescript
delete<T>(route: string, options?: RequestOptions): Promise<T>
\`\`\`
Makes a DELETE request.

## WebSocket Manager

The WebSocket manager handles the gateway connection to Discord.

### WebSocketManager

#### `connect()`
\`\`\`typescript
connect(): Promise<void>
\`\`\`
Connects to the Discord gateway.

#### `disconnect()`
\`\`\`typescript
disconnect(): Promise<void>
\`\`\`
Disconnects from the Discord gateway.

#### `send(data)`
\`\`\`typescript
send(data: GatewayPayload): void
\`\`\`
Sends data through the gateway.

## Types

### AstriumClientOptions

\`\`\`typescript
interface AstriumClientOptions {
  token: string;
  intents: GatewayIntents[];
  cache?: CacheOptions;
  sharding?: ShardingOptions;
  commands?: CommandOptions;
  logging?: LoggingOptions;
  rest?: RESTOptions;
  ws?: WebSocketOptions;
}
\`\`\`

### Command

\`\`\`typescript
interface Command {
  name: string;
  description: string;
  type: 'slash' | 'prefix';
  options?: CommandOption[];
  permissions?: string[];
  cooldown?: number;
  execute: CommandExecuteFunction;
}
\`\`\`

### Plugin

\`\`\`typescript
interface Plugin {
  metadata: PluginMetadata;
  onLoad?(): Promise<void>;
  onUnload?(): Promise<void>;
  onReady?(): Promise<void>;
  hooks?: PluginHook[];
}
\`\`\`

For complete type definitions, see the [TypeScript definitions](https://github.com/astrium-js/astrium/blob/main/src/types/).
