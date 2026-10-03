export const REGIONS = [
  {
    id: "euw1",
    name: "Europe West",
    short: "EUW",
    regionalRoute: "europe",
    platform: "euw1.api.riotgames.com",
    defaultTag: "EUW",
    flag: "🇪🇺",
  },
  {
    id: "eun1",
    name: "Europe Nordic & East",
    short: "EUNE",
    regionalRoute: "europe",
    platform: "eun1.api.riotgames.com",
    defaultTag: "EUNE",
    flag: "🇪🇺",
  },
  {
    id: "ru",
    name: "Russia",
    short: "RU",
    regionalRoute: "europe",
    platform: "ru.api.riotgames.com",
    defaultTag: "RU1",
    flag: "🇷🇺",
  },
  {
    id: "na1",
    name: "North America",
    short: "NA",
    regionalRoute: "americas",
    platform: "na1.api.riotgames.com",
    defaultTag: "NA1",
    flag: "🇺🇸",
  },
  {
    id: "kr",
    name: "Korea",
    short: "KR",
    regionalRoute: "asia",
    platform: "kr.api.riotgames.com",
    defaultTag: "KR1",
    flag: "🇰🇷",
  },
  {
    id: "tr1",
    name: "Turkey",
    short: "TR",
    regionalRoute: "europe",
    platform: "tr1.api.riotgames.com",
    defaultTag: "TR1",
    flag: "🇹🇷",
  },
  {
    id: "br1",
    name: "Brazil",
    short: "BR",
    regionalRoute: "americas",
    platform: "br1.api.riotgames.com",
    defaultTag: "BR1",
    flag: "🇧🇷",
  },
  {
    id: "la1",
    name: "Latin America North",
    short: "LAN",
    regionalRoute: "americas",
    platform: "la1.api.riotgames.com",
    defaultTag: "LAN",
    flag: "🇲🇽",
  },
  {
    id: "la2",
    name: "Latin America South",
    short: "LAS",
    regionalRoute: "americas",
    platform: "la2.api.riotgames.com",
    defaultTag: "LAS",
    flag: "🇨🇱",
  },
  {
    id: "oc1",
    name: "Oceania",
    short: "OCE",
    regionalRoute: "sea",
    platform: "oc1.api.riotgames.com",
    defaultTag: "OCE",
    flag: "🇦🇺",
  },
  {
    id: "jp1",
    name: "Japan",
    short: "JP",
    regionalRoute: "asia",
    platform: "jp1.api.riotgames.com",
    defaultTag: "JP1",
    flag: "🇯🇵",
  },
  {
    id: "sg2",
    name: "Singapore / SEA",
    short: "SG",
    regionalRoute: "sea",
    platform: "sg2.api.riotgames.com",
    defaultTag: "SG2",
    flag: "🇸🇬",
  },
  {
    id: "tw2",
    name: "Taiwan",
    short: "TW",
    regionalRoute: "sea",
    platform: "tw2.api.riotgames.com",
    defaultTag: "TW2",
    flag: "🇹🇼",
  },
  {
    id: "vn2",
    name: "Vietnam",
    short: "VN",
    regionalRoute: "sea",
    platform: "vn2.api.riotgames.com",
    defaultTag: "VN2",
    flag: "🇻🇳",
  },
];

export const getRegionById = (regionId) => {
  return (
    REGIONS.find((r) => r.id.toLowerCase() === regionId.toLowerCase()) ||
    REGIONS[0]
  );
};

export const getRegionalHost = (regionalRoute) => {
  switch (regionalRoute) {
    case "americas":
      return "americas.api.riotgames.com";
    case "asia":
      return "asia.api.riotgames.com";
    case "sea":
      return "sea.api.riotgames.com";
    case "europe":
    default:
      return "europe.api.riotgames.com";
  }
};
