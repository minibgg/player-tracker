// Time formatting shared by the player rows of every game

// Match stopwatch: "07:42", or "1:03:15" past an hour
export const formatDuration = (totalSeconds) => {
  if (totalSeconds < 0) return "00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

// "14:05" today, "12 окт., 14:05" for older entries
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (date.toDateString() === new Date().toDateString()) return time;
  const day = date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
  return `${day}, ${time}`;
};

export const formatTimeAgo = (timestamp) => {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  return `${Math.floor(hours / 24)} д назад`;
};
