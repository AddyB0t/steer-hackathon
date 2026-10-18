import { LogoMark } from "@/components/logo"

export function navigate(to: string) {
  window.history.pushState(null, "", to)
  window.dispatchEvent(new PopStateEvent("popstate"))
  window.scrollTo(0, 0)
}

export function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6 md:px-10">
        <a
          href="/"
          onClick={(e) => (e.preventDefault(), navigate("/"))}
          className="flex items-center gap-2 font-heading text-lg font-bold text-forest sm:text-xl"
        >
          <LogoMark />
          <span className="hidden whitespace-nowrap leading-none min-[360px]:inline">
            Receipts
            <span className="mt-0.5 block font-sans text-[11px] font-medium tracking-wide text-slate">show the proof · for steer</span>
          </span>
        </a>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">{children}</div>
      </div>
    </header>
  )
}

export const card = "rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(20,83,45,0.08)] ring-1 ring-black/5 md:p-6"
