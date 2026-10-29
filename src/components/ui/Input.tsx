import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

export const fieldClass =
  "h-9 w-full rounded-lg border border-line-strong bg-canvas px-3 text-sm text-fg placeholder:text-subtle transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20";

export function Input({ className, icon, ...props }: ComponentProps<"input"> & { icon?: ReactNode }) {
  if (icon) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-subtle">{icon}</span>
        <input className={cn(fieldClass, "pl-9", className)} {...props} />
      </div>
    );
  }
  return <input className={cn(fieldClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClass, "h-auto min-h-[80px] py-2 leading-relaxed", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-xs font-medium text-muted", className)} {...props} />;
}

export function Checkbox({
  label,
  checked,
  onChange,
  description,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}) {
  return (
    <label className="group flex cursor-pointer items-start gap-2.5 rounded-md py-1 text-sm text-muted hover:text-fg">
      <span className="relative mt-0.5 flex size-4 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer size-4 cursor-pointer appearance-none rounded border border-line-strong bg-canvas transition-colors checked:border-accent checked:bg-accent focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
        />
        <Check className="pointer-events-none absolute inset-0 m-auto size-3 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} />
      </span>
      <span>
        <span className={cn(checked && "text-fg")}>{label}</span>
        {description && <span className="block text-xs text-subtle">{description}</span>}
      </span>
    </label>
  );
}
