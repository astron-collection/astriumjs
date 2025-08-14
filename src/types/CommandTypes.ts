/**
 * Command system type definitions
 */

export interface CommandContext {
  /** The client instance */
  client: any // Will be properly typed later

  /** Command arguments */
  args: string[]

  /** Raw message content */
  content: string

  /** Reply to the command */
  reply(content: string | MessageOptions): Promise<any>
}

export interface SlashCommandContext extends CommandContext {
  /** Interaction data */
  interaction: any // Will be properly typed later

  /** Get option value by name */
  getOption<T = any>(name: string): T | null

  /** Defer the reply */
  defer(ephemeral?: boolean): Promise<void>

  /** Edit the reply */
  editReply(content: string | MessageOptions): Promise<any>
}

export interface PrefixCommandContext extends CommandContext {
  /** Message that triggered the command */
  message: any // Will be properly typed later

  /** Command prefix used */
  prefix: string
}

export interface MessageOptions {
  content?: string
  embeds?: any[]
  components?: any[]
  ephemeral?: boolean
}

export interface Command {
  /** Command name */
  name: string

  /** Command description */
  description: string

  /** Command aliases */
  aliases?: string[]

  /** Required permissions */
  permissions?: string[]

  /** Guild only command */
  guildOnly?: boolean

  /** Owner only command */
  ownerOnly?: boolean

  /** Command cooldown in seconds */
  cooldown?: number
}

export interface SlashCommand extends Command {
  /** Slash command options */
  options?: SlashCommandOption[]

  /** Execute function */
  execute(context: SlashCommandContext): Promise<void>
}

export interface PrefixCommand extends Command {
  /** Execute function */
  execute(context: PrefixCommandContext): Promise<void>
}

export interface SlashCommandOption {
  name: string
  description: string
  type: SlashCommandOptionType
  required?: boolean
  choices?: SlashCommandChoice[]
  options?: SlashCommandOption[]
}

export interface SlashCommandChoice {
  name: string
  value: string | number
}

export enum SlashCommandOptionType {
  SUB_COMMAND = 1,
  SUB_COMMAND_GROUP = 2,
  STRING = 3,
  INTEGER = 4,
  BOOLEAN = 5,
  USER = 6,
  CHANNEL = 7,
  ROLE = 8,
  MENTIONABLE = 9,
  NUMBER = 10,
  ATTACHMENT = 11,
}
