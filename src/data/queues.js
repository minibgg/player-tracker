// Queue ids as reported by Spectator-V5 / Match-V5, with the names the
// Russian client uses. `type` drives the alert-rule categories.
export const QUEUE_TYPES = {
  0: { name: "Пользовательская игра", short: "Своя", type: "Custom" },
  400: { name: "Обычная (драфт)", short: "Драфт", type: "Normal" },
  420: { name: "Рейтинговая соло/дуо", short: "Соло/дуо", type: "Ranked" },
  430: { name: "Обычная (вслепую)", short: "Вслепую", type: "Normal" },
  440: { name: "Рейтинговая флекс", short: "Флекс", type: "Ranked" },
  450: { name: "ARAM", short: "ARAM", type: "ARAM" },
  490: { name: "Быстрая игра", short: "Быстрая", type: "Normal" },
  700: { name: "Clash", short: "Clash", type: "Tournament" },
  830: { name: "Против ИИ (вводный)", short: "ИИ", type: "Co-op" },
  840: { name: "Против ИИ (новичок)", short: "ИИ", type: "Co-op" },
  850: { name: "Против ИИ (средний)", short: "ИИ", type: "Co-op" },
  900: { name: "ARURF", short: "ARURF", type: "Special" },
  1020: { name: "Один за всех", short: "Один за всех", type: "Special" },
  1300: { name: "Блиц нексуса", short: "Блиц", type: "Special" },
  1400: { name: "Книга заклинаний", short: "Книга", type: "Special" },
  1700: { name: "Арена", short: "Арена", type: "Arena" },
  1900: { name: "URF", short: "URF", type: "Special" },
};

// Queue labels stay neutral: status colours (green/amber/red) mean
// in game / warning / error elsewhere in the app
const QUEUE_COLOR = "text-ink-2";

export const getQueueInfo = (queueId) => {
  if (QUEUE_TYPES[queueId]) {
    return { ...QUEUE_TYPES[queueId], color: QUEUE_COLOR };
  }
  return {
    name: queueId ? `Режим #${queueId}` : "Неизвестный режим",
    short: queueId ? `#${queueId}` : "?",
    type: "Match",
    color: QUEUE_COLOR,
  };
};
