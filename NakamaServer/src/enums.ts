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
    StartMatch = 3,         // raised the host starts the game
    GameLoaded = 4,         // raised when a player from the match has loaded the game scene
    GameReady = 5,          // raised when all players are ready to load the game
    PlayerInput = 6,
    PlayerWon = 7,
    ChangeScene = 8 
}
