"use strict";
const JoinOrCreateMatchRpc = "JoinOrCreateMatchRpc";
const PlayGameRpc = "PlayGameRpc";
const LogicLoadedLoggerInfo = "Custom logic loaded.";
const MatchModuleName = "match";
function InitModule(ctx, logger, nk, initializer) {
    initializer.registerAfterAuthenticateDevice(afterAuthenticateDeviceFn);
    initializer.registerRpc(PlayGameRpc, playGame);
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
const afterAuthenticateDeviceFn = function (ctx, logger, nk, data, req) {
    afterAuthenticateDevice(ctx, logger, nk, data, req);
};
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
let playGame = function (context, logger, nakama, payload) {
    if (!context.userId) {
        throw Error("No user ID in context");
    }
    if (payload) {
        throw Error("No input allowed");
    }
    var response = {};
    var result = JSON.stringify(response);
    return result;
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
        endMatch: false
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
        let player = {
            presence: presence,
            displayName: account.user.displayName,
            avatar: account.user.avatarUrl,
            isHost: false,
            playerNumber: -1
        };
        let nextPlayerNumber = getNextPlayerNumber(gameState.players);
        gameState.players[nextPlayerNumber] = player;
        gameState.loaded[nextPlayerNumber] = false;
        gameState.playersWins[nextPlayerNumber] = 0;
        if (player.presence.sessionId) {
            logger.info("Real Player joined %v", player.displayName);
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
    if (gameState.countdown > 0) {
        gameState.countdown--;
        if (gameState.countdown == 0) {
            gameState.roundDeclaredWins = [];
            gameState.roundDeclaredDraw = [];
            gameState.countdown = DurationRoundResults * TickRate;
            gameState.scene = 3 /* Scene.Lobby */;
            dispatcher.broadcastMessage(10 /* OperationCode.ChangeScene */, JSON.stringify(gameState.scene));
        }
    }
}
function matchLoopLobby(gameState, nakama, dispatcher, logger) {
    //Add bots here
    if (gameState.countdown > 0 && getPlayersCount(gameState.players) > 0) {
        gameState.countdown--;
        if (gameState.countdown <= nextBotTimer) {
            if (gameState.players.length < MaxPlayers) {
                //prevent joining from this point
                dispatcher.matchLabelUpdate(JSON.stringify({ open: false }));
                dispatcher.broadcastMessage(3 /* OperationCode.AddBot */, null);
            }
            nextBotTimer -= TickRate;
        }
        if (gameState.countdown <= 0) {
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
let beforeChannelJoin = function (ctx, logger, nk, envelope) {
    var _a;
    // If the channel join is a DirectMessage type, check to see if the user is friends with the recipient first
    if (envelope.channelJoin.type == 2 /* nkruntime.ChanType.DirectMessage */) {
        const result = nk.friendsList(ctx.userId, undefined, 0, undefined);
        const filtered = (_a = result === null || result === void 0 ? void 0 : result.friends) === null || _a === void 0 ? void 0 : _a.filter(function (friend) {
            var _a;
            return ((_a = friend === null || friend === void 0 ? void 0 : friend.user) === null || _a === void 0 ? void 0 : _a.userId) == envelope.channelJoin.target;
        });
        if ((filtered === null || filtered === void 0 ? void 0 : filtered.length) == 0) {
            throw new Error("You cannot direct message someone you are not friends with.");
        }
    }
    return envelope;
};
let afterAuthenticateDevice = function (ctx, logger, nk, data, request) {
    if (!data.created) {
        logger.info("%s already exists", ctx.userId);
        // Account already exists.
        return;
    }
    //Add initial wallet values to user
    let changeset = {
        "coins": 500,
        "lives": 5
    };
    updateWallet(nk, ctx.userId, changeset, {});
    var initialState = {
        "playerLevel": 1,
        "playerExperience": 0,
        "stageLevel": 1
    };
    storeUserStats(nk, logger, ctx.userId, initialState);
    logger.info("%s account Initialized", ctx.userId);
};
const currencyCoinKeyName = 'coins';
const currencyLivesKeyName = 'lives';
const rpcAddUserCoins = function (ctx, logger, nakama) {
    //TODO modify how much coins to be added
    return "";
};
function updateWallet(nk, userId, changeset, metadata) {
    let result = nk.walletUpdate(userId, changeset, metadata, true);
    return result;
}
function storeUserStats(nk, logger, userId, stats) {
    try {
        nk.storageWrite([
            {
                collection: StatsCollectionKey,
                key: StatsValueKey,
                userId: userId,
                value: stats,
                permissionRead: StatsPermissionRead,
                permissionWrite: StatsPermissionWrite,
            }
        ]);
    }
    catch (error) {
        logger.error('storageWrite error');
        throw error;
    }
}
const TickRate = 16;
const DurationLobby = 10;
const DurationAddBots = 3;
const DurationRoundResults = 5;
const DurationBattleEnding = 3;
const NecessaryWins = 3;
const MaxPlayers = 4;
const PlayerNotFound = -1;
const CollectionUser = "User";
const KeyTrophies = "Trophies";
const StatsPermissionRead = 2;
const StatsPermissionWrite = 0;
const StatsCollectionKey = "stats";
const StatsValueKey = "public";
let nextBotTimer = DurationAddBots * TickRate;
const MessagesLogic = {
    3: matchStart,
    4: botJoined,
    5: gameLoaded
};
