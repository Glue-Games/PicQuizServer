interface MatchLabel
{
    open: boolean
}

interface GameState
{
    players: Player[], //Can contain bots
    realPlayers: Player[] //Players with Presence
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

interface PlayerProgressionData
{
    playerLevel: number
    playerExperience: number
    stageLevel: number
}

interface InitializationData
{
    created: boolean
}

interface DrawData
{
    tick: number
}

interface TrophiesData
{
    amount: number
}
