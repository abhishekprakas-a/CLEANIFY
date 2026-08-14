"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Modal } from "./modal";
import { Button } from "./button";

export interface DialogField {
  name: string;
  label: string;
  type?: "text" | "date" | "time" | "number";
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PromptOptions {
  title: string;
  description?: string;
  fields: DialogField[];
  confirmLabel?: string;
  danger?: boolean;
}

interface DialogApi {
  /** Ask a yes/no question. Resolves true when confirmed. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  /** Collect one or more field values. Resolves the values, or null if cancelled. */
  prompt: (opts: PromptOptions) => Promise<Record<string, string> | null>;
}

type Active =
  | {
      kind: "confirm";
      opts: ConfirmOptions;
      resolve: (v: boolean) => void;
    }
  | {
      kind: "prompt";
      opts: PromptOptions;
      resolve: (v: Record<string, string> | null) => void;
    };

const DialogContext = createContext<DialogApi | null>(null);

/** Imperative confirm()/prompt() replacements rendered as in-app modals. */
export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within <DialogProvider>");
  return ctx;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Active | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setActive({ kind: "confirm", opts, resolve });
      }),
    [],
  );

  const prompt = useCallback(
    (opts: PromptOptions) =>
      new Promise<Record<string, string> | null>((resolve) => {
        setValues(
          Object.fromEntries(
            opts.fields.map((f) => [f.name, f.defaultValue ?? ""]),
          ),
        );
        setActive({ kind: "prompt", opts, resolve });
      }),
    [],
  );

  function settle(result: boolean | Record<string, string> | null) {
    if (!active) return;
    (active.resolve as (v: typeof result) => void)(result);
    setActive(null);
  }

  const missingRequired =
    active?.kind === "prompt" &&
    active.opts.fields.some((f) => f.required && !values[f.name]?.trim());

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      {active && (
        <Modal
          title={active.opts.title}
          onClose={() => settle(active.kind === "confirm" ? false : null)}
        >
          {active.kind === "confirm" ? (
            <>
              {active.opts.message && (
                <p className="text-sm text-slate-500">{active.opts.message}</p>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => settle(false)}
                >
                  {active.opts.cancelLabel ?? "Cancel"}
                </Button>
                <Button
                  variant={active.opts.danger ? "danger" : "primary"}
                  size="sm"
                  onClick={() => settle(true)}
                >
                  {active.opts.confirmLabel ?? "Confirm"}
                </Button>
              </div>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!missingRequired) settle({ ...values });
              }}
            >
              {active.opts.description && (
                <p className="text-sm text-slate-500">
                  {active.opts.description}
                </p>
              )}
              <div className="mt-3 space-y-3">
                {active.opts.fields.map((f) => (
                  <label key={f.name} className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      {f.label}
                    </span>
                    <input
                      autoFocus={f === active.opts.fields[0]}
                      type={f.type ?? "text"}
                      value={values[f.name] ?? ""}
                      placeholder={f.placeholder}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.name]: e.target.value }))
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => settle(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={active.opts.danger ? "danger" : "primary"}
                  size="sm"
                  disabled={missingRequired}
                >
                  {active.opts.confirmLabel ?? "OK"}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </DialogContext.Provider>
  );
}
