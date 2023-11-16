const currencyCoinKeyName = 'coins'
const currencyLivesKeyName = 'lives'

const rpcAddUserCoins: nkruntime.RpcFunction = function(ctx: nkruntime.Context, logger: nkruntime.Logger, nakama: nkruntime.Nakama): string 
{
    //TODO modify how much coins to be added
    return "";
}

function updateWallet(nk: nkruntime.Nakama, userId: string, changeset: {[key: string]: any}, metadata: {[key: string]: any}): nkruntime.WalletUpdateResult 
{
    let result = nk.walletUpdate(userId, changeset, metadata, true);
    return result;
}

function storeUserStats(nk: nkruntime.Nakama, logger: nkruntime.Logger, userId: string, stats: PlayerProgressionData) 
{
    try 
    {
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
    catch(error) 
    {
        logger.error('storageWrite error');
        throw error;
    }
}