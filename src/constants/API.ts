/**
 * Discord API constants
 */

export const APIVersion = 10
export const APIBaseURL = `https://discord.com/api/v${APIVersion}`
export const CDNBaseURL = "https://cdn.discordapp.com"
export const GatewayURL = "wss://gateway.discord.gg"

export const Endpoints = {
  // Gateway
  gateway: "/gateway",
  gatewayBot: "/gateway/bot",

  // Applications
  applicationCommands: (applicationId: string) => `/applications/${applicationId}/commands`,
  applicationGuildCommands: (applicationId: string, guildId: string) =>
    `/applications/${applicationId}/guilds/${guildId}/commands`,

  // Interactions
  interactionCallback: (interactionId: string, interactionToken: string) =>
    `/interactions/${interactionId}/${interactionToken}/callback`,

  // Guilds
  guild: (guildId: string) => `/guilds/${guildId}`,
  guilds: "/guilds",

  // Channels
  channel: (channelId: string) => `/channels/${channelId}`,
  channelMessages: (channelId: string) => `/channels/${channelId}/messages`,

  // Users
  user: (userId: string) => `/users/${userId}`,
  currentUser: "/users/@me",
} as const
