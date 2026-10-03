// High-fidelity mock data for instant demo mode & preview

export const MOCK_PLAYERS = [
  {
    id: "mock-faker-kr1",
    gameName: "Hide on bush",
    tagLine: "KR1",
    region: "kr",
    puuid: "mock-puuid-faker",
    profileIconId: 6,
    summonerLevel: 673,
    isTracking: true,
    status: "IN_GAME",
    lastChecked: Date.now() - 15000,
    statusHistory: [
      {
        timestamp: Date.now() - 18 * 60 * 1000,
        status: "IN_GAME",
        championId: 103, // Ahri
        queueId: 420,
        message: "Entered Ranked Solo match as Ahri",
      },
      {
        timestamp: Date.now() - 55 * 60 * 1000,
        status: "NOT_IN_GAME",
        message: "Match concluded (Defeat - 32m)",
      },
    ],
    currentGame: {
      gameId: 712390141,
      mapId: 11,
      gameMode: "CLASSIC",
      gameType: "MATCHED_GAME",
      gameQueueConfigId: 420, // Ranked Solo
      gameStartTime: Date.now() - 18 * 60 * 1000 - 42 * 1000, // 18m 42s ago
      gameLength: 1122,
      participants: [
        // Blue Team (Team 100)
        {
          teamId: 100,
          spell1Id: 4, // Flash
          spell2Id: 12, // Teleport
          championId: 897, // K'Sante
          riotId: "Zeus#KR1",
          profileIconId: 548,
          bot: false,
        },
        {
          teamId: 100,
          spell1Id: 4,
          spell2Id: 11, // Smite
          championId: 64, // Lee Sin
          riotId: "Oner#KR1",
          profileIconId: 588,
          bot: false,
        },
        {
          teamId: 100,
          spell1Id: 4,
          spell2Id: 14, // Ignite
          championId: 103, // Ahri (Tracked Player)
          riotId: "Hide on bush#KR1",
          profileIconId: 6,
          bot: false,
        },
        {
          teamId: 100,
          spell1Id: 4,
          spell2Id: 7, // Heal
          championId: 222, // Jinx
          riotId: "Gumayusi#KR1",
          profileIconId: 539,
          bot: false,
        },
        {
          teamId: 100,
          spell1Id: 4,
          spell2Id: 3, // Exhaust
          championId: 412, // Thresh
          riotId: "Keria#KR1",
          profileIconId: 541,
          bot: false,
        },
        // Red Team (Team 200)
        {
          teamId: 200,
          spell1Id: 4,
          spell2Id: 12,
          championId: 24, // Jax
          riotId: "Kiin#KR2",
          profileIconId: 501,
          bot: false,
        },
        {
          teamId: 200,
          spell1Id: 4,
          spell2Id: 11,
          championId: 233, // Briar
          riotId: "Canyon#KR1",
          profileIconId: 512,
          bot: false,
        },
        {
          teamId: 200,
          spell1Id: 4,
          spell2Id: 12,
          championId: 238, // Zed
          riotId: "Chovy#KR1",
          profileIconId: 520,
          bot: false,
        },
        {
          teamId: 200,
          spell1Id: 4,
          spell2Id: 6, // Ghost
          championId: 81, // Ezreal
          riotId: "Peyz#KR1",
          profileIconId: 523,
          bot: false,
        },
        {
          teamId: 200,
          spell1Id: 4,
          spell2Id: 14,
          championId: 99, // Lux
          riotId: "Lehends#KR1",
          profileIconId: 525,
          bot: false,
        },
      ],
    },
  },
  {
    id: "mock-caps-euw1",
    gameName: "G2 Caps",
    tagLine: "EUW",
    region: "euw1",
    puuid: "mock-puuid-caps",
    profileIconId: 517,
    summonerLevel: 512,
    isTracking: true,
    status: "IN_GAME",
    lastChecked: Date.now() - 25000,
    statusHistory: [
      {
        timestamp: Date.now() - 7 * 60 * 1000,
        status: "IN_GAME",
        championId: 517, // Sylas
        queueId: 450, // ARAM
        message: "Entered ARAM match as Sylas",
      },
    ],
    currentGame: {
      gameId: 881230491,
      mapId: 12,
      gameMode: "ARAM",
      gameType: "MATCHED_GAME",
      gameQueueConfigId: 450, // ARAM
      gameStartTime: Date.now() - 7 * 60 * 1000 - 15 * 1000, // 7m 15s ago
      gameLength: 435,
      participants: [
        {
          teamId: 100,
          spell1Id: 4,
          spell2Id: 32, // Snowball
          championId: 517, // Sylas
          riotId: "G2 Caps#EUW",
          profileIconId: 517,
          bot: false,
        },
        {
          teamId: 100,
          spell1Id: 4,
          spell2Id: 32,
          championId: 157, // Yasuo
          riotId: "BrokenBlade#EUW",
          profileIconId: 518,
          bot: false,
        },
        {
          teamId: 100,
          spell1Id: 4,
          spell2Id: 7,
          championId: 22, // Ashe
          riotId: "Hans Sama#EUW",
          profileIconId: 519,
          bot: false,
        },
        {
          teamId: 100,
          spell1Id: 4,
          spell2Id: 14,
          championId: 13, // Ryze
          riotId: "Yike#EUW",
          profileIconId: 520,
          bot: false,
        },
        {
          teamId: 100,
          spell1Id: 4,
          spell2Id: 3,
          championId: 12, // Alistar
          riotId: "Mikyx#EUW",
          profileIconId: 521,
          bot: false,
        },
        // Red team
        {
          teamId: 200,
          spell1Id: 4,
          spell2Id: 32,
          championId: 84, // Akali
          riotId: "Humanoid#FNC",
          profileIconId: 522,
          bot: false,
        },
        {
          teamId: 200,
          spell1Id: 4,
          spell2Id: 7,
          championId: 67, // Vayne
          riotId: "Noah#FNC",
          profileIconId: 523,
          bot: false,
        },
        {
          teamId: 200,
          spell1Id: 4,
          spell2Id: 32,
          championId: 14, // Sion
          riotId: "Oscarinin#FNC",
          profileIconId: 524,
          bot: false,
        },
        {
          teamId: 200,
          spell1Id: 4,
          spell2Id: 32,
          championId: 2, // Olaf
          riotId: "Razork#FNC",
          profileIconId: 525,
          bot: false,
        },
        {
          teamId: 200,
          spell1Id: 4,
          spell2Id: 3,
          championId: 16, // Soraka
          riotId: "Jun#FNC",
          profileIconId: 526,
          bot: false,
        },
      ],
    },
  },
  {
    id: "mock-agurin-euw1",
    gameName: "Agurin",
    tagLine: "EUW",
    region: "euw1",
    puuid: "mock-puuid-agurin",
    profileIconId: 562,
    summonerLevel: 890,
    isTracking: true,
    status: "NOT_IN_GAME",
    lastChecked: Date.now() - 30000,
    statusHistory: [
      {
        timestamp: Date.now() - 40 * 60 * 1000,
        status: "NOT_IN_GAME",
        message: "Match ended (Victory - 28m)",
      },
    ],
    currentGame: null,
  },
  {
    id: "mock-doublelift-na1",
    gameName: "Doublelift",
    tagLine: "NA1",
    region: "na1",
    puuid: "mock-puuid-dl",
    profileIconId: 580,
    summonerLevel: 420,
    isTracking: false,
    status: "NOT_IN_GAME",
    lastChecked: Date.now() - 90000,
    statusHistory: [
      {
        timestamp: Date.now() - 120 * 60 * 1000,
        status: "NOT_IN_GAME",
        message: "Tracking paused by user",
      },
    ],
    currentGame: null,
  },
];
