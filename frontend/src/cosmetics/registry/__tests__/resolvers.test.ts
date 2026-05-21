import { describe, expect, it } from "vitest";
import { CARD_BACKS, resolveCardBack } from "../cardBacks";

describe("resolveCardBack", () => {
  it("returns variant for known code", () => {
    expect(resolveCardBack("back.navy").code).toBe("back.navy");
  });

  it("falls back to default for unknown code", () => {
    expect(resolveCardBack("back.future_dlc").code).toBe("back.navy");
  });

  it("returns ocean variant", () => {
    expect(resolveCardBack("back.ocean").code).toBe("back.ocean");
  });

  it("CARD_BACKS contains both seeds", () => {
    expect(Object.keys(CARD_BACKS).sort()).toEqual(["back.navy", "back.ocean"]);
  });
});
