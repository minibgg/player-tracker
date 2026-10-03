// Role detection and team ordering (TOP -> JUNGLE -> MID -> ADC -> SUPPORT)
import { getChampionByKey } from "./ddragon";

export const ROLES = {
  TOP: {
    id: "TOP",
    name: "Топер",
    short: "ТОП",
    order: 0,
    color: "text-warn bg-warn/10 border-warn/40",
  },
  JUNGLE: {
    id: "JUNGLE",
    name: "Лесник",
    short: "ЛЕС",
    order: 1,
    color: "text-success bg-success/10 border-success/40",
  },
  MID: {
    id: "MID",
    name: "Мидер",
    short: "МИД",
    order: 2,
    color: "text-info bg-info/10 border-info/40",
  },
  ADC: {
    id: "ADC",
    name: "АДК",
    short: "АДК",
    order: 3,
    color: "text-team-blue bg-team-blue/10 border-team-blue/40",
  },
  SUPPORT: {
    id: "SUPPORT",
    name: "Саппорт",
    short: "САП",
    order: 4,
    color: "text-danger bg-danger/10 border-danger/40",
  },
};

// Known primary roles per champion ID
const CHAMPION_ROLE_AFFINITY = {
  // Top
  266: { TOP: 95 }, // Aatrox
  164: { TOP: 95 }, // Camille
  122: { TOP: 95 }, // Darius
  36: { TOP: 90, JUNGLE: 30 }, // Dr. Mundo
  114: { TOP: 95 }, // Fiora
  41: { TOP: 80, MID: 40 }, // Gangplank
  86: { TOP: 95 }, // Garen
  150: { TOP: 95 }, // Gnar
  887: { TOP: 90, JUNGLE: 30 }, // Gwen
  420: { TOP: 95 }, // Illaoi
  39: { TOP: 85, MID: 60 }, // Irelia
  24: { TOP: 90, JUNGLE: 40 }, // Jax
  126: { TOP: 75, MID: 75 }, // Jayce
  897: { TOP: 95 }, // K'Sante
  10: { TOP: 85, MID: 50 }, // Kayle
  85: { TOP: 90, MID: 40 }, // Kennen
  240: { TOP: 95, MID: 40 }, // Kled
  54: { TOP: 85, SUPPORT: 40 }, // Malphite
  82: { TOP: 95 }, // Mordekaiser
  75: { TOP: 95 }, // Nasus
  516: { TOP: 95 }, // Ornn
  78: { TOP: 80, JUNGLE: 50, SUPPORT: 30 }, // Poppy
  133: { TOP: 90 }, // Quinn
  58: { TOP: 95 }, // Renekton
  92: { TOP: 95 }, // Riven
  68: { TOP: 85, MID: 45 }, // Rumble
  875: { TOP: 90, SUPPORT: 40 }, // Sett
  98: { TOP: 90, SUPPORT: 40 }, // Shen
  27: { TOP: 95 }, // Singed
  14: { TOP: 90, MID: 30 }, // Sion
  17: { TOP: 85 }, // Teemo
  48: { TOP: 70, JUNGLE: 60 }, // Trundle
  23: { TOP: 90, MID: 40 }, // Tryndamere
  6: { TOP: 95 }, // Urgot
  106: { TOP: 70, JUNGLE: 70 }, // Volibear
  83: { TOP: 95 }, // Yorick
  799: { TOP: 85, MID: 50 }, // Ambessa

  // Jungle
  32: { JUNGLE: 95, SUPPORT: 30 }, // Amumu
  200: { JUNGLE: 95 }, // Bel'Veth
  233: { JUNGLE: 95, TOP: 30 }, // Briar
  60: { JUNGLE: 95 }, // Elise
  28: { JUNGLE: 95 }, // Evelynn
  9: { JUNGLE: 95 }, // Fiddlesticks
  104: { JUNGLE: 95 }, // Graves
  120: { JUNGLE: 95 }, // Hecarim
  427: { JUNGLE: 95 }, // Ivern
  59: { JUNGLE: 95, TOP: 30 }, // Jarvan IV
  141: { JUNGLE: 95 }, // Kayn
  121: { JUNGLE: 95 }, // Kha'Zix
  203: { JUNGLE: 95 }, // Kindred
  64: { JUNGLE: 95 }, // Lee Sin
  876: { JUNGLE: 95, TOP: 30 }, // Lillia
  11: { JUNGLE: 95 }, // Master Yi
  76: { JUNGLE: 95 }, // Nidalee
  56: { JUNGLE: 95 }, // Nocturne
  20: { JUNGLE: 95 }, // Nunu & Willump
  33: { JUNGLE: 95 }, // Rammus
  421: { JUNGLE: 95 }, // Rek'Sai
  107: { JUNGLE: 95, TOP: 30 }, // Rengar
  113: { JUNGLE: 95, TOP: 30 }, // Sejuani
  35: { JUNGLE: 90, SUPPORT: 30 }, // Shaco
  102: { JUNGLE: 95, TOP: 30 }, // Shyvana
  72: { JUNGLE: 90, TOP: 40 }, // Skarner
  77: { JUNGLE: 95, TOP: 40 }, // Udyr
  254: { JUNGLE: 95 }, // Vi
  234: { JUNGLE: 95 }, // Viego
  19: { JUNGLE: 75, TOP: 70 }, // Warwick
  62: { JUNGLE: 75, TOP: 70 }, // Wukong
  5: { JUNGLE: 95 }, // Xin Zhao
  154: { JUNGLE: 85, TOP: 50 }, // Zac

  // Mid
  103: { MID: 95 }, // Ahri
  84: { MID: 80, TOP: 65 }, // Akali
  136: { MID: 95 }, // Aurelion Sol
  268: { MID: 95 }, // Azir
  69: { MID: 90, TOP: 40 }, // Cassiopeia
  42: { MID: 85, ADC: 50 }, // Corki
  131: { MID: 70, JUNGLE: 70 }, // Diana
  245: { MID: 70, JUNGLE: 70 }, // Ekko
  105: { MID: 95 }, // Fizz
  3: { MID: 80, SUPPORT: 40 }, // Galio
  910: { MID: 90, SUPPORT: 40 }, // Hwei
  38: { MID: 95 }, // Kassadin
  55: { MID: 95 }, // Katarina
  7: { MID: 95 }, // LeBlanc
  127: { MID: 90 }, // Lissandra
  99: { MID: 70, SUPPORT: 70 }, // Lux
  90: { MID: 95 }, // Malzahar
  950: { MID: 95 }, // Naafiri
  518: { MID: 70, SUPPORT: 50 }, // Neeko
  61: { MID: 95 }, // Orianna
  246: { MID: 95 }, // Qiyana
  13: { MID: 85, TOP: 45 }, // Ryze
  517: { MID: 85, JUNGLE: 35 }, // Sylas
  134: { MID: 95 }, // Syndra
  163: { MID: 70, JUNGLE: 70 }, // Taliyah
  91: { MID: 80, JUNGLE: 60 }, // Talon
  4: { MID: 90 }, // Twisted Fate
  45: { MID: 90, SUPPORT: 40 }, // Veigar
  714: { MID: 95 }, // Vex
  112: { MID: 95 }, // Viktor
  8: { MID: 80, TOP: 60 }, // Vladimir
  101: { MID: 70, SUPPORT: 70 }, // Xerath
  157: { MID: 85, TOP: 50, ADC: 30 }, // Yasuo
  777: { MID: 85, TOP: 65 }, // Yone
  238: { MID: 95 }, // Zed
  115: { MID: 70, ADC: 70 }, // Ziggs
  142: { MID: 95 }, // Zoe
  893: { MID: 85, TOP: 50 }, // Aurora

  // ADC / Bot
  523: { ADC: 95 }, // Aphelios
  22: { ADC: 90, SUPPORT: 40 }, // Ashe
  51: { ADC: 95 }, // Caitlyn
  119: { ADC: 95 }, // Draven
  81: { ADC: 95 }, // Ezreal
  202: { ADC: 95 }, // Jhin
  222: { ADC: 95 }, // Jinx
  145: { ADC: 95 }, // Kai'Sa
  429: { ADC: 95 }, // Kalista
  96: { ADC: 95 }, // Kog'Maw
  236: { ADC: 95, MID: 40 }, // Lucian
  21: { ADC: 95 }, // Miss Fortune
  895: { ADC: 95 }, // Nilah
  360: { ADC: 95 }, // Samira
  15: { ADC: 95 }, // Sivir
  901: { ADC: 95, MID: 40 }, // Smolder
  18: { ADC: 85, MID: 60 }, // Tristana
  29: { ADC: 90 }, // Twitch
  110: { ADC: 95, MID: 30 }, // Varus
  67: { ADC: 90, TOP: 40 }, // Vayne
  498: { ADC: 95 }, // Xayah
  221: { ADC: 95 }, // Zeri

  // Support
  12: { SUPPORT: 95 }, // Alistar
  432: { SUPPORT: 95 }, // Bard
  53: { SUPPORT: 95 }, // Blitzcrank
  63: { SUPPORT: 85, MID: 40, JUNGLE: 40 }, // Brand
  201: { SUPPORT: 95 }, // Braum
  40: { SUPPORT: 95 }, // Janna
  43: { SUPPORT: 85, MID: 40 }, // Karma
  89: { SUPPORT: 95 }, // Leona
  117: { SUPPORT: 95 }, // Lulu
  902: { SUPPORT: 95 }, // Milio
  25: { SUPPORT: 85, MID: 30 }, // Morgana
  267: { SUPPORT: 95 }, // Nami
  111: { SUPPORT: 95 }, // Nautilus
  555: { SUPPORT: 95, MID: 30 }, // Pyke
  497: { SUPPORT: 95 }, // Rakan
  526: { SUPPORT: 95 }, // Rell
  888: { SUPPORT: 95 }, // Renata Glasc
  235: { SUPPORT: 90, ADC: 50 }, // Senna
  147: { SUPPORT: 80, ADC: 60, MID: 40 }, // Seraphine
  37: { SUPPORT: 95 }, // Sona
  16: { SUPPORT: 95 }, // Soraka
  223: { SUPPORT: 75, TOP: 75 }, // Tahm Kench
  44: { SUPPORT: 95 }, // Taric
  412: { SUPPORT: 95 }, // Thresh
  161: { SUPPORT: 75, MID: 60 }, // Vel'Koz
  350: { SUPPORT: 95 }, // Yuumi
  26: { SUPPORT: 90, MID: 30 }, // Zilean
  143: { SUPPORT: 90, MID: 30 }, // Zyra
};

/**
 * Calculates a participant's score for a specific role
 */
const getRoleScore = (participant, roleKey) => {
  const champId = participant.championId;
  const champ = getChampionByKey(champId);
  const spells = [participant.spell1Id, participant.spell2Id];
  const hasSmite = spells.includes(11);
  const hasTeleport = spells.includes(12);
  const hasHeal = spells.includes(7);
  const hasExhaust = spells.includes(3);
  const hasIgnite = spells.includes(14);
  const hasCleanse = spells.includes(1);
  const hasGhost = spells.includes(6);

  let score = 20; // base score

  // Smite is an overwhelming indicator for Jungle
  if (hasSmite) {
    if (roleKey === "JUNGLE") score += 1000;
    else score -= 800;
  } else {
    if (roleKey === "JUNGLE") score -= 300;
  }

  // Champion base role affinity
  const affinities = CHAMPION_ROLE_AFFINITY[champId];
  if (affinities && affinities[roleKey]) {
    score += affinities[roleKey] * 2;
  } else if (champ?.tags) {
    // Fallback to Data Dragon tags
    if (roleKey === "ADC" && champ.tags.includes("Marksman")) score += 70;
    if (roleKey === "SUPPORT" && champ.tags.includes("Support")) score += 70;
    if (
      roleKey === "MID" &&
      (champ.tags.includes("Mage") || champ.tags.includes("Assassin"))
    )
      score += 50;
    if (
      roleKey === "TOP" &&
      (champ.tags.includes("Fighter") || champ.tags.includes("Tank"))
    )
      score += 50;
  }

  // Spell synergies
  if (roleKey === "TOP") {
    if (hasTeleport) score += 35;
    if (hasGhost) score += 15;
  } else if (roleKey === "MID") {
    if (hasTeleport) score += 20;
    if (hasIgnite) score += 20;
    if (hasCleanse) score += 15;
  } else if (roleKey === "ADC") {
    if (hasHeal) score += 35;
    if (hasGhost) score += 20;
    if (hasCleanse) score += 20;
  } else if (roleKey === "SUPPORT") {
    if (hasExhaust) score += 35;
    if (hasIgnite) score += 25;
    if (hasHeal) score += 10;
  }

  return score;
};

/**
 * Assigns roles (TOP, JUNGLE, MID, ADC, SUPPORT) to a team of 5 players
 * and sorts them strictly in that order:
 * 1. Top
 * 2. Jungle
 * 3. Mid
 * 4. ADC
 * 5. Support
 */
export const orderTeamByRoles = (teamParticipants) => {
  if (
    !teamParticipants ||
    !Array.isArray(teamParticipants) ||
    teamParticipants.length === 0
  ) {
    return [];
  }

  // If team doesn't have exactly 5 players (e.g., custom games or bots with weird counts),
  // sort by smite first then id
  if (teamParticipants.length !== 5) {
    return [...teamParticipants].sort((a, b) => {
      const aSmite = [a.spell1Id, a.spell2Id].includes(11);
      const bSmite = [b.spell1Id, b.spell2Id].includes(11);
      if (aSmite && !bSmite) return -1;
      if (!aSmite && bSmite) return 1;
      return 0;
    });
  }

  const roleKeys = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

  // Permutation generator for 5 elements (5! = 120 permutations)
  const getPermutations = (arr) => {
    if (arr.length <= 1) return [arr];
    const perms = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
      const remainingPerms = getPermutations(remaining);
      for (const p of remainingPerms) {
        perms.push([current, ...p]);
      }
    }
    return perms;
  };

  const allPerms = getPermutations(teamParticipants);
  let bestScore = -Infinity;
  let bestOrder = teamParticipants;

  // Find permutation that maximizes total role match score
  for (const perm of allPerms) {
    let currentScore = 0;
    for (let i = 0; i < 5; i++) {
      currentScore += getRoleScore(perm[i], roleKeys[i]);
    }
    if (currentScore > bestScore) {
      bestScore = currentScore;
      bestOrder = perm;
    }
  }

  // Attach detected role object to each participant
  return bestOrder.map((participant, index) => {
    const roleKey = roleKeys[index];
    return {
      ...participant,
      assignedRole: ROLES[roleKey],
    };
  });
};
