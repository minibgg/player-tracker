import { describe, it, expect } from "vitest";
import { orderTeamByRoles } from "./roleDetection";

const p = (championId, spell1Id, spell2Id) => ({
  championId,
  spell1Id,
  spell2Id,
});

describe("orderTeamByRoles", () => {
  it("orders a standard team TOP, JUNGLE, MID, ADC, SUPPORT", () => {
    const shuffled = [
      p(412, 4, 3), // Thresh: Flash + Exhaust
      p(222, 4, 7), // Jinx: Flash + Heal
      p(64, 4, 11), // Lee Sin: Flash + Smite
      p(103, 4, 14), // Ahri: Flash + Ignite
      p(122, 4, 12), // Darius: Flash + Teleport
    ];

    const ordered = orderTeamByRoles(shuffled);

    expect(ordered.map((x) => x.championId)).toEqual([122, 64, 103, 222, 412]);
    expect(ordered.map((x) => x.assignedRole.id)).toEqual([
      "TOP",
      "JUNGLE",
      "MID",
      "ADC",
      "SUPPORT",
    ]);
  });

  it("puts the Smite holder in the jungle regardless of champion", () => {
    const team = [
      p(103, 4, 11), // Ahri with Smite
      p(64, 4, 14), // Lee Sin without Smite
      p(122, 4, 12),
      p(222, 4, 7),
      p(412, 4, 3),
    ];
    const jungler = orderTeamByRoles(team)[1];
    expect(jungler.championId).toBe(103);
  });

  it("handles empty and non-standard team sizes", () => {
    expect(orderTeamByRoles([])).toEqual([]);
    expect(orderTeamByRoles(null)).toEqual([]);
    const trio = orderTeamByRoles([p(103, 4, 14), p(64, 4, 11), p(222, 4, 7)]);
    expect(trio[0].championId).toBe(64);
    expect(trio).toHaveLength(3);
  });
});
