import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/format";
import { fieldClass } from "./Input";

export interface SelectOption {
  value: string;
  label: string;
}

/** Native select styled for the dark theme (accessible and mobile-friendly). */
export function Select({
  options,
  className,
  ...props
}: Omit<ComponentProps<"select">, "children"> & { options: SelectOption[] }) {
  return (
    <div className={cn("relative", className)}>
      <select className={cn(fieldClass, "cursor-pointer appearance-none pr-8")} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-elevated">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-subtle" />
    </div>
  );
}
