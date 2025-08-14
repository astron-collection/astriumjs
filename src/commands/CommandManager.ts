/**
 * Command management system for Astrium.js
 */

import type { AstriumClient } from "../client/AstriumClient"
import type { SlashCommand, PrefixCommand, SlashCommandContext, PrefixCommandContext } from "../types/CommandTypes"
import { AstriumError } from "../errors/AstriumError"
import { Routes } from "../rest/APIRoutes"

export interface CommandManagerOptions {
  /** Default prefix for prefix commands */
  defaultPrefix: string
  /** Whether to register slash commands globally */
  globalSlashCommands: boolean
  /** Guild ID for guild-specific slash commands */
  guildId?: string
  /** Whether to enable case-sensitive prefix commands */
  caseSensitive: boolean
  /** Whether to allow mentions as prefix */
  allowMentionPrefix: boolean
}

export interface CommandCooldown {
  userId: string
  commandName: string
  expiresAt: number
}

export class CommandManager {
  private slashCommands = new Map<string, SlashCommand>()
  private prefixCommands = new Map<string, PrefixCommand>()
  private aliases = new Map<string, string>()
  private cooldowns = new Map<string, CommandCooldown>()
  private options: CommandManagerOptions

  constructor(
    private client: AstriumClient,
    options: Partial<CommandManagerOptions> = {},
  ) {
    this.options = {
      defaultPrefix: "!",
      globalSlashCommands: true,
      caseSensitive: false,
      allowMentionPrefix: true,
      ...options,
    }

    this.setupEventHandlers()
  }

  /**
   * Register a slash command
   */
  async registerSlashCommand(command: SlashCommand): Promise<void> {
    // Validate command
    this.validateSlashCommand(command)

    // Store command locally
    this.slashCommands.set(command.name, command)

    // Register with Discord API
    try {
      const applicationId = this.client.user?.id
      if (!applicationId) {
        throw new AstriumError("Client must be ready before registering slash commands")
      }

      const endpoint = this.options.globalSlashCommands
        ? Routes.applicationCommands(applicationId)
        : Routes.applicationGuildCommands(applicationId, this.options.guildId!)

      const commandData = this.buildSlashCommandData(command)

      await this.client.rest.post(endpoint, { body: commandData })

      this.client.logger.info(`Registered slash command: ${command.name}`)
    } catch (error) {
      this.client.logger.error(`Failed to register slash command ${command.name}:`, error)
      throw error
    }
  }

  /**
   * Register a prefix command
   */
  registerPrefixCommand(command: PrefixCommand): void {
    // Validate command
    this.validatePrefixCommand(command)

    // Store command
    this.prefixCommands.set(command.name, command)

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias, command.name)
      }
    }

    this.client.logger.info(`Registered prefix command: ${command.name}`)
  }

  /**
   * Unregister a slash command
   */
  async unregisterSlashCommand(name: string): Promise<void> {
    const command = this.slashCommands.get(name)
    if (!command) {
      throw new AstriumError(`Slash command '${name}' not found`)
    }

    this.slashCommands.delete(name)

    // TODO: Remove from Discord API
    this.client.logger.info(`Unregistered slash command: ${name}`)
  }

  /**
   * Unregister a prefix command
   */
  unregisterPrefixCommand(name: string): void {
    const command = this.prefixCommands.get(name)
    if (!command) {
      throw new AstriumError(`Prefix command '${name}' not found`)
    }

    this.prefixCommands.delete(name)

    // Remove aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.delete(alias)
      }
    }

    this.client.logger.info(`Unregistered prefix command: ${name}`)
  }

  /**
   * Get a slash command by name
   */
  getSlashCommand(name: string): SlashCommand | undefined {
    return this.slashCommands.get(name)
  }

  /**
   * Get a prefix command by name or alias
   */
  getPrefixCommand(name: string): PrefixCommand | undefined {
    const commandName = this.aliases.get(name) || name
    return this.prefixCommands.get(commandName)
  }

  /**
   * Get all registered slash commands
   */
  getSlashCommands(): SlashCommand[] {
    return Array.from(this.slashCommands.values())
  }

  /**
   * Get all registered prefix commands
   */
  getPrefixCommands(): PrefixCommand[] {
    return Array.from(this.prefixCommands.values())
  }

  /**
   * Handle interaction create event
   */
  private async handleInteraction(interaction: any): Promise<void> {
    if (interaction.type !== 2) return // Not an application command

    const commandName = interaction.data?.name
    if (!commandName) return

    const command = this.getSlashCommand(commandName)
    if (!command) {
      this.client.logger.warn(`Unknown slash command: ${commandName}`)
      return
    }

    try {
      // Check permissions
      if (!(await this.checkPermissions(command, interaction))) {
        await this.sendErrorResponse(interaction, "You don't have permission to use this command.")
        return
      }

      // Check cooldown
      if (!(await this.checkCooldown(command, interaction.user?.id || interaction.member?.user?.id))) {
        await this.sendErrorResponse(interaction, "This command is on cooldown.")
        return
      }

      // Create context
      const context = this.createSlashCommandContext(interaction, command)

      // Execute command
      await command.execute(context)

      this.client.logger.debug(`Executed slash command: ${commandName}`)
    } catch (error) {
      this.client.logger.error(`Error executing slash command ${commandName}:`, error)
      await this.sendErrorResponse(interaction, "An error occurred while executing this command.")
    }
  }

  /**
   * Handle message create event for prefix commands
   */
  private async handleMessage(message: any): Promise<void> {
    if (message.author?.bot) return

    const prefix = await this.getPrefix(message)
    if (!prefix) return

    const content = message.content.slice(prefix.length).trim()
    const args = content.split(/\s+/)
    const commandName = args.shift()

    if (!commandName) return

    const command = this.getPrefixCommand(this.options.caseSensitive ? commandName : commandName.toLowerCase())
    if (!command) return

    try {
      // Check permissions
      if (!(await this.checkPermissions(command, message))) {
        await this.sendMessageReply(message, "You don't have permission to use this command.")
        return
      }

      // Check cooldown
      if (!(await this.checkCooldown(command, message.author.id))) {
        await this.sendMessageReply(message, "This command is on cooldown.")
        return
      }

      // Create context
      const context = this.createPrefixCommandContext(message, command, args, prefix)

      // Execute command
      await command.execute(context)

      this.client.logger.debug(`Executed prefix command: ${commandName}`)
    } catch (error) {
      this.client.logger.error(`Error executing prefix command ${commandName}:`, error)
      await this.sendMessageReply(message, "An error occurred while executing this command.")
    }
  }

  /**
   * Get prefix for a message
   */
  private async getPrefix(message: any): Promise<string | null> {
    const content = message.content

    // Check default prefix
    if (content.startsWith(this.options.defaultPrefix)) {
      return this.options.defaultPrefix
    }

    // Check mention prefix
    if (this.options.allowMentionPrefix && this.client.user) {
      const mentionPrefix = `<@${this.client.user.id}>`
      const mentionPrefixNick = `<@!${this.client.user.id}>`

      if (content.startsWith(mentionPrefix)) {
        return mentionPrefix
      }
      if (content.startsWith(mentionPrefixNick)) {
        return mentionPrefixNick
      }
    }

    return null
  }

  /**
   * Check command permissions
   */
  private async checkPermissions(command: SlashCommand | PrefixCommand, context: any): Promise<boolean> {
    // Guild only check
    if (command.guildOnly && !context.guild_id) {
      return false
    }

    // Owner only check
    if (command.ownerOnly) {
      // TODO: Implement owner check
      return true
    }

    // Permission check
    if (command.permissions && command.permissions.length > 0) {
      // TODO: Implement permission checking
      return true
    }

    return true
  }

  /**
   * Check command cooldown
   */
  private async checkCooldown(command: SlashCommand | PrefixCommand, userId: string): Promise<boolean> {
    if (!command.cooldown || command.cooldown <= 0) return true

    const cooldownKey = `${command.name}:${userId}`
    const existingCooldown = this.cooldowns.get(cooldownKey)

    if (existingCooldown && Date.now() < existingCooldown.expiresAt) {
      return false
    }

    // Set new cooldown
    this.cooldowns.set(cooldownKey, {
      userId,
      commandName: command.name,
      expiresAt: Date.now() + command.cooldown * 1000,
    })

    // Clean up expired cooldowns
    this.cleanupCooldowns()

    return true
  }

  /**
   * Clean up expired cooldowns
   */
  private cleanupCooldowns(): void {
    const now = Date.now()
    for (const [key, cooldown] of this.cooldowns.entries()) {
      if (now >= cooldown.expiresAt) {
        this.cooldowns.delete(key)
      }
    }
  }

  /**
   * Create slash command context
   */
  private createSlashCommandContext(interaction: any, command: SlashCommand): SlashCommandContext {
    return {
      client: this.client,
      interaction,
      args: [], // Slash commands use options instead
      content: "",
      reply: async (content) => {
        return this.sendInteractionResponse(interaction, content)
      },
      getOption: (name) => {
        const option = interaction.data?.options?.find((opt: any) => opt.name === name)
        return option?.value || null
      },
      defer: async (ephemeral = false) => {
        await this.client.rest.post(Routes.interactionCallback(interaction.id, interaction.token), {
          body: {
            type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
            data: ephemeral ? { flags: 64 } : {},
          },
        })
      },
      editReply: async (content) => {
        return this.client.rest.patch(Routes.webhookMessage(this.client.user!.id, interaction.token), {
          body: typeof content === "string" ? { content } : content,
        })
      },
    }
  }

  /**
   * Create prefix command context
   */
  private createPrefixCommandContext(
    message: any,
    command: PrefixCommand,
    args: string[],
    prefix: string,
  ): PrefixCommandContext {
    return {
      client: this.client,
      message,
      args,
      content: message.content,
      prefix,
      reply: async (content) => {
        return this.sendMessageReply(message, content)
      },
    }
  }

  /**
   * Send interaction response
   */
  private async sendInteractionResponse(interaction: any, content: any): Promise<any> {
    const data = typeof content === "string" ? { content } : content

    return this.client.rest.post(Routes.interactionCallback(interaction.id, interaction.token), {
      body: {
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data,
      },
    })
  }

  /**
   * Send message reply
   */
  private async sendMessageReply(message: any, content: any): Promise<any> {
    const data = typeof content === "string" ? { content } : content

    return this.client.rest.post(Routes.channelMessages(message.channel_id), {
      body: {
        ...data,
        message_reference: {
          message_id: message.id,
        },
      },
    })
  }

  /**
   * Send error response
   */
  private async sendErrorResponse(interaction: any, message: string): Promise<void> {
    try {
      await this.sendInteractionResponse(interaction, {
        content: message,
        flags: 64, // EPHEMERAL
      })
    } catch (error) {
      this.client.logger.error("Failed to send error response:", error)
    }
  }

  /**
   * Validate slash command
   */
  private validateSlashCommand(command: SlashCommand): void {
    if (!command.name || command.name.length < 1 || command.name.length > 32) {
      throw new AstriumError("Slash command name must be between 1 and 32 characters")
    }

    if (!command.description || command.description.length < 1 || command.description.length > 100) {
      throw new AstriumError("Slash command description must be between 1 and 100 characters")
    }

    if (!/^[\w-]{1,32}$/.test(command.name)) {
      throw new AstriumError("Slash command name must only contain alphanumeric characters, dashes, and underscores")
    }
  }

  /**
   * Validate prefix command
   */
  private validatePrefixCommand(command: PrefixCommand): void {
    if (!command.name || command.name.length === 0) {
      throw new AstriumError("Prefix command name is required")
    }

    if (!command.description) {
      throw new AstriumError("Prefix command description is required")
    }
  }

  /**
   * Build slash command data for Discord API
   */
  private buildSlashCommandData(command: SlashCommand): any {
    return {
      name: command.name,
      description: command.description,
      options: command.options || [],
      default_member_permissions: command.permissions ? command.permissions.join(",") : null,
      dm_permission: !command.guildOnly,
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.client.on("interactionCreate", (interaction) => {
      this.handleInteraction(interaction)
    })

    this.client.on("messageCreate", (message) => {
      this.handleMessage(message)
    })
  }

  /**
   * Register multiple slash commands at once
   */
  async registerSlashCommands(commands: SlashCommand[]): Promise<void> {
    for (const command of commands) {
      await this.registerSlashCommand(command)
    }
  }

  /**
   * Register multiple prefix commands at once
   */
  registerPrefixCommands(commands: PrefixCommand[]): void {
    for (const command of commands) {
      this.registerPrefixCommand(command)
    }
  }

  /**
   * Generate help information
   */
  generateHelp(): { slash: SlashCommand[]; prefix: PrefixCommand[] } {
    return {
      slash: this.getSlashCommands(),
      prefix: this.getPrefixCommands(),
    }
  }
}
