export const SUMMONER_SPELLS = {
  1: { id: "SummonerBoost", name: "Cleanse" },
  3: { id: "SummonerExhaust", name: "Exhaust" },
  4: { id: "SummonerFlash", name: "Flash" },
  6: { id: "SummonerHaste", name: "Ghost" },
  7: { id: "SummonerHeal", name: "Heal" },
  11: { id: "SummonerSmite", name: "Smite" },
  12: { id: "SummonerTeleport", name: "Teleport" },
  13: { id: "SummonerMana", name: "Clarity" },
  14: { id: "SummonerDot", name: "Ignite" },
  21: { id: "SummonerBarrier", name: "Barrier" },
  32: { id: "SummonerSnowball", name: "Mark / Dash" },
  2202: { id: "SummonerCherryFlash", name: "Flee (Arena)" },
  2201: { id: "SummonerCherryHold", name: "Hold (Arena)" },
};

export const getSpellIconUrl = (spellId, version = "14.24.1") => {
  const spell = SUMMONER_SPELLS[spellId];
  if (spell) {
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell.id}.png`;
  }
  return null;
};
