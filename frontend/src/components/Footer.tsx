import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="fixed bottom-0 inset-x-0 z-40 bg-slate-900 text-slate-300 text-xs py-2 px-4 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
        <span>비영리·교육 목적 — 현금/환금 일절 다루지 않으며 점수만 사용합니다.</span>
        <Link to="/about" className="underline hover:text-white">
          자세히
        </Link>
      </div>
    </footer>
  );
}
