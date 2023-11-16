let beforeChannelJoin : nkruntime.RtBeforeHookFunction<nkruntime.EnvelopeChannelJoin> = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, envelope: nkruntime.EnvelopeChannelJoin) : nkruntime.EnvelopeChannelJoin | void {
    // If the channel join is a DirectMessage type, check to see if the user is friends with the recipient first
    if (envelope.channelJoin.type == nkruntime.ChanType.DirectMessage) 
    {
      const result = nk.friendsList(ctx.userId, undefined, 0, undefined);
      const filtered = result?.friends?.filter(function (friend) {
        return friend?.user?.userId == envelope.channelJoin.target;
      });
  
      if (filtered?.length == 0) {
        throw new Error("You cannot direct message someone you are not friends with.");
      }
    }
  
    return envelope;
  };

  let afterAuthenticateDevice: nkruntime.AfterHookFunction<nkruntime.Session, nkruntime.AuthenticateDeviceRequest> = 
  function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, data: nkruntime.Session, request: nkruntime.AuthenticateDeviceRequest) 
  {
    if (!data.created) {
        logger.info("%s already exists", ctx.userId);
        // Account already exists.
        return
    }

    //Add initial wallet values to user
    let changeset =
    {
        "coins":500,
        "lives":5
    }
    updateWallet(nk, ctx.userId, changeset,{});

    var initialState ={
        "playerLevel" : 1,
        "playerExperience" : 0,
        "stageLevel" : 1
    }
    storeUserStats(nk, logger, ctx.userId, initialState);
    
    logger.info("%s account Initialized", ctx.userId);
  };