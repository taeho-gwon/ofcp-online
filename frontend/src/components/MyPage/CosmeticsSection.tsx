import { useEffect, useMemo, useState } from "react";
import { CosmeticCategory } from "../../api/cosmetics";
import { useCosmeticsStore } from "../../store/cosmeticsStore";
import { Button } from "../ui";

const CATEGORIES: { key: CosmeticCategory; label: string }[] = [
  { key: "card_back", label: "카드 뒷면" },
  { key: "card_face", label: "카드 앞면" },
  { key: "table_theme", label: "테이블 테마" },
  { key: "title", label: "칭호" },
];

const sectionTitleStyle = {
  fontSize: "var(--fs-body-lg)",
  fontWeight: 600,
  margin: 0,
};

const categoryRowStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 6,
};

const optionListStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
};

const labelStyle = {
  fontSize: "var(--fs-body-sm)",
  color: "var(--text-secondary)",
};

export function CosmeticsSection() {
  const { catalog, loadout, loaded, hydrate, save } = useCosmeticsStore();
  const [draft, setDraft] = useState<Record<CosmeticCategory, string>>({
    card_back: "",
    card_face: "",
    table_theme: "",
    title: "",
  });
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!loaded) hydrate();
  }, [loaded, hydrate]);

  useEffect(() => {
    if (loadout) setDraft(loadout);
  }, [loadout]);

  const byCategory = useMemo(() => {
    const m: Record<CosmeticCategory, typeof catalog> = {
      card_back: [],
      card_face: [],
      table_theme: [],
      title: [],
    };
    for (const item of catalog) m[item.category].push(item);
    return m;
  }, [catalog]);

  const dirty = useMemo(() => {
    if (!loadout) return false;
    return CATEGORIES.some((c) => draft[c.key] !== loadout[c.key]);
  }, [draft, loadout]);

  if (!loaded) {
    return (
      <section className="card">
        <h2 style={sectionTitleStyle}>코스메틱</h2>
        <p style={labelStyle}>불러오는 중…</p>
      </section>
    );
  }

  async function onSave() {
    setSaving(true);
    try {
      await save(draft);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <h2 style={sectionTitleStyle}>코스메틱</h2>
      <div className="flex flex-col gap-3">
        {CATEGORIES.map(({ key, label }) => (
          <div key={key} style={categoryRowStyle}>
            <span style={labelStyle}>{label}</span>
            <div style={optionListStyle}>
              {byCategory[key].map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={draft[key] === item.id ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setDraft((d) => ({ ...d, [key]: item.id }))}
                >
                  {item.name}
                </Button>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={onSave}
            disabled={!dirty || saving}
          >
            {saving ? "저장 중…" : "저장"}
          </Button>
          {savedFlash && <span style={labelStyle}>저장됨</span>}
        </div>
      </div>
    </section>
  );
}
