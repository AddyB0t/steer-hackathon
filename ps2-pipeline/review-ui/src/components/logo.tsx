import { cn } from "@/lib/utils"

// A paper sheet with a highlighted line and a check badge: "claim checked against the source".
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden="true">
      <defs>
        <linearGradient id="dr-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34B35A" />
          <stop offset="1" stopColor="#14532D" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#dr-bg)" />
      <path d="M11 8.5h12.5l5.5 5.5v15.5a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2v-19a2 2 0 0 1 2-2Z" fill="#fff" />
      <path d="M23.5 8.5V13a1 1 0 0 0 1 1H29" fill="#DDF1E3" />
      <rect x="12" y="16" width="13" height="2" rx="1" fill="#CBD5CF" />
      <rect x="12" y="20" width="10" height="2.6" rx="1.3" fill="#F59E0B" opacity=".85" />
      <rect x="12" y="25" width="8" height="2" rx="1" fill="#CBD5CF" />
      <circle cx="28.5" cy="28.5" r="7" fill="#1E8E3E" stroke="#fff" strokeWidth="2" />
      <path d="m25.4 28.6 2.2 2.2 4-4.3" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
