/**
 * Discord API route builders
 */

export class Routes {
  // Application Commands
  static applicationCommands(applicationId: string): string {
    return `/applications/${applicationId}/commands`
  }

  static applicationGuildCommands(applicationId: string, guildId: string): string {
    return `/applications/${applicationId}/guilds/${guildId}/commands`
  }

  static applicationCommand(applicationId: string, commandId: string): string {
    return `/applications/${applicationId}/commands/${commandId}`
  }

  static applicationGuildCommand(applicationId: string, guildId: string, commandId: string): string {
    return `/applications/${applicationId}/guilds/${guildId}/commands/${commandId}`
  }

  // Interactions
  static interactionCallback(interactionId: string, interactionToken: string): string {
    return `/interactions/${interactionId}/${interactionToken}/callback`
  }

  static webhookMessage(applicationId: string, interactionToken: string, messageId = "@original"): string {
    return `/webhooks/${applicationId}/${interactionToken}/messages/${messageId}`
  }

  // Channels
  static channel(channelId: string): string {
    return `/channels/${channelId}`
  }

  static channelMessages(channelId: string): string {
    return `/channels/${channelId}/messages`
  }

  static channelMessage(channelId: string, messageId: string): string {
    return `/channels/${channelId}/messages/${messageId}`
  }

  static channelMessageReaction(channelId: string, messageId: string, emoji: string): string {
    return `/channels/${channelId}/messages/${messageId}/reactions/${emoji}`
  }

  static channelMessageOwnReaction(channelId: string, messageId: string, emoji: string): string {
    return `/channels/${channelId}/messages/${messageId}/reactions/${emoji}/@me`
  }

  static channelMessageUserReaction(channelId: string, messageId: string, emoji: string, userId: string): string {
    return `/channels/${channelId}/messages/${messageId}/reactions/${emoji}/${userId}`
  }

  // Guilds
  static guild(guildId: string): string {
    return `/guilds/${guildId}`
  }

  static guildChannels(guildId: string): string {
    return `/guilds/${guildId}/channels`
  }

  static guildMember(guildId: string, userId: string): string {
    return `/guilds/${guildId}/members/${userId}`
  }

  static guildMembers(guildId: string): string {
    return `/guilds/${guildId}/members`
  }

  static guildBan(guildId: string, userId: string): string {
    return `/guilds/${guildId}/bans/${userId}`
  }

  static guildBans(guildId: string): string {
    return `/guilds/${guildId}/bans`
  }

  static guildRoles(guildId: string): string {
    return `/guilds/${guildId}/roles`
  }

  static guildRole(guildId: string, roleId: string): string {
    return `/guilds/${guildId}/roles/${roleId}`
  }

  // Users
  static user(userId: string): string {
    return `/users/${userId}`
  }

  static currentUser(): string {
    return "/users/@me"
  }

  static currentUserGuilds(): string {
    return "/users/@me/guilds"
  }

  static currentUserGuild(guildId: string): string {
    return `/users/@me/guilds/${guildId}`
  }

  // Gateway
  static gateway(): string {
    return "/gateway"
  }

  static gatewayBot(): string {
    return "/gateway/bot"
  }

  // OAuth2
  static oauth2CurrentApplication(): string {
    return "/oauth2/applications/@me"
  }

  static oauth2CurrentAuthorization(): string {
    return "/oauth2/@me"
  }
}
