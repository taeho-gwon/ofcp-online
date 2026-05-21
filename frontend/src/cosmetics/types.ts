import type { CSSProperties, ReactElement } from "react";
import type { Card } from "../api/types";

export type CardSize = "sm" | "md";

export interface CardBackVariant {
  code: string;
  name: string;
  Component: (props: { size: CardSize }) => ReactElement;
}

export interface CardFaceVariant {
  code: string;
  name: string;
  Face: (props: { card: Card; size: CardSize }) => ReactElement;
  EmptySlot: (props: { size: CardSize; highlighted: boolean }) => ReactElement;
}

export interface TableThemeVariant {
  code: string;
  name: string;
  surfaceStyle: CSSProperties;
  surfaceClass?: string;
}

export interface TitleVariant {
  code: string;
  name: string;
  text: string;
  style: CSSProperties;
}
