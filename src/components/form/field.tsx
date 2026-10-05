import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

interface FieldProps {
  /** Must match the id of the control passed as children. */
  htmlFor: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** A labelled form control with an optional hint and validation message. */
export function Field({ htmlFor, label, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-[13px] text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-error-deep">
          {error}
        </p>
      )}
    </div>
  );
}

/** Classes for a native <select> so that it matches the Input component. */
export const selectClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-error md:text-sm";
