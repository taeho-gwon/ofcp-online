import { describe, expect, it } from "vitest";
import { CARD_BACKS, resolveCardBack } from "../cardBacks";
import { CARD_FACES, resolveCardFace } from "../cardFaces";
import { TABLE_THEMES, resolveTableTheme } from "../tableThemes";
import { TITLES, resolveTitle } from "../titles";

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
  it("returns 2color for known code", () => {
    expect(resolveCardFace("face.2color").code).toBe("face.2color");
  });
  it("returns 4color for known code", () => {
    expect(resolveCardFace("face.4color").code).toBe("face.4color");
  });
  it("falls back to default", () => {
    expect(resolveCardFace("face.unknown").code).toBe("face.2color");
  });
  it("CARD_FACES contains both seeds", () => {
    expect(Object.keys(CARD_FACES).sort()).toEqual([
      "face.2color",
      "face.4color",
    ]);
  });
});

describe("resolveTableTheme", () => {
  it("returns green for known code", () => {
    expect(resolveTableTheme("table.green").code).toBe("table.green");
  });
  it("returns walnut for known code", () => {
    expect(resolveTableTheme("table.walnut").code).toBe("table.walnut");
  });
  it("falls back to default", () => {
    expect(resolveTableTheme("table.??").code).toBe("table.green");
  });
  it("TABLE_THEMES contains both seeds", () => {
    expect(Object.keys(TABLE_THEMES).sort()).toEqual([
      "table.green",
      "table.walnut",
    ]);
  });
});

describe("resolveTitle", () => {
  it("returns beginner for known code", () => {
    expect(resolveTitle("title.beginner").code).toBe("title.beginner");
  });
  it("returns fl_demon for known code", () => {
    expect(resolveTitle("title.fl_demon").code).toBe("title.fl_demon");
  });
  it("falls back to default", () => {
    expect(resolveTitle("title.unknown").code).toBe("title.beginner");
  });
  it("TITLES contains both seeds", () => {
    expect(Object.keys(TITLES).sort()).toEqual([
      "title.beginner",
      "title.fl_demon",
    ]);
  });
});
