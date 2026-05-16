import { forwardRef } from "react";
import type {
  ReactNode,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from "react";

export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children?: ReactNode;
}

export function Field({ label, hint, error, optional, children }: FieldProps) {
  return (
    <div className="field">
      {label ? (
        <label className="field-label">
          {label}
          {optional ? (
            <span style={{ color: "var(--text-tertiary)", fontWeight: 500 }}>
              선택
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {hint || error ? (
        <span
          className={`field-hint ${error ? "field-hint--error" : ""}`.trim()}
        >
          {error || hint}
        </span>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, className = "", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`input ${error ? "input--error" : ""} ${className}`.trim()}
      {...rest}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={`textarea ${className}`.trim()}
      {...rest}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = "", ...rest }, ref) {
  return (
    <select ref={ref} className={`select ${className}`.trim()} {...rest} />
  );
});
