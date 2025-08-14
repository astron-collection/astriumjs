/**
 * Discord API response types
 */

export interface APIUser {
  id: string
  username: string
  discriminator: string
  global_name?: string | null
  avatar?: string | null
  bot?: boolean
  system?: boolean
  mfa_enabled?: boolean
  banner?: string | null
  accent_color?: number | null
  locale?: string
  verified?: boolean
  email?: string | null
  flags?: number
  premium_type?: number
  public_flags?: number
  avatar_decoration?: string | null
}

export interface APIGuild {
  id: string
  name: string
  icon?: string | null
  icon_hash?: string | null
  splash?: string | null
  discovery_splash?: string | null
  owner?: boolean
  owner_id: string
  permissions?: string
  region?: string | null
  afk_channel_id?: string | null
  afk_timeout: number
  widget_enabled?: boolean
  widget_channel_id?: string | null
  verification_level: number
  default_message_notifications: number
  explicit_content_filter: number
  roles: APIRole[]
  emojis: APIEmoji[]
  features: string[]
  mfa_level: number
  application_id?: string | null
  system_channel_id?: string | null
  system_channel_flags: number
  rules_channel_id?: string | null
  max_presences?: number | null
  max_members?: number
  vanity_url_code?: string | null
  description?: string | null
  banner?: string | null
  premium_tier: number
  premium_subscription_count?: number
  preferred_locale: string
  public_updates_channel_id?: string | null
  max_video_channel_users?: number
  max_stage_video_channel_users?: number
  approximate_member_count?: number
  approximate_presence_count?: number
  welcome_screen?: APIWelcomeScreen
  nsfw_level: number
  stickers?: APISticker[]
  premium_progress_bar_enabled: boolean
  safety_alerts_channel_id?: string | null
}

export interface APIChannel {
  id: string
  type: number
  guild_id?: string
  position?: number
  permission_overwrites?: APIOverwrite[]
  name?: string | null
  topic?: string | null
  nsfw?: boolean
  last_message_id?: string | null
  bitrate?: number
  user_limit?: number
  rate_limit_per_user?: number
  recipients?: APIUser[]
  icon?: string | null
  owner_id?: string
  application_id?: string
  managed?: boolean
  parent_id?: string | null
  last_pin_timestamp?: string | null
  rtc_region?: string | null
  video_quality_mode?: number
  message_count?: number
  member_count?: number
  thread_metadata?: APIThreadMetadata
  member?: APIThreadMember
  default_auto_archive_duration?: number
  permissions?: string
  flags?: number
  total_message_sent?: number
  available_tags?: APIForumTag[]
  applied_tags?: string[]
  default_reaction_emoji?: APIDefaultReaction | null
  default_thread_rate_limit_per_user?: number
  default_sort_order?: number | null
  default_forum_layout?: number
}

export interface APIMessage {
  id: string
  channel_id: string
  author: APIUser
  content: string
  timestamp: string
  edited_timestamp?: string | null
  tts: boolean
  mention_everyone: boolean
  mentions: APIUser[]
  mention_roles: string[]
  mention_channels?: APIChannelMention[]
  attachments: APIAttachment[]
  embeds: APIEmbed[]
  reactions?: APIReaction[]
  nonce?: number | string
  pinned: boolean
  webhook_id?: string
  type: number
  activity?: APIMessageActivity
  application?: APIApplication
  application_id?: string
  message_reference?: APIMessageReference
  flags?: number
  referenced_message?: APIMessage | null
  interaction?: APIMessageInteraction
  thread?: APIChannel
  components?: APIActionRow[]
  sticker_items?: APIStickerItem[]
  stickers?: APISticker[]
  position?: number
  role_subscription_data?: APIRoleSubscriptionData
}

export interface APIRole {
  id: string
  name: string
  color: number
  hoist: boolean
  icon?: string | null
  unicode_emoji?: string | null
  position: number
  permissions: string
  managed: boolean
  mentionable: boolean
  tags?: APIRoleTags
  flags: number
}

export interface APIEmoji {
  id?: string | null
  name?: string | null
  roles?: string[]
  user?: APIUser
  require_colons?: boolean
  managed?: boolean
  animated?: boolean
  available?: boolean
}

// Placeholder interfaces for complex types
export type APIOverwrite = {}
export type APIThreadMetadata = {}
export type APIThreadMember = {}
export type APIForumTag = {}
export type APIDefaultReaction = {}
export type APIChannelMention = {}
export type APIAttachment = {}
export type APIEmbed = {}
export type APIReaction = {}
export type APIMessageActivity = {}
export type APIApplication = {}
export type APIMessageReference = {}
export type APIMessageInteraction = {}
export type APIActionRow = {}
export type APIStickerItem = {}
export type APISticker = {}
export type APIRoleSubscriptionData = {}
export type APIRoleTags = {}
export type APIWelcomeScreen = {}

// Application Command Types
export interface APIApplicationCommand {
  id: string
  type?: number
  application_id: string
  guild_id?: string
  name: string
  name_localizations?: Record<string, string> | null
  description: string
  description_localizations?: Record<string, string> | null
  options?: APIApplicationCommandOption[]
  default_member_permissions?: string | null
  dm_permission?: boolean
  default_permission?: boolean | null
  nsfw?: boolean
  version: string
}

export interface APIApplicationCommandOption {
  type: number
  name: string
  name_localizations?: Record<string, string> | null
  description: string
  description_localizations?: Record<string, string> | null
  required?: boolean
  choices?: APIApplicationCommandOptionChoice[]
  options?: APIApplicationCommandOption[]
  channel_types?: number[]
  min_value?: number
  max_value?: number
  min_length?: number
  max_length?: number
  autocomplete?: boolean
}

export interface APIApplicationCommandOptionChoice {
  name: string
  name_localizations?: Record<string, string> | null
  value: string | number
}

// Interaction Types
export interface APIInteraction {
  id: string
  application_id: string
  type: number
  data?: APIInteractionData
  guild_id?: string
  channel?: APIChannel
  channel_id?: string
  member?: APIGuildMember
  user?: APIUser
  token: string
  version: number
  message?: APIMessage
  app_permissions?: string
  locale?: string
  guild_locale?: string
}

export interface APIInteractionData {
  id?: string
  name?: string
  type?: number
  resolved?: APIInteractionDataResolved
  options?: APIApplicationCommandInteractionDataOption[]
  guild_id?: string
  target_id?: string
}

export type APIInteractionDataResolved = {}
export type APIApplicationCommandInteractionDataOption = {}
export type APIGuildMember = {}
