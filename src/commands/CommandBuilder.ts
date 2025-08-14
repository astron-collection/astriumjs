/**
 * Command builder utilities for easier command creation
 */

import type { SlashCommand, PrefixCommand, SlashCommandOption } from "../types/CommandTypes"
import { SlashCommandOptionType } from "../types/CommandTypes"

export class SlashCommandBuilder {
  private command: Partial<SlashCommand> = {}

  /**
   * Set command name
   */
  setName(name: string): this {
    this.command.name = name
    return this
  }

  /**
   * Set command description
   */
  setDescription(description: string): this {
    this.command.description = description
    return this
  }

  /**
   * Add a string option
   */
  addStringOption(
    name: string,
    description: string,
    options: { required?: boolean; choices?: Array<{ name: string; value: string }> } = {},
  ): this {
    return this.addOption({
      name,
      description,
      type: SlashCommandOptionType.STRING,
      required: options.required,
      choices: options.choices,
    })
  }

  /**
   * Add an integer option
   */
  addIntegerOption(
    name: string,
    description: string,
    options: { required?: boolean; minValue?: number; maxValue?: number } = {},
  ): this {
    return this.addOption({
      name,
      description,
      type: SlashCommandOptionType.INTEGER,
      required: options.required,
      // TODO: Add min/max value support
    })
  }

  /**
   * Add a boolean option
   */
  addBooleanOption(name: string, description: string, required = false): this {
    return this.addOption({
      name,
      description,
      type: SlashCommandOptionType.BOOLEAN,
      required,
    })
  }

  /**
   * Add a user option
   */
  addUserOption(name: string, description: string, required = false): this {
    return this.addOption({
      name,
      description,
      type: SlashCommandOptionType.USER,
      required,
    })
  }

  /**
   * Add a channel option
   */
  addChannelOption(name: string, description: string, required = false): this {
    return this.addOption({
      name,
      description,
      type: SlashCommandOptionType.CHANNEL,
      required,
    })
  }

  /**
   * Add a role option
   */
  addRoleOption(name: string, description: string, required = false): this {
    return this.addOption({
      name,
      description,
      type: SlashCommandOptionType.ROLE,
      required,
    })
  }

  /**
   * Add a generic option
   */
  private addOption(option: SlashCommandOption): this {
    if (!this.command.options) {
      this.command.options = []
    }
    this.command.options.push(option)
    return this
  }

  /**
   * Set required permissions
   */
  setPermissions(permissions: string[]): this {
    this.command.permissions = permissions
    return this
  }

  /**
   * Set guild only
   */
  setGuildOnly(guildOnly = true): this {
    this.command.guildOnly = guildOnly
    return this
  }

  /**
   * Set owner only
   */
  setOwnerOnly(ownerOnly = true): this {
    this.command.ownerOnly = ownerOnly
    return this
  }

  /**
   * Set cooldown in seconds
   */
  setCooldown(seconds: number): this {
    this.command.cooldown = seconds
    return this
  }

  /**
   * Set execute function
   */
  setExecute(execute: SlashCommand["execute"]): this {
    this.command.execute = execute
    return this
  }

  /**
   * Build the slash command
   */
  build(): SlashCommand {
    if (!this.command.name) {
      throw new Error("Slash command name is required")
    }
    if (!this.command.description) {
      throw new Error("Slash command description is required")
    }
    if (!this.command.execute) {
      throw new Error("Slash command execute function is required")
    }

    return this.command as SlashCommand
  }
}

export class PrefixCommandBuilder {
  private command: Partial<PrefixCommand> = {}

  /**
   * Set command name
   */
  setName(name: string): this {
    this.command.name = name
    return this
  }

  /**
   * Set command description
   */
  setDescription(description: string): this {
    this.command.description = description
    return this
  }

  /**
   * Set command aliases
   */
  setAliases(aliases: string[]): this {
    this.command.aliases = aliases
    return this
  }

  /**
   * Set required permissions
   */
  setPermissions(permissions: string[]): this {
    this.command.permissions = permissions
    return this
  }

  /**
   * Set guild only
   */
  setGuildOnly(guildOnly = true): this {
    this.command.guildOnly = guildOnly
    return this
  }

  /**
   * Set owner only
   */
  setOwnerOnly(ownerOnly = true): this {
    this.command.ownerOnly = ownerOnly
    return this
  }

  /**
   * Set cooldown in seconds
   */
  setCooldown(seconds: number): this {
    this.command.cooldown = seconds
    return this
  }

  /**
   * Set execute function
   */
  setExecute(execute: PrefixCommand["execute"]): this {
    this.command.execute = execute
    return this
  }

  /**
   * Build the prefix command
   */
  build(): PrefixCommand {
    if (!this.command.name) {
      throw new Error("Prefix command name is required")
    }
    if (!this.command.description) {
      throw new Error("Prefix command description is required")
    }
    if (!this.command.execute) {
      throw new Error("Prefix command execute function is required")
    }

    return this.command as PrefixCommand
  }
}
