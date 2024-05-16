interface MatchLabel
{
    open: boolean
}

interface GameState
{
    players: Player[],
    realPlayers: Player[]
    loaded: boolean[]
    level: GameLevel,
    playersWins: number[]
    roundDeclaredWins: number[][]
    roundDeclaredDraw: number[]
    scene: Scene
    countdown: number
    endMatch: boolean
    isSolo: boolean
}

interface GameLevel
{
    level: number,
    caption: string,
    category: string
}

interface Player
{
    presence: nkruntime.Presence
    playerProfile: PlayerProfile
    playerIndex: number
    isHost: boolean
}

interface PlayerProfile
{
    name: string
    username: string
    country: string
    state: string
    avatarUrl: string
}

interface TimeRemainingData
{
    time: number
}

interface PlayerWonData
{
    tick: number
    playerIndex: number
}

interface DrawData
{
    tick: number
}

interface TrophiesData
{
    amount: number
}
