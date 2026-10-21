import { describe, it, expect, vi, afterEach } from "vitest";
import {
  DEFAULT_WEBHOOKS,
  isDiscordWebhookUrl,
  sendTelegramMessage,
  findTelegramChat,
  sendWebhookAlerts,
} from "./webhooks";

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isDiscordWebhookUrl", () => {
  it("accepts Discord webhook URLs only", () => {
    expect(
      isDiscordWebhookUrl("https://discord.com/api/webhooks/123/abc-DEF_9"),
    ).toBe(true);
    expect(
      isDiscordWebhookUrl("https://canary.discord.com/api/webhooks/1/x"),
    ).toBe(true);
    expect(isDiscordWebhookUrl("https://example.com/api/webhooks/1/x")).toBe(
      false,
    );
    expect(isDiscordWebhookUrl("")).toBe(false);
  });
});

describe("sendTelegramMessage", () => {
  it("sends a form-encoded request without custom headers (no CORS preflight)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await sendTelegramMessage({ botToken: " 1:AA ", chatId: 42, text: "hi" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.telegram.org/bot1:AA/sendMessage");
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeInstanceOf(URLSearchParams);
    expect(init.body.get("chat_id")).toBe("42");
    expect(init.body.get("text")).toBe("hi");
  });

  it("surfaces Telegram's error description", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ ok: false, description: "Unauthorized" }, 401),
        ),
    );
    await expect(
      sendTelegramMessage({ botToken: "x", chatId: "1", text: "hi" }),
    ).rejects.toThrow("Telegram: Unauthorized");
  });
});

describe("findTelegramChat", () => {
  it("returns the chat of the most recent message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          ok: true,
          result: [
            { message: { chat: { id: 1, first_name: "Old" } } },
            { message: { chat: { id: 2, username: "ivan" } } },
          ],
        }),
      ),
    );
    await expect(findTelegramChat("t")).resolves.toEqual({
      id: "2",
      title: "ivan",
    });
  });

  it("returns null when nobody has messaged the bot", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ ok: true, result: [] })),
    );
    await expect(findTelegramChat("t")).resolves.toBeNull();
  });
});

describe("sendWebhookAlerts", () => {
  const configured = {
    telegram: { enabled: true, botToken: "1:AA", chatId: "42" },
    discord: { enabled: true, url: "https://discord.com/api/webhooks/1/x" },
  };

  it("sends nothing when no channel is enabled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendWebhookAlerts(DEFAULT_WEBHOOKS, "hi")).resolves.toEqual(
      [],
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps going when one channel fails and reports its error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) =>
        Promise.resolve(
          url.startsWith("https://api.telegram.org")
            ? jsonResponse({ ok: true })
            : new Response("", { status: 404 }),
        ),
      ),
    );
    const errors = await sendWebhookAlerts(configured, "hi");
    expect(errors.map((e) => e.message)).toEqual(["Discord: HTTP 404"]);
  });
});
