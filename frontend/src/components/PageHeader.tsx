import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui";

export interface PageHeaderBack {
  /** 버튼 라벨. 기본 "← 뒤로" */
  label?: string;
  /** string이면 navigate(to), number면 navigate(number) (예: -1) */
  to?: string | number;
  /** to 대신 임의 핸들러 */
  onClick?: () => void;
  /** disabled 상태 */
  disabled?: boolean;
}

export interface PageHeaderProps {
  /** 중앙 영역. 단순 문자열이거나 복잡한 JSX 모두 가능 */
  title?: ReactNode;
  /** 좌측 뒤로 가기. null/undefined면 좌측 비어있음 */
  back?: PageHeaderBack | null;
  /** 우측 페이지 액션 */
  rightActions?: ReactNode;
  /** 컨테이너 max-width. 페이지 컨텐츠와 맞추면 중앙 정렬 일치 */
  maxWidth?: number | string;
}

const sideStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 80,
};

const titleStyle = {
  fontSize: "var(--fs-h3)",
  fontWeight: 700,
  letterSpacing: "var(--tracking-tight)",
  margin: 0,
};

export function PageHeader({
  title,
  back,
  rightActions,
  maxWidth,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const handleBack = () => {
    if (!back) return;
    if (back.onClick) return back.onClick();
    if (back.to === undefined) return;
    if (typeof back.to === "number") {
      navigate(back.to);
    } else {
      navigate(back.to);
    }
  };

  return (
    <header
      className="w-full flex items-center justify-between mb-4"
      style={{
        maxWidth: maxWidth ?? "100%",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <div style={sideStyle}>
        {back && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={back.disabled}
          >
            {back.label ?? "← 뒤로"}
          </Button>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "center", flex: 1, minWidth: 0 }}>
        {typeof title === "string" ? (
          <h1 style={titleStyle}>{title}</h1>
        ) : (
          title
        )}
      </div>
      <div style={{ ...sideStyle, justifyContent: "flex-end" }}>
        {rightActions}
      </div>
    </header>
  );
}
