export const QUEUE_TYPES = {
  0: {
    name: "Custom Game",
    short: "Custom",
    type: "Custom",
    color: "text-ink-2",
  },
  400: {
    name: "Normal (Draft Pick)",
    short: "Normal Draft",
    type: "Normal",
    color: "text-team-blue",
  },
  420: {
    name: "Ranked Solo/Duo",
    short: "Ranked Solo",
    type: "Ranked",
    color: "text-warn",
  },
  430: {
    name: "Normal (Blind Pick)",
    short: "Normal Blind",
    type: "Normal",
    color: "text-team-blue",
  },
  440: {
    name: "Ranked Flex",
    short: "Ranked Flex",
    type: "Ranked",
    color: "text-info",
  },
  450: { name: "ARAM", short: "ARAM", type: "ARAM", color: "text-info" },
  490: {
    name: "Normal (Quickplay)",
    short: "Quickplay",
    type: "Normal",
    color: "text-success",
  },
  700: {
    name: "Clash",
    short: "Clash",
    type: "Tournament",
    color: "text-warn",
  },
  830: {
    name: "Co-op vs. AI (Intro)",
    short: "Bots (Intro)",
    type: "Co-op",
    color: "text-ink-2",
  },
  840: {
    name: "Co-op vs. AI (Beginner)",
    short: "Bots (Beginner)",
    type: "Co-op",
    color: "text-ink-2",
  },
  850: {
    name: "Co-op vs. AI (Intermediate)",
    short: "Bots (Intermediate)",
    type: "Co-op",
    color: "text-ink-2",
  },
  900: {
    name: "ARURF",
    short: "ARURF",
    type: "Special",
    color: "text-danger",
  },
  1020: {
    name: "One for All",
    short: "One for All",
    type: "Special",
    color: "text-danger",
  },
  1300: {
    name: "Nexus Blitz",
    short: "Nexus Blitz",
    type: "Special",
    color: "text-warn",
  },
  1400: {
    name: "Ultimate Spellbook",
    short: "Spellbook",
    type: "Special",
    color: "text-info",
  },
  1700: {
    name: "Arena (2v2v2v2)",
    short: "Arena",
    type: "Arena",
    color: "text-success",
  },
  1900: {
    name: "Pick URF",
    short: "URF",
    type: "Special",
    color: "text-danger",
  },
};

export const getQueueInfo = (queueId) => {
  if (QUEUE_TYPES[queueId]) {
    return QUEUE_TYPES[queueId];
  }
  return {
    name: queueId ? `Queue #${queueId}` : "Unknown Queue",
    short: queueId ? `Queue #${queueId}` : "Unknown",
    type: "Match",
    color: "text-team-blue",
  };
};
