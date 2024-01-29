"use strict";
const JoinOrCreateMatchRpc = "JoinOrCreateMatchRpc";
const LogicLoadedLoggerInfo = "Custom logic loaded.";
const MatchModuleName = "match";
function InitModule(ctx, logger, nk, initializer) {
    initializer.registerRpc(JoinOrCreateMatchRpc, joinOrCreateMatch);
    initializer.registerMatch(MatchModuleName, {
        matchInit,
        matchJoinAttempt,
        matchJoin,
        matchLeave,
        matchLoop,
        matchTerminate,
        matchSignal
    });
    logger.info(LogicLoadedLoggerInfo);
}
class MatchData {
    constructor() {
        this.tickRate = 0;
        this.duration = {
            lobby: 0,
            roundResults: 0
        };
        this.minPlayers = 0;
        this.maxPlayers = 0;
    }
}
let joinOrCreateMatch = function (context, logger, nakama, payload) {
    let matches;
    const MatchesLimit = 1;
    const MinimumPlayers = 0;
    var label = { open: true };
    matches = nakama.matchList(MatchesLimit, true, JSON.stringify(label), MinimumPlayers, MaxPlayers - 1);
    if (matches.length > 0)
        return matches[0].matchId;
    return nakama.matchCreate(MatchModuleName);
};
let matchInit = function (context, logger, nakama, params) {
    var label = { open: true };
    var gameState = {
        players: [],
        realPlayers: [],
        loaded: [],
        playersWins: [],
        roundDeclaredWins: [[]],
        roundDeclaredDraw: [],
        scene: 3 /* Scene.Lobby */,
        countdown: DurationLobby * TickRate,
        endMatch: false,
        isTutorial: false
    };
    return {
        state: gameState,
        tickRate: TickRate,
        label: JSON.stringify(label),
    };
};
let matchJoinAttempt = function (context, logger, nakama, dispatcher, tick, state, presence, metadata) {
    let gameState = state;
    return {
        state: gameState,
        accept: gameState.scene == 3 /* Scene.Lobby */,
    };
};
let matchJoin = function (context, logger, nakama, dispatcher, tick, state, presences) {
    let gameState = state;
    if (gameState.scene != 3 /* Scene.Lobby */)
        return { state: gameState };
    let presencesOnMatch = [];
    gameState.realPlayers.forEach(player => { if (player != undefined)
        presencesOnMatch.push(player.presence); });
    for (let presence of presences) {
        var account = nakama.accountGetId(presence.userId);
        let profile = {
            name: account.user.displayName,
            nickname: account.user.username,
            country: account.user.location,
            state: account.user.timezone,
            age: 0,
            profession: "",
            hobbies: [],
            avatar: account.user.avatarUrl
        };
        let player = {
            presence: presence,
            playerProfileData: profile,
            isHost: false,
            playerNumber: -1
        };
        let nextPlayerNumber = getNextPlayerNumber(gameState.players);
        gameState.players[nextPlayerNumber] = player;
        gameState.loaded[nextPlayerNumber] = false;
        gameState.playersWins[nextPlayerNumber] = 0;
        if (player.presence.sessionId) {
            logger.info("Real Player joined %v", player.playerProfileData.name);
            gameState.realPlayers[nextPlayerNumber] = player;
        }
        let hostNumber = getHostNumber(gameState.players);
        //Host assignment
        if (hostNumber != -1)
            if (player.presence.sessionId)
                player.isHost = gameState.players[hostNumber].presence.sessionId == player.presence.sessionId;
            else
                player.isHost = false;
        else
            player.isHost = true;
        player.playerNumber = nextPlayerNumber;
        //Make sure to refresh the player data 
        gameState.players[nextPlayerNumber] = player;
        dispatcher.broadcastMessage(1 /* OperationCode.PlayerJoined */, JSON.stringify(player), presencesOnMatch);
        presencesOnMatch.push(presence);
    }
    dispatcher.broadcastMessage(0 /* OperationCode.Players */, JSON.stringify(gameState.players), presences);
    //gameState.countdown = DurationLobby * TickRate;
    return { state: gameState };
};
let matchLoop = function (context, logger, nakama, dispatcher, tick, state, messages) {
    let gameState = state;
    processMessages(messages, gameState, dispatcher, nakama, logger);
    processMatchLoop(gameState, nakama, dispatcher, logger);
    return gameState.endMatch ? null : { state: gameState };
};
let matchLeave = function (context, logger, nakama, dispatcher, tick, state, presences) {
    let gameState = state;
    let hostLeft = false;
    for (let presence of presences) {
        let realPlayerNumber = getPlayerNumber(gameState.realPlayers, presence.sessionId);
        let playerNumber = getPlayerNumber(gameState.players, presence.sessionId);
        let leftRealPlayer = gameState.realPlayers[realPlayerNumber];
        if (leftRealPlayer.isHost)
            hostLeft = true;
        delete gameState.realPlayers[realPlayerNumber];
        delete gameState.players[playerNumber];
    }
    if (getPlayersCount(gameState.realPlayers) == 0)
        return null;
    else if (hostLeft) {
        let nextPlayerNumber = getFirstPlayerNumber(gameState.realPlayers);
        if (nextPlayerNumber > 0) {
            let nextHost = gameState.realPlayers[nextPlayerNumber];
            nextHost.isHost = true;
            //presences is null so all matches can receive hostchanged code
            dispatcher.broadcastMessage(2 /* OperationCode.HostChanged */, JSON.stringify(nextHost), null);
        }
    }
    return { state: gameState };
};
let matchTerminate = function (context, logger, nakama, dispatcher, tick, state, graceSeconds) {
    return { state };
};
let matchSignal = function (context, logger, nk, dispatcher, tick, state, data) {
    return { state };
};
function processTutorial(message, gameState, dispatcher, nakama) {
    gameState.isTutorial = true;
}
function processMessages(messages, gameState, dispatcher, nakama, logger) {
    for (let message of messages) {
        let opCode = message.opCode;
        if (MessagesLogic.hasOwnProperty(opCode))
            MessagesLogic[opCode](message, gameState, dispatcher, nakama, logger);
        else
            messagesDefaultLogic(message, gameState, dispatcher);
    }
}
function messagesDefaultLogic(message, gameState, dispatcher) {
    dispatcher.broadcastMessage(message.opCode, message.data, null, message.sender);
}
function processMatchLoop(gameState, nakama, dispatcher, logger) {
    switch (gameState.scene) {
        case 4 /* Scene.Game */:
            matchLoopBattle(gameState, nakama, dispatcher);
            break;
        case 3 /* Scene.Lobby */:
            matchLoopLobby(gameState, nakama, dispatcher, logger);
            break;
    }
}
function matchLoopBattle(gameState, nakama, dispatcher) {
    /*
    if (gameState.countdown > 0)
    {
        gameState.countdown--;
        if (gameState.countdown == 0)
        {
            gameState.roundDeclaredWins = [];
            gameState.roundDeclaredDraw = [];
            gameState.countdown = DurationRoundResults * TickRate;
            gameState.scene = Scene.Lobby;
            dispatcher.broadcastMessage(OperationCode.ChangeScene, JSON.stringify(gameState.scene));
        }
    }*/
}
function matchLoopLobby(gameState, nakama, dispatcher, logger) {
    //Add bots here
    let maxPlayersLobby = gameState.isTutorial ? TutorialMaxPlayers : MaxPlayers;
    logger.info("Max players in lobby %v", maxPlayersLobby);
    if (gameState.countdown > 0 && getPlayersCount(gameState.players) > 0) {
        gameState.countdown--;
        if (gameState.countdown <= nextBotTimer) {
            if (gameState.players.length < maxPlayersLobby) {
                //prevent joining from this point
                dispatcher.matchLabelUpdate(JSON.stringify({ open: false }));
                dispatcher.broadcastMessage(3 /* OperationCode.AddBot */, null);
            }
            nextBotTimer -= TickRate;
        }
        if (gameState.countdown <= 0 || getPlayersCount(gameState.players) == maxPlayersLobby) {
            logger.info("Max players reached, command change scene");
            gameState.scene = 4 /* Scene.Game */;
            dispatcher.broadcastMessage(10 /* OperationCode.ChangeScene */, JSON.stringify(gameState.scene));
        }
    }
}
function matchLoopRoundResults(gameState, nakama, dispatcher) {
    if (gameState.countdown > 0) {
        gameState.countdown--;
        if (gameState.countdown == 0) {
            var winner = getWinner(gameState.playersWins, gameState.players);
            if (winner != null) {
                let storageReadRequests = [{
                        collection: CollectionUser,
                        key: KeyTrophies,
                        userId: winner.presence.userId
                    }];
                let result = nakama.storageRead(storageReadRequests);
                var trophiesData = { amount: 0 };
                for (let storageObject of result) {
                    trophiesData = storageObject.value;
                    break;
                }
                trophiesData.amount++;
                let storageWriteRequests = [{
                        collection: CollectionUser,
                        key: KeyTrophies,
                        userId: winner.presence.userId,
                        value: trophiesData
                    }];
                nakama.storageWrite(storageWriteRequests);
                gameState.endMatch = true;
                gameState.scene = 3 /* Scene.Lobby */;
            }
            else {
                gameState.scene = 4 /* Scene.Game */;
            }
            dispatcher.broadcastMessage(10 /* OperationCode.ChangeScene */, JSON.stringify(gameState.scene));
        }
    }
}
function matchStart(message, gameState, dispatcher, nakama) {
    gameState.scene = 4 /* Scene.Game */;
    dispatcher.broadcastMessage(10 /* OperationCode.ChangeScene */, JSON.stringify(gameState.scene));
}
function botJoined(message, gameState, dispatcher, nakama, logger) {
    let botPlayer = JSON.parse(nakama.binaryToString(message.data));
    let botPlayerNumber = getNextPlayerNumber(gameState.players);
    botPlayer.playerNumber = botPlayerNumber;
    gameState.players[botPlayerNumber] = botPlayer;
    logger.info("Bot Joined %v", JSON.stringify(botPlayer));
    dispatcher.broadcastMessage(1 /* OperationCode.PlayerJoined */, JSON.stringify(botPlayer), null);
}
function gameLoaded(message, gameState, dispatcher, nakama) {
    let data = JSON.parse(nakama.binaryToString(message.data));
    let playerNumber = data.playerNumber;
    gameState.loaded[playerNumber] = true;
    if (isPlayersReady(gameState.loaded)) {
        dispatcher.broadcastMessage(7 /* OperationCode.GameReady */, JSON.stringify(gameState));
    }
}
function playerWon(message, gameState, dispatcher, nakama) {
    if (gameState.scene != 4 /* Scene.Game */ || gameState.countdown > 0)
        return;
    let data = JSON.parse(nakama.binaryToString(message.data));
    let tick = data.tick;
    let playerNumber = data.playerNumber;
    if (gameState.roundDeclaredWins[tick] == undefined)
        gameState.roundDeclaredWins[tick] = [];
    if (gameState.roundDeclaredWins[tick][playerNumber] == undefined)
        gameState.roundDeclaredWins[tick][playerNumber] = 0;
    gameState.roundDeclaredWins[tick][playerNumber]++;
    if (gameState.roundDeclaredWins[tick][playerNumber] < getPlayersCount(gameState.players))
        return;
    gameState.playersWins[playerNumber]++;
    gameState.countdown = DurationBattleEnding * TickRate;
    dispatcher.broadcastMessage(message.opCode, message.data, null, message.sender);
}
function draw(message, gameState, dispatcher, nakama) {
    if (gameState.scene != 4 /* Scene.Game */ || gameState.countdown > 0)
        return;
    let data = JSON.parse(nakama.binaryToString(message.data));
    let tick = data.tick;
    if (gameState.roundDeclaredDraw[tick] == undefined)
        gameState.roundDeclaredDraw[tick] = 0;
    gameState.roundDeclaredDraw[tick]++;
    if (gameState.roundDeclaredDraw[tick] < getPlayersCount(gameState.players))
        return;
    gameState.countdown = DurationBattleEnding * TickRate;
    dispatcher.broadcastMessage(message.opCode, message.data, null, message.sender);
}
function getPlayersCount(players) {
    var count = 0;
    for (let playerNumber = 0; playerNumber < MaxPlayers; playerNumber++)
        if (players[playerNumber] != undefined)
            count++;
    return count;
}
function playerObtainedNecessaryWins(playersWins) {
    for (let playerNumber = 0; playerNumber < MaxPlayers; playerNumber++)
        if (playersWins[playerNumber] == NecessaryWins)
            return true;
    return false;
}
function getWinner(playersWins, players) {
    for (let playerNumber = 0; playerNumber < MaxPlayers; playerNumber++)
        if (playersWins[playerNumber] == NecessaryWins)
            return players[playerNumber];
    return null;
}
function getPlayerNumber(players, sessionId) {
    for (let playerNumber = 0; playerNumber < MaxPlayers; playerNumber++)
        if (players[playerNumber] != undefined && players[playerNumber].presence.sessionId == sessionId)
            return playerNumber;
    return PlayerNotFound;
}
function getHostNumber(players) {
    for (let playerNumber = 0; playerNumber < MaxPlayers; playerNumber++)
        if (players[playerNumber] != undefined && players[playerNumber].isHost)
            return playerNumber;
    return PlayerNotFound;
}
function isFirstPlayer(players) {
    if (players.length === 1)
        return true;
    else
        return false;
}
function isPlayersReady(players) {
    for (let playerNumber = 0; playerNumber < MaxPlayers; playerNumber++)
        if (players[playerNumber] == false)
            return false;
    return true;
}
function getNextPlayerNumber(players) {
    for (let playerNumber = 0; playerNumber < MaxPlayers; playerNumber++)
        if (!playerNumberIsUsed(players, playerNumber))
            return playerNumber;
    return PlayerNotFound;
}
function getFirstPlayerNumber(players) {
    for (let playerNumber = 0; playerNumber < MaxPlayers; playerNumber++)
        if (playerNumberIsUsed(players, playerNumber))
            return playerNumber;
    return PlayerNotFound;
}
function playerNumberIsUsed(players, playerNumber) {
    return players[playerNumber] != undefined;
}
const TickRate = 16;
const DurationLobby = 10;
const DurationAddBots = 3;
const DurationRoundResults = 5;
const DurationBattleEnding = 3;
const NecessaryWins = 3;
const MaxPlayers = 2;
const TutorialMaxPlayers = 1;
const PlayerNotFound = -1;
const CollectionUser = "User";
const KeyTrophies = "Trophies";
let nextBotTimer = DurationAddBots * TickRate;
const MessagesLogic = {
    3: matchStart,
    4: botJoined,
    5: gameLoaded,
    11: processTutorial,
};
