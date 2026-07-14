import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/** Eye / eye-off icons for the password reveal toggle (BG-01). */
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  );
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type, ...props }, ref) => {
    const inputId = id ?? props.name;
    const isPassword = type === "password";
    const [reveal, setReveal] = React.useState(false);
    const effectiveType = isPassword && reveal ? "text" : type;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={effectiveType}
            className={cn(
              "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-200",
              isPassword && "pr-10",
              error && "border-red-400 focus:border-red-500 focus:ring-red-200",
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              tabIndex={-1}
              aria-label={reveal ? "Hide password" : "Show password"}
              title={reveal ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
            >
              <EyeIcon off={reveal} />
            </button>
          )}
        </div>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  },
);

Input.displayName = "Input";
