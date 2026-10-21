import { useState, useEffect } from "react";

// Seconds since a Spectator-V5 game started. gameStartTime stays 0 during
// the loading screen, when only gameLength is known.
export const getGameSeconds = (game, now) =>
  game.gameStartTime > 0
    ? Math.max(0, Math.floor((now - game.gameStartTime) / 1000))
    : game.gameLength || 0;

// Live match stopwatch: re-renders once a second while `game` is set
export const useGameClock = (game) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!game) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [game]);

  return game ? getGameSeconds(game, now) : 0;
};
