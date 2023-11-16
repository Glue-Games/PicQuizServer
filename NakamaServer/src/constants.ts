
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
const StatsValueKey = "public"
let nextBotTimer : number = DurationAddBots * TickRate;

const MessagesLogic: { [opCode: number]: (message: nkruntime.MatchMessage, state: GameState, dispatcher: nkruntime.MatchDispatcher, nakama: nkruntime.Nakama, logger: nkruntime.Logger) => void } =
{
    3: matchStart,
    4: botJoined,
    5: gameLoaded
}
