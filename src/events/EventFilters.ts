/**
 * Common event filters for Astrium.js
 */

export class EventFilters {
  /**
   * Filter events by guild ID
   */
  static byGuild(guildId: string) {
    return (data: any) => data?.guild_id === guildId
  }

  /**
   * Filter events by channel ID
   */
  static byChannel(channelId: string) {
    return (data: any) => data?.channel_id === channelId
  }

  /**
   * Filter events by user ID
   */
  static byUser(userId: string) {
    return (data: any) => data?.author?.id === userId || data?.user?.id === userId
  }

  /**
   * Filter out bot users
   */
  static noBots() {
    return (data: any) => !data?.author?.bot && !data?.user?.bot
  }

  /**
   * Filter by message content pattern
   */
  static messageContent(pattern: string | RegExp) {
    const regex = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern
    return (data: any) => data?.content && regex.test(data.content)
  }

  /**
   * Filter by user permissions
   */
  static hasPermission(permission: string) {
    return (data: any) => {
      // This would need proper permission checking logic
      // For now, just a placeholder
      return true
    }
  }

  /**
   * Filter by channel type
   */
  static channelType(type: number) {
    return (data: any) => data?.channel?.type === type
  }

  /**
   * Combine multiple filters with AND logic
   */
  static and(...filters: Array<(...args: any[]) => boolean>) {
    return (...args: any[]) => filters.every((filter) => filter(...args))
  }

  /**
   * Combine multiple filters with OR logic
   */
  static or(...filters: Array<(...args: any[]) => boolean>) {
    return (...args: any[]) => filters.some((filter) => filter(...args))
  }

  /**
   * Negate a filter
   */
  static not(filter: (...args: any[]) => boolean) {
    return (...args: any[]) => !filter(...args)
  }
}
