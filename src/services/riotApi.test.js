import { describe, it, expect } from "vitest";
import { parseRiotId, buildProxiedUrl } from "./riotApi";

describe("parseRiotId", () => {
  it("splits Name#TAG and trims both parts", () => {
    expect(parseRiotId("  Hide on bush # KR1 ")).toEqual({
      gameName: "Hide on bush",
      tagLine: "KR1",
    });
  });

  it("falls back to the region's default tag", () => {
    expect(parseRiotId("Caps", "EUW")).toEqual({
      gameName: "Caps",
      tagLine: "EUW",
    });
  });

  it("rejects empty input and an empty name", () => {
    expect(() => parseRiotId("")).toThrow();
    expect(() => parseRiotId("#EUW")).toThrow(/имени/);
  });

  it("trims whitespace around parts and uses custom default tag when missing #", () => {
    expect(parseRiotId("  Faker # KR1 ")).toEqual({
      gameName: "Faker",
      tagLine: "KR1",
    });
    expect(parseRiotId("Faker", "NA1")).toEqual({
      gameName: "Faker",
      tagLine: "NA1",
    });
  });
});

describe("buildProxiedUrl", () => {
  const target = "https://euw1.api.riotgames.com/lol/x?a=1";
  const encoded = encodeURIComponent(target);

  it("routes through the local Vite proxy by default", () => {
    expect(buildProxiedUrl(target)).toBe(`/api/riot-proxy?url=${encoded}`);
  });

  it("supports public proxies", () => {
    expect(buildProxiedUrl(target, "corsproxy")).toBe(
      `https://corsproxy.io/?url=${encoded}`,
    );
    expect(buildProxiedUrl(target, "allorigins")).toBe(
      `https://api.allorigins.win/raw?url=${encoded}`,
    );
  });

  it("fills a {url} placeholder in a custom proxy, or appends", () => {
    expect(buildProxiedUrl(target, "custom", "https://p.dev/{url}/x")).toBe(
      `https://p.dev/${encoded}/x`,
    );
    expect(buildProxiedUrl(target, "custom", "https://p.dev/?u=")).toBe(
      `https://p.dev/?u=${encoded}`,
    );
  });

  it("goes direct when a custom proxy is empty", () => {
    expect(buildProxiedUrl(target, "custom", "")).toBe(target);
    expect(buildProxiedUrl(target, "direct")).toBe(target);
  });
});
