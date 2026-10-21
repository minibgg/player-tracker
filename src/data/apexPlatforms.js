// Platforms of the Apex Legends Status API. PC accounts are looked up by
// their EA name (Steam players too); Switch players only by UID.
export const APEX_PLATFORMS = [
  { id: "PC", short: "PC", name: "PC (EA / Steam)", byName: true },
  { id: "PS4", short: "PS", name: "PlayStation", byName: true },
  { id: "X1", short: "XBOX", name: "Xbox", byName: true },
  { id: "SWITCH", short: "SWITCH", name: "Nintendo Switch", byName: false },
];

export const getApexPlatform = (id) =>
  APEX_PLATFORMS.find((p) => p.id === String(id || "").toUpperCase()) ||
  APEX_PLATFORMS[0];

// How each player status looks on the board
export const PRESENCE = {
  IN_GAME: { label: "в матче", dot: "bg-success animate-pulse" },
  IN_LOBBY: { label: "в лобби", dot: "bg-info" },
  OFFLINE: { label: "не в сети", dot: "border border-ink-2" },
};
