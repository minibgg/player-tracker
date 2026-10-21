import { describe, it, expect } from "vitest";
import { resolveMotion, normalizeMotionPref, MOTION_LEVELS } from "./motion";

describe("resolveMotion", () => {
  it("follows the OS setting in auto mode", () => {
    expect(resolveMotion("auto", false)).toBe("full");
    expect(resolveMotion("auto", true)).toBe("calm");
  });

  it("keeps an explicit choice regardless of the OS", () => {
    expect(resolveMotion("full", true)).toBe("full");
    expect(resolveMotion("calm", false)).toBe("calm");
    expect(resolveMotion("off", false)).toBe("off");
  });

  it("treats unknown or missing values as auto", () => {
    expect(normalizeMotionPref(null)).toBe("auto");
    expect(normalizeMotionPref("wild")).toBe("auto");
    expect(resolveMotion("wild", true)).toBe("calm");
  });

  it("offers auto first", () => {
    expect(MOTION_LEVELS[0].id).toBe("auto");
  });
});
