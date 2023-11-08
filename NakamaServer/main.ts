// let InitModule: nkruntime.InitModule =
const JoinOrCreateMatchRpc = "JoinOrCreateMatchRpc";
const MatchModuleName = "match";

function InitModule(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer) {
    initializer.registerRpc('healthcheck', rpcHealthCheck);
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
    logger.info("Hello World!");
}