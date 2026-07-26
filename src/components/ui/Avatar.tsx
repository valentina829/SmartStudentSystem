import { initials } from "@/lib/utils";
import { twMerge } from "@/lib/utils";

const palettes = [
  "from-brand-500 to-brand-700",
  "from-success-500 to-success-700",
  "from-warning-500 to-warning-700",
  "from-danger-500 to-danger-700",
  "from-ink-500 to-ink-700",
];

function pickPalette(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes: Record<string, string> = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
    xl: "h-20 w-20 text-2xl",
  };
  return (
    <div
      className={twMerge(
        "rounded-full bg-gradient-to-br text-white font-semibold flex items-center justify-center shadow-sm shrink-0",
        pickPalette(name),
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
