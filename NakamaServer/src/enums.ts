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
    PlayerJoined = 1,
    HostChanged = 2,
    StartMatch = 3,
    GameLoaded = 4,
    PlayerInput = 5,
    PlayerWon = 6,
    ChangeScene = 7 
}
