import { describe, expect, it } from "vitest";
import { CARD_BACKS, resolveCardBack } from "../cardBacks";
import { CARD_FACES, resolveCardFace } from "../cardFaces";

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

describe("resolveCardFace", () => {
  it("returns classic for known code", () => {
    expect(resolveCardFace("face.classic").code).toBe("face.classic");
  });
  it("returns modern for known code", () => {
    expect(resolveCardFace("face.modern").code).toBe("face.modern");
  });
  it("falls back to default", () => {
    expect(resolveCardFace("face.unknown").code).toBe("face.classic");
  });
  it("CARD_FACES contains both seeds", () => {
    expect(Object.keys(CARD_FACES).sort()).toEqual([
      "face.classic",
      "face.modern",
    ]);
  });
});
