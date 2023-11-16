const JoinOrCreateMatchRpc = "JoinOrCreateMatchRpc";
const PlayGameRpc = "PlayGameRpc";
const LogicLoadedLoggerInfo = "Custom logic loaded.";
const MatchModuleName = "match";

function InitModule(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer)
{
    initializer.registerAfterAuthenticateDevice(afterAuthenticateDeviceFn);
    initializer.registerRpc(PlayGameRpc, playGame)
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

const afterAuthenticateDeviceFn: nkruntime.AfterHookFunction<nkruntime.Session, nkruntime.AuthenticateDeviceRequest> =
function(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.Session, req: nkruntime.AuthenticateDeviceRequest) 
{
    afterAuthenticateDevice(ctx,logger,nk,data,req);
}