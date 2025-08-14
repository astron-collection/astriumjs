/**
 * Gateway-related type definitions
 */

export interface GatewayPayload {
  /** Opcode for the payload */
  op: number

  /** Event data */
  d?: any

  /** Sequence number, used for resuming sessions and heartbeats */
  s?: number | null

  /** Event name for Opcode 0 (dispatch) */
  t?: string | null
}

export interface GatewayIdentifyData {
  /** Authentication token */
  token: string

  /** Connection properties */
  properties: {
    os: string
    browser: string
    device: string
  }

  /** Whether this connection supports compression of packets */
  compress?: boolean

  /** Value between 50 and 250, total number of members where the gateway will stop sending offline members in the guild member list */
  large_threshold?: number

  /** Used for Guild Sharding */
  shard?: [number, number]

  /** Presence structure for initial presence information */
  presence?: GatewayPresenceUpdate

  /** Gateway Intents you wish to receive */
  intents: number
}

export interface GatewayPresenceUpdate {
  /** Unix time (in milliseconds) of when the client went idle, or null if the client is not idle */
  since?: number | null

  /** User's activities */
  activities: GatewayActivity[]

  /** User's new status */
  status: "online" | "dnd" | "idle" | "invisible" | "offline"

  /** Whether or not the client is afk */
  afk: boolean
}

export interface GatewayActivity {
  /** Activity's name */
  name: string

  /** Activity type */
  type: number

  /** Stream URL, is validated when type is 1 */
  url?: string | null

  /** Unix timestamp (in milliseconds) of when the activity was added to the user's session */
  created_at: number

  /** Unix timestamps for start and/or end of the game */
  timestamps?: {
    start?: number
    end?: number
  }

  /** Application ID for the game */
  application_id?: string

  /** What the player is currently doing */
  details?: string | null

  /** User's current party status */
  state?: string | null

  /** Emoji used for a custom status */
  emoji?: {
    name: string
    id?: string
    animated?: boolean
  } | null

  /** Information for the current party of the player */
  party?: {
    id?: string
    size?: [number, number]
  }

  /** Images for the presence and their hover texts */
  assets?: {
    large_image?: string
    large_text?: string
    small_image?: string
    small_text?: string
  }

  /** Secrets for Rich Presence joining and spectating */
  secrets?: {
    join?: string
    spectate?: string
    match?: string
  }

  /** Whether or not the activity is an instanced game session */
  instance?: boolean

  /** Activity flags ORd together, describes what the payload includes */
  flags?: number

  /** Custom buttons shown in the Rich Presence (max 2) */
  buttons?: string[]
}

export interface GatewayHello {
  /** Interval (in milliseconds) an app should heartbeat with */
  heartbeat_interval: number
}

export interface GatewayReady {
  /** Gateway version */
  v: number

  /** Information about the user including email */
  user: any // Will be properly typed later

  /** Guilds the user is in */
  guilds: any[] // Will be properly typed later

  /** Used for resuming connections */
  session_id: string

  /** Gateway URL for resuming connections */
  resume_gateway_url: string

  /** Shard information associated with this session, if sent when identifying */
  shard?: [number, number]

  /** Contains id and flags */
  application: {
    id: string
    flags: number
  }
}
