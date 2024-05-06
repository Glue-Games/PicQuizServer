interface MatchLabel
{
    open: boolean
}

interface GameState
{
    players: Player[],
    realPlayers: Player[]
    loaded: boolean[]
    playersWins: number[]
    roundDeclaredWins: number[][]
    roundDeclaredDraw: number[]
    scene: Scene
    countdown: number
    endMatch: boolean
    isSolo: boolean
}

interface Player
{
    presence: nkruntime.Presence
    playerProfile: PlayerProfile
    playerNumber: number
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
    playerNumber: number
}

interface DrawData
{
    tick: number
}

interface TrophiesData
{
    amount: number
}
