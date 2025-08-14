# Plugin Development Guide

Learn how to create powerful plugins for Astrium.js to extend your bot's functionality.

## Table of Contents

- [Plugin Basics](#plugin-basics)
- [Creating Your First Plugin](#creating-your-first-plugin)
- [Plugin Lifecycle](#plugin-lifecycle)
- [Plugin Hooks](#plugin-hooks)
- [Advanced Plugin Features](#advanced-plugin-features)
- [Plugin Distribution](#plugin-distribution)
- [Best Practices](#best-practices)

## Plugin Basics

Plugins in Astrium.js are modular extensions that can add commands, event handlers, and other functionality to your bot without modifying the core code. They provide a clean way to organize features and share functionality between projects.

### Key Benefits

- **Modularity**: Keep features separated and organized
- **Reusability**: Share plugins across different bots
- **Hot-swapping**: Load and unload plugins without restarting
- **Isolation**: Plugins run in isolated contexts
- **Dependency Management**: Handle plugin dependencies automatically

## Creating Your First Plugin

### Basic Plugin Structure

\`\`\`typescript
import { BasePlugin, SlashCommandBuilder } from 'astrium.js';

export class HelloWorldPlugin extends BasePlugin {
  constructor() {
    super({
      name: 'hello-world',
      version: '1.0.0',
      description: 'A simple hello world plugin',
      author: 'Your Name',
      dependencies: [] // Other plugins this depends on
    });
  }

  async onLoad() {
    console.log('Hello World plugin loaded!');
    
    // Register a command
    const helloCommand = new SlashCommandBuilder()
      .setName('hello')
      .setDescription('Say hello!')
      .setExecute(async (interaction) => {
        await interaction.reply('Hello from the plugin! 👋');
      });

    this.client.commands.register(helloCommand);
  }

  async onUnload() {
    console.log('Hello World plugin unloaded!');
    
    // Clean up the command
    this.client.commands.unregister('hello');
  }
}
\`\`\`

### Loading the Plugin

\`\`\`typescript
import { AstriumClient } from 'astrium.js';
import { HelloWorldPlugin } from './plugins/HelloWorldPlugin.js';

const client = new AstriumClient({
  token: process.env.DISCORD_TOKEN!,
  intents: [/* your intents */]
});

// Load the plugin
client.plugins.load(new HelloWorldPlugin());

client.connect();
\`\`\`

## Plugin Lifecycle

Plugins have several lifecycle methods that are called at different stages:

### `onLoad()`
Called when the plugin is first loaded. Use this to:
- Register commands
- Set up event listeners
- Initialize plugin state
- Validate configuration

\`\`\`typescript
async onLoad() {
  // Validate required configuration
  if (!this.config.apiKey) {
    throw new Error('API key is required for this plugin');
  }

  // Initialize plugin state
  this.cache = new Map();
  
  // Register commands
  this.registerCommands();
  
  // Set up event listeners
  this.client.on('messageCreate', this.handleMessage.bind(this));
}
\`\`\`

### `onUnload()`
Called when the plugin is unloaded. Use this to:
- Unregister commands
- Remove event listeners
- Clean up resources
- Save state if needed

\`\`\`typescript
async onUnload() {
  // Unregister commands
  this.client.commands.unregister('mycommand');
  
  // Remove event listeners
  this.client.off('messageCreate', this.handleMessage);
  
  // Clean up resources
  this.cache.clear();
  
  // Save state if needed
  await this.saveState();
}
\`\`\`

### `onReady()`
Called when the client is ready. Use this for:
- Final initialization
- Scheduling tasks
- Connecting to external services

\`\`\`typescript
async onReady() {
  // Schedule periodic tasks
  setInterval(() => {
    this.performPeriodicTask();
  }, 60000); // Every minute

  // Connect to external API
  await this.connectToExternalService();
}
\`\`\`

## Plugin Hooks

Hooks allow plugins to intercept and modify bot behavior at specific points.

### Available Hooks

#### `beforeCommandExecute`
Called before a command is executed.

\`\`\`typescript
export class CommandLoggerPlugin extends BasePlugin {
  constructor() {
    super({
      name: 'command-logger',
      version: '1.0.0',
      description: 'Logs all command executions'
    });
  }

  async onLoad() {
    this.addHook('beforeCommandExecute', this.logCommand.bind(this));
  }

  private async logCommand(context: any) {
    console.log(`Command executed: ${context.command.name} by ${context.user.username}`);
    
    // You can modify the context or prevent execution
    if (context.user.id === 'banned-user-id') {
      context.cancel = true; // Prevent command execution
      await context.interaction.reply('You are banned from using commands.');
    }
  }
}
\`\`\`

#### `afterCommandExecute`
Called after a command is executed.

\`\`\`typescript
private async afterCommand(context: any) {
  // Log command completion
  console.log(`Command ${context.command.name} completed in ${context.executionTime}ms`);
  
  // Update usage statistics
  await this.updateCommandStats(context.command.name);
}
\`\`\`

#### `beforeEventProcess`
Called before an event is processed.

\`\`\`typescript
private async beforeEvent(event: string, data: any) {
  // Filter events
  if (event === 'messageCreate' && data.author.bot) {
    return false; // Skip processing bot messages
  }
  
  // Modify event data
  data.processedAt = Date.now();
  
  return true; // Continue processing
}
\`\`\`

## Advanced Plugin Features

### Plugin Configuration

\`\`\`typescript
interface MyPluginConfig {
  apiKey: string;
  maxRequests: number;
  enableLogging: boolean;
}

export class AdvancedPlugin extends BasePlugin {
  private config: MyPluginConfig;

  constructor(config: MyPluginConfig) {
    super({
      name: 'advanced-plugin',
      version: '2.0.0',
      description: 'An advanced plugin with configuration'
    });
    
    this.config = config;
  }

  async onLoad() {
    // Validate configuration
    this.validateConfig();
    
    // Use configuration
    if (this.config.enableLogging) {
      this.setupLogging();
    }
  }

  private validateConfig() {
    if (!this.config.apiKey) {
      throw new Error('API key is required');
    }
    
    if (this.config.maxRequests <= 0) {
      throw new Error('maxRequests must be positive');
    }
  }
}
\`\`\`

### Plugin Dependencies

\`\`\`typescript
export class DependentPlugin extends BasePlugin {
  constructor() {
    super({
      name: 'dependent-plugin',
      version: '1.0.0',
      description: 'A plugin that depends on others',
      dependencies: ['database-plugin', 'logging-plugin']
    });
  }

  async onLoad() {
    // Access other plugins
    const dbPlugin = this.client.plugins.get('database-plugin');
    const logPlugin = this.client.plugins.get('logging-plugin');
    
    if (!dbPlugin || !logPlugin) {
      throw new Error('Required dependencies not loaded');
    }
    
    // Use other plugins' functionality
    this.db = dbPlugin.getDatabase();
    this.logger = logPlugin.getLogger();
  }
}
\`\`\`

### Plugin Communication

\`\`\`typescript
export class PublisherPlugin extends BasePlugin {
  async onLoad() {
    // Emit custom events
    this.client.emit('plugin:data-updated', { 
      plugin: this.metadata.name,
      data: 'some data'
    });
  }
}

export class SubscriberPlugin extends BasePlugin {
  async onLoad() {
    // Listen for custom events
    this.client.on('plugin:data-updated', this.handleDataUpdate.bind(this));
  }

  private handleDataUpdate(event: any) {
    console.log(`Data updated by ${event.plugin}:`, event.data);
  }
}
\`\`\`

### Persistent Storage

\`\`\`typescript
export class StatefulPlugin extends BasePlugin {
  private state: Map<string, any> = new Map();

  async onLoad() {
    // Load saved state
    await this.loadState();
  }

  async onUnload() {
    // Save state before unloading
    await this.saveState();
  }

  private async loadState() {
    try {
      const savedState = await this.client.cache.get(`plugin:${this.metadata.name}:state`);
      if (savedState) {
        this.state = new Map(savedState);
      }
    } catch (error) {
      console.error('Failed to load plugin state:', error);
    }
  }

  private async saveState() {
    try {
      await this.client.cache.set(
        `plugin:${this.metadata.name}:state`,
        Array.from(this.state.entries()),
        0 // No expiration
      );
    } catch (error) {
      console.error('Failed to save plugin state:', error);
    }
  }
}
\`\`\`

## Plugin Distribution

### NPM Package Structure

\`\`\`
my-astrium-plugin/
├── package.json
├── README.md
├── src/
│   ├── index.ts
│   └── MyPlugin.ts
├── dist/
│   ├── index.js
│   └── MyPlugin.js
└── types/
    ├── index.d.ts
    └── MyPlugin.d.ts
\`\`\`

### package.json

\`\`\`json
{
  "name": "astrium-plugin-example",
  "version": "1.0.0",
  "description": "An example plugin for Astrium.js",
  "main": "dist/index.js",
  "types": "types/index.d.ts",
  "keywords": ["astrium", "discord", "bot", "plugin"],
  "peerDependencies": {
    "astrium.js": "^1.0.0"
  },
  "files": [
    "dist",
    "types",
    "README.md"
  ]
}
\`\`\`

### Plugin Registry

\`\`\`typescript
// index.ts - Main export file
export { MyPlugin } from './MyPlugin.js';

// For auto-discovery
export const pluginInfo = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My awesome plugin',
  main: 'MyPlugin'
};
\`\`\`

## Best Practices

### 1. Error Handling

\`\`\`typescript
export class RobustPlugin extends BasePlugin {
  async onLoad() {
    try {
      await this.initialize();
    } catch (error) {
      this.logger.error('Failed to initialize plugin:', error);
      throw error; // Re-throw to prevent loading
    }
  }

  private async handleCommand(interaction: any) {
    try {
      await this.processCommand(interaction);
    } catch (error) {
      this.logger.error('Command error:', error);
      await interaction.reply('An error occurred while processing your command.');
    }
  }
}
\`\`\`

### 2. Resource Management

\`\`\`typescript
export class ResourceAwarePlugin extends BasePlugin {
  private intervals: NodeJS.Timeout[] = [];
  private connections: any[] = [];

  async onLoad() {
    // Track intervals
    const interval = setInterval(() => {
      this.performTask();
    }, 60000);
    this.intervals.push(interval);

    // Track connections
    const connection = await this.createConnection();
    this.connections.push(connection);
  }

  async onUnload() {
    // Clean up intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];

    // Close connections
    await Promise.all(this.connections.map(conn => conn.close()));
    this.connections = [];
  }
}
\`\`\`

### 3. Configuration Validation

\`\`\`typescript
export class ConfigurablePlugin extends BasePlugin {
  constructor(config: any) {
    super({
      name: 'configurable-plugin',
      version: '1.0.0',
      description: 'A plugin with validated configuration'
    });

    this.validateConfig(config);
    this.config = config;
  }

  private validateConfig(config: any) {
    const schema = {
      apiKey: { type: 'string', required: true },
      timeout: { type: 'number', min: 1000, max: 30000 },
      features: { type: 'array', items: 'string' }
    };

    // Validate against schema
    this.validateSchema(config, schema);
  }
}
\`\`\`

### 4. Testing Plugins

\`\`\`typescript
// tests/MyPlugin.test.ts
import { AstriumClient } from 'astrium.js';
import { MyPlugin } from '../src/MyPlugin.js';

describe('MyPlugin', () => {
  let client: AstriumClient;
  let plugin: MyPlugin;

  beforeEach(() => {
    client = new AstriumClient({ token: 'test-token' });
    plugin = new MyPlugin();
  });

  test('should load successfully', async () => {
    await expect(client.plugins.load(plugin)).resolves.not.toThrow();
  });

  test('should register commands', async () => {
    await client.plugins.load(plugin);
    expect(client.commands.get('mycommand')).toBeDefined();
  });

  test('should handle unload', async () => {
    await client.plugins.load(plugin);
    await expect(client.plugins.unload('my-plugin')).resolves.not.toThrow();
  });
});
\`\`\`

### 5. Documentation

Always include comprehensive documentation:

\`\`\`typescript
/**
 * Example Plugin for Astrium.js
 * 
 * This plugin demonstrates best practices for plugin development.
 * 
 * @example
 * \`\`\`typescript
 * import { ExamplePlugin } from 'astrium-plugin-example';
 * 
 * const plugin = new ExamplePlugin({
 *   apiKey: 'your-api-key',
 *   timeout: 5000
 * });
 * 
 * client.plugins.load(plugin);
 * ```
 */
export class ExamplePlugin extends BasePlugin {
  /**
   * Creates a new ExamplePlugin instance
   * @param config - Plugin configuration
   */
  constructor(config: ExamplePluginConfig) {
    // Implementation
  }
}
\`\`\`

By following these guidelines and examples, you can create powerful, maintainable plugins that extend Astrium.js functionality while following best practices for error handling, resource management, and code organization.
