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
    isTutorial: boolean
}

interface Player
{
    presence: nkruntime.Presence
    playerProfileData: PlayerProfileData
    playerNumber: number
    isHost: boolean
}

interface PlayerProfileData
{
    name: string
    nickname: string
    country: string
    state: string
    age: number
    profession: string
    hobbies: string[]
    avatar: string
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
