"use client";

import { BRAND_LOGO_URL, BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";

type BrandLockupProps = {
  subtitle?: string;
  align?: "left" | "center";
  size?: "sm" | "md" | "lg";
  description?: string | null;
};

const sizeMap = {
  sm: {
    mark: "h-10 w-10 rounded-2xl",
    code: "text-base",
    line: "text-[10px]",
    title: "text-sm",
    subtitle: "text-[13px]",
    description: "text-[11px]",
    gap: "gap-3",
  },
  md: {
    mark: "h-12 w-12 rounded-[1.1rem]",
    code: "text-lg",
    line: "text-[10px]",
    title: "text-base",
    subtitle: "text-xs",
    description: "text-xs",
    gap: "gap-3.5",
  },
  lg: {
    mark: "h-16 w-16 rounded-[1.35rem]",
    code: "text-2xl",
    line: "text-[11px]",
    title: "text-xl",
    subtitle: "text-sm",
    description: "text-sm",
    gap: "gap-4",
  },
} as const;

export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const styles = sizeMap[size];

  return (
    <div className={["overflow-hidden border border-white/50 bg-(--accent) shadow-[var(--shadow-card)]", styles.mark].join(" ")} aria-hidden="true">
      <img src={BRAND_LOGO_URL} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

export function BrandLockup({
  subtitle = BRAND_SUBTITLE,
  align = "left",
  size = "md",
  description = "Clareza operacional em tempo real",
}: BrandLockupProps) {
  const styles = sizeMap[size];
  const textAlign = align === "center" ? "text-center" : "text-left";
  const wrapperAlign = align === "center" ? "justify-center" : "justify-start";

  return (
    <div className={`flex items-start ${wrapperAlign} ${styles.gap}`}>
      <BrandMark size={size} />
      <div className={`min-w-0 flex-1 ${textAlign}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-(--accent)">
          {BRAND_NAME}
        </p>
        <p className={`mt-1 font-semibold leading-5 text-(--text-primary) ${styles.title}`}>{subtitle}</p>
        {description ? (
          <p className={`mt-1 leading-5 text-(--text-secondary) ${styles.description}`}>{description}</p>
        ) : null}
      </div>
    </div>
  );
}
