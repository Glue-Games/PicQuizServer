interface MatchLabel
{
    open: boolean
}

interface GameState
{
    players: Player[]
    loaded: boolean[]
    playersWins: number[]
    roundDeclaredWins: number[][]
    roundDeclaredDraw: number[]
    scene: Scene
    countdown: number
    endMatch: boolean
}

interface Player
{
    presence: nkruntime.Presence
    displayName: string
    avatar: string
    isHost: boolean
    playerNumber: number
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
