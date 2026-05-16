import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer
      className="fixed bottom-0 inset-x-0 z-40 py-2 px-4"
      style={{
        background: "var(--bg-sunken)",
        borderTop: "1px solid var(--border-subtle)",
        color: "var(--text-secondary)",
        fontSize: "var(--fs-caption)",
      }}
    >
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
        <span>비영리·교육 목적 — 현금/환금 일절 다루지 않으며 점수만 사용합니다.</span>
        <Link to="/about" style={{ color: "var(--accent)" }}>
          자세히
        </Link>
      </div>
    </footer>
  );
}
