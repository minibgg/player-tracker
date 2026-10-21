// Phone notifications through a Telegram bot or a Discord webhook, sent
// straight from the browser (both APIs allow cross-origin requests)

export const DEFAULT_WEBHOOKS = {
  telegram: { enabled: false, botToken: "", chatId: "" },
  discord: { enabled: false, url: "" },
};

export const isDiscordWebhookUrl = (url) =>
  /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/.test(
    String(url || "").trim(),
  );

const readTelegramResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    throw new Error(
      `Telegram: ${data.description || `HTTP ${res.status}`}`,
    );
  }
  return data.result;
};

// Telegram answers CORS preflight with 501, so this must stay a "simple"
// request: a form-encoded body and no custom headers
export const sendTelegramMessage = async ({ botToken, chatId, text }) => {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken.trim()}/sendMessage`,
    {
      method: "POST",
      body: new URLSearchParams({
        chat_id: String(chatId).trim(),
        text,
        disable_web_page_preview: "true",
      }),
    },
  );
  await readTelegramResponse(res);
};

/**
 * Chat of the most recent message sent to the bot, so the user can just
 * write anything to the bot instead of looking the chat id up by hand.
 * Returns { id, title } or null.
 */
export const findTelegramChat = async (botToken) => {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken.trim()}/getUpdates`,
  );
  const updates = (await readTelegramResponse(res)) || [];
  for (let i = updates.length - 1; i >= 0; i--) {
    const u = updates[i];
    const chat = (u.message || u.channel_post || u.my_chat_member)?.chat;
    if (chat) {
      return {
        id: String(chat.id),
        title: chat.title || chat.username || chat.first_name || "",
      };
    }
  }
  return null;
};

export const sendDiscordMessage = async ({ url, text }) => {
  const res = await fetch(url.trim(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text }),
  });
  if (!res.ok) throw new Error(`Discord: HTTP ${res.status}`);
};

/**
 * Sends `text` to every enabled channel. One failing channel doesn't stop
 * the other; returns the errors.
 */
export const sendWebhookAlerts = async (webhooks, text) => {
  const { telegram, discord } = webhooks;
  const jobs = [];
  if (telegram.enabled && telegram.botToken && telegram.chatId) {
    jobs.push(sendTelegramMessage({ ...telegram, text }));
  }
  if (discord.enabled && discord.url) {
    jobs.push(sendDiscordMessage({ url: discord.url, text }));
  }
  const results = await Promise.allSettled(jobs);
  return results.filter((r) => r.status === "rejected").map((r) => r.reason);
};
