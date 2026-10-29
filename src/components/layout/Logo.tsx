"use client";

/** Sidebar / login brand: MK mark + "admin". */
export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/MK.png"
          alt=""
          className="absolute top-1/2 left-1/2 h-[220%] w-auto max-w-none -translate-x-1/2 -translate-y-1/2 mix-blend-lighten select-none"
        />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">admin</span>
    </div>
  );
}
