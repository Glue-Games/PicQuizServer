const enum Scene
{
    Splash = 0,
    Initializer = 1,
    Login = 2,
    Lobby = 3,
    Game = 4
}

const enum OperationCode
{
    Players = 0,
    PlayerJoined = 1,       // raised when a player joins the match
    HostChanged = 2,        // raised when a host disconnected and is replaced
    AddBot = 3,             // raised when a bot should join the game
    BotJoined = 4,         // raised the host starts the game
    StartMatch = 5,         // raised the host starts the game
    GameLoaded = 6,         // raised when a player from the match has loaded the game scene
    GameReady = 7,          // raised when all players are ready to load the game
    PlayerInput = 8,
    PlayerWon = 9,
    ChangeScene = 10,
    Tutorial = 11, 
}
