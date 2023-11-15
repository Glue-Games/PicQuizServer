class MatchData
{
    tickRate : number = 0;
    duration : DurationInfo = 
    {
        lobby :  0,
        roundResults : 0
    };
    minPlayers : number = 0;
    maxPlayers : number = 0;
}
   

interface DurationInfo
{
    lobby: number
    roundResults: number
}

