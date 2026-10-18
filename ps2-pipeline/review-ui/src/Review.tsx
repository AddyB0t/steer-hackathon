import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, FileText, Film, Image as ImageIcon, MessageSquare, ShieldCheck, XCircle } from "lucide-react"
import { LayoutGrid, type Card } from "@/components/ui/layout-grid"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Header, navigate } from "@/components/shell"

type Source = { id: string; page: number; text: string }
type Item = {
  id: string
  post: string
  where: string
  text: string
  sources: Source[]
  image: string | null
  editorial: boolean
  numbers: { n: string; ok: boolean }[]
}
type Decision = { status: "approved" | "rejected"; note?: string }
type State = {
  paper: { citation: string; short: string; url: string; title: string }
  angle: string
  reasoning: string
  items: Item[]
  hasReel: boolean
  facts: { pages: number; sentences: number; verified: number; total: number; quotes: number }
  decisions: Record<string, Decision>
  publishedAt: string | null
}
type Tile = { key: string; title: string; icon: React.ReactNode; thumbnail?: string; className: string; items: Item[] }

const needsJudgement = (it: Item) => it.editorial || it.numbers.some((n) => !n.ok)

function tilesFrom(items: Item[], base: string, hasReel: boolean): Tile[] {
  const of = (post: string) => items.filter((i) => i.post === post)
  const slides = of("Carousel").map((it) => ({
    key: it.id,
    title: `Carousel ${it.where.replace("slide ", "· Slide ")}`,
    icon: <ImageIcon className="size-4" />,
    thumbnail: `${base}/${it.image}`,
    className: "col-span-1",
    items: [it],
  }))
  return [
    { key: "reel", title: hasReel ? "AI Reel" : "AI Reel · Script", icon: <Film className="size-4" />, thumbnail: `${base}/reel-v2/${hasReel ? "thumb" : "cover"}.png`, className: "md:row-span-2", items: of("Reel") },
    ...slides,
    { key: "static", title: "Static Post", icon: <ImageIcon className="size-4" />, thumbnail: `${base}/posts/static.png`, className: "col-span-1", items: of("Static") },
    { key: "caption", title: "Captions", icon: <MessageSquare className="size-4" />, className: "sm:col-span-2 md:col-span-3", items: of("Caption") },
  ]
}

type Verdict = "approved" | "rejected" | "judgement" | "pending"
const VERDICT: Record<Verdict, { label: string; className: string; icon: React.ReactNode }> = {
  approved: { label: "Approved", className: "bg-leaf/10 text-leaf ring-leaf/30", icon: <CheckCircle2 className="size-3.5" /> },
  judgement: { label: "Needs judgement", className: "bg-amber/10 text-amber-700 ring-amber/40", icon: <AlertTriangle className="size-3.5" /> },
  rejected: { label: "Rejected", className: "bg-tomato/10 text-tomato ring-tomato/30", icon: <XCircle className="size-3.5" /> },
  pending: { label: "Pending", className: "bg-gray-100 text-slate ring-gray-200", icon: <Clock className="size-3.5" /> },
}

function Pill({ v, children }: { v: Verdict; children?: React.ReactNode }) {
  const s = VERDICT[v]
  return (
    <span className={cn("inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 text-xs font-semibold leading-none ring-1 ring-inset", s.className)}>
      {s.icon}
      {children ?? s.label}
    </span>
  )
}

function Marked({ text, numbers }: { text: string; numbers: string[] }) {
  if (!numbers.length) return <>{text}</>
  const pattern = new RegExp(`((?<![\\d.])(?:${numbers.map((n) => n.replace(".", "[.,]")).join("|")})(?![\\d]))`, "g")
  return (
    <>
      {text.split(pattern).map((part, i) =>
        i % 2 ? (
          <mark key={i} className="rounded bg-leaf/15 px-1 font-semibold text-forest">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}

function TileBadge({ tile, decisions }: { tile: Tile; decisions: Record<string, Decision> }) {
  const approved = tile.items.filter((i) => decisions[i.id]?.status === "approved").length
  const rejected = tile.items.filter((i) => decisions[i.id]?.status === "rejected").length
  const flagged = tile.items.filter(needsJudgement).length

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 h-[108px] px-5 py-4">
      <div className="flex items-center gap-2 truncate font-heading text-lg font-semibold text-forest">
        <span className="rounded-lg bg-mint p-1.5 text-leaf">{tile.icon}</span>
        {tile.title}
      </div>
      <div className="mt-3 flex flex-nowrap gap-1.5 whitespace-nowrap">
        <Pill v={approved === tile.items.length ? "approved" : "pending"}>
          {approved}/{tile.items.length} approved
        </Pill>
        {flagged > 0 && <Pill v="judgement">{flagged} need you</Pill>}
        {rejected > 0 && <Pill v="rejected">{rejected} rejected</Pill>}
      </div>
    </div>
  )
}

function CaptionPreview({ items }: { items: Item[] }) {
  return (
    <div className="grid w-full max-w-4xl gap-4 md:grid-cols-2">
      {items.map((it) => (
        <div key={it.id} className="rounded-2xl bg-white p-4 text-sm leading-relaxed text-slate shadow-sm">
          <div className="mb-1 font-heading text-base font-bold text-forest">{it.where}</div>
          <p className="line-clamp-4 whitespace-pre-wrap text-pretty md:line-clamp-6">{it.text}</p>
        </div>
      ))}
    </div>
  )
}

// Short beat names instead of internal ids, so the panel reads like a pitch deck.
function beatName(it: Item, i: number, total: number) {
  if (it.post === "Caption") return `${it.where} Caption`
  if (total > 1 && i === 0) return "The Hook"
  if (total > 1 && i === total - 1) return "The Ask"
  if (it.editorial) return "Steer's Voice"
  return `The Proof · p. ${it.sources[0]?.page}`
}

function ReviewPanel({ tile, base, hasReel, decisions, onDecide }: { tile: Tile; base: string; hasReel: boolean; decisions: Record<string, Decision>; onDecide: (id: string, status: Decision["status"]) => void }) {
  const proven = tile.items.filter((i) => !needsJudgement(i)).length
  const open = tile.items.length - proven
  return (
    <div className="text-gray-900">
      <p className="flex items-center gap-3 pr-16 font-heading text-2xl font-bold text-forest sm:text-3xl md:text-4xl">
        <span className="rounded-xl bg-mint p-2 text-leaf">{tile.icon}</span>
        {tile.title}
      </p>
      <p className="mt-1 font-heading text-lg font-semibold text-leaf md:text-xl">
        {proven > 0 && `${proven} proven by the paper.`} {open > 0 && `${open} need${open === 1 ? "s" : ""} your call.`}
      </p>

      <div className="mt-5 flex flex-col gap-5 md:mt-6 md:flex-row md:items-start md:gap-8">
        {tile.thumbnail && (
          <div className="mx-auto w-full max-w-sm shrink-0 md:sticky md:top-0 md:mx-0 md:w-[45%] md:max-w-none">
            {tile.key === "reel" && hasReel ? (
              <video
                src={`${base}/posts/reel.mp4`}
                controls
                playsInline
                className="aspect-[9/16] max-h-[78vh] w-full rounded-3xl bg-black object-cover shadow-xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : tile.key === "reel" ? (
              <div className="flex gap-2 rounded-3xl bg-amber/15 p-5 text-amber-800">
                <Film className="mt-0.5 size-5 shrink-0" />
                <span className="text-pretty">
                  <b>Script only.</b> The video was not filmed for this run. Each line below is what she would say, with its proof from the paper.
                </span>
              </div>
            ) : (
              <img src={tile.thumbnail} alt="" className="w-full rounded-3xl shadow-xl" />
            )}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {tile.items.map((it, idx) => {
            const d = decisions[it.id]
            const v: Verdict = d?.status === "approved" ? "approved" : d?.status === "rejected" ? "rejected" : needsJudgement(it) ? "judgement" : "pending"
            return (
              <div
                key={it.id}
                className={cn(
                  "rounded-2xl border-l-4 bg-white p-4 shadow-[0_6px_20px_rgba(20,83,45,0.08)] ring-1 ring-black/5 md:p-5",
                  v === "approved" ? "border-leaf" : v === "rejected" ? "border-tomato" : v === "judgement" ? "border-amber" : "border-gray-200",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-heading text-xl font-bold text-forest md:text-2xl">{beatName(it, idx, tile.items.length)}</span>
                  <Pill v={v} />
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-pretty text-base leading-relaxed text-gray-800 md:text-[17px]">{it.text}</p>
                {it.numbers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {it.numbers.map((n) => (
                      <Pill key={n.n} v={n.ok ? "approved" : "rejected"}>
                        {n.n} {n.ok ? "in paper" : "NOT in paper"}
                      </Pill>
                    ))}
                  </div>
                )}

                <div className="mt-4 break-words rounded-xl bg-mint p-3 text-sm md:p-4">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-forest">
                    <ShieldCheck className="size-4 text-leaf" /> From the paper
                  </div>
                  {it.editorial ? (
                    <div className="flex gap-2 rounded-lg bg-amber/15 p-3 text-amber-800">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <span className="text-pretty">
                        <b>Not in the paper.</b> Steer's own words. Approve only if medically fair.
                      </span>
                    </div>
                  ) : (
                    it.sources.map((s) => (
                      <div key={s.id} className="mb-2 last:mb-0">
                        <div className="flex items-center gap-1 text-xs text-slate">
                          <FileText className="size-3" /> Page {s.page} · sentence {s.id}
                        </div>
                        <p className="mt-1 text-pretty text-gray-800">
                          <Marked text={s.text} numbers={it.numbers.map((n) => n.n)} />
                        </p>
                      </div>
                    ))
                  )}
                  {it.post === "Reel" && it.image && <img src={`${base}/${it.image}`} alt="highlighted paper crop" className="mt-3 rounded-lg ring-1 ring-black/10" />}
                </div>

                <div className="mt-4 grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
                  <Button size="lg" className="rounded-full bg-leaf px-5 text-white hover:bg-forest" onClick={(e) => (e.stopPropagation(), onDecide(it.id, "approved"))}>
                    <CheckCircle2 /> Approve
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full border-tomato/40 px-5 text-tomato hover:bg-tomato/10" onClick={(e) => (e.stopPropagation(), onDecide(it.id, "rejected"))}>
                    <XCircle /> Reject
                  </Button>
                  {d?.status === "rejected" && d.note && <p className="col-span-2 text-xs text-tomato">Note: {d.note}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Review({ slug }: { slug: string }) {
  const [state, setState] = useState<State | null>(null)
  const [toast, setToast] = useState("")
  const api = `/api/runs/${slug}`
  const base = `/files/${slug}`

  useEffect(() => {
    fetch(`${api}/state`).then((r) => r.json()).then(setState)
  }, [api])

  const say = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(""), 4000)
  }

  const decide = async (id: string, status: Decision["status"]) => {
    const note = status === "rejected" ? prompt("What is wrong with this line?") : ""
    if (note === null) return
    await fetch(`${api}/decide`, { method: "POST", body: JSON.stringify({ id, status, note }) })
    setState((s) => (s ? { ...s, decisions: { ...s.decisions, [id]: { status, note } } } : s))
  }

  const publish = async () => {
    const r = await (await fetch(`${api}/publish`, { method: "POST" })).json()
    if (r.ok) {
      setState((s) => (s ? { ...s, publishedAt: new Date().toISOString() } : s))
      say(`Published to approved/ · review took ${r.reviewMinutes} min`)
    } else say(r.error)
  }

  const tiles = useMemo(() => (state ? tilesFrom(state.items, base, state.hasReel) : []), [state?.items, base, state?.hasReel])
  if (!state) return <p className="p-10 font-heading text-xl text-forest">Loading review…</p>

  const approved = state.items.filter((i) => state.decisions[i.id]?.status === "approved").length
  const flagged = state.items.filter(needsJudgement).length
  const cards: Card[] = tiles.map((tile, i) => ({
    id: i + 1,
    className: tile.className,
    thumbnail: tile.thumbnail,
    preview: tile.key === "caption" ? <CaptionPreview items={tile.items} /> : undefined,
    badge: <TileBadge tile={tile} decisions={state.decisions} />,
    content: <ReviewPanel tile={tile} base={base} hasReel={state.hasReel} decisions={state.decisions} onDecide={decide} />,
  }))

  return (
    <div className="min-h-screen bg-gradient-to-b from-mint via-white to-mint">
      <Header>
        <Pill v={approved === state.items.length ? "approved" : "pending"}>
          {approved}/{state.items.length}
          <span className="hidden sm:inline"> approved</span>
        </Pill>
        <Button size="lg" className="rounded-full bg-leaf px-4 font-semibold text-white hover:bg-forest sm:px-5" disabled={approved !== state.items.length || !!state.publishedAt} onClick={publish}>
          {state.publishedAt ? "Published" : "Publish posts"}
        </Button>
      </Header>

      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 md:px-10 md:pt-10">
        <a href="/" onClick={(e) => (e.preventDefault(), navigate("/"))} className="inline-flex items-center gap-1 text-sm font-medium text-leaf hover:text-forest">
          <ArrowLeft className="size-4" /> All runs
        </a>
        <h1 className="mt-2 font-heading text-4xl font-bold leading-tight text-forest md:text-6xl">
          Posts Ready. <span className="text-amber">Check Every Line.</span>
        </h1>
        <a href={`${base}/paper.pdf`} target="_blank" rel="noreferrer" className="mt-3 flex max-w-4xl items-start gap-2 rounded-2xl bg-white/70 px-4 py-3 text-sm text-slate ring-1 ring-black/5 hover:text-forest">
          <FileText className="mt-0.5 size-4 shrink-0 text-leaf" />
          <span className="text-pretty">
            <b className="text-forest">From this paper:</b> {state.paper.title} · {state.paper.short} · <span className="text-leaf underline">open PDF</span>
          </span>
        </a>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(20,83,45,0.08)] ring-1 ring-black/5 md:col-span-2 md:p-6">
            <div className="font-heading text-2xl font-bold text-forest">The Message.</div>
            <p className="mt-1 text-pretty text-base leading-relaxed text-gray-800 md:text-justify md:text-lg">{state.angle}</p>
            <div className="mt-4 font-heading text-2xl font-bold text-leaf">Why It Lands.</div>
            <p className="mt-1 text-pretty text-sm leading-relaxed text-slate md:text-justify md:text-base">{state.reasoning}</p>
          </div>
          <div className="flex flex-col justify-center gap-3 rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(20,83,45,0.08)] ring-1 ring-black/5 md:p-6">
            <div className="font-heading text-3xl font-bold leading-tight text-forest md:text-4xl">
              {state.facts.pages} Pages Read.
              <br />
              <span className="text-leaf">
                {state.facts.verified} of {state.facts.total} Findings Kept.
              </span>
              <br />
              <span className="text-amber">{flagged} Need You.</span>
            </div>
            <p className="text-pretty text-sm leading-relaxed text-slate">
              {state.facts.sentences} sentences checked. Findings whose numbers were not in the text were dropped. {state.facts.quotes} reel lines quote the paper word for word.
            </p>
          </div>
        </div>
      </section>

      <LayoutGrid cards={cards} />

      {toast && <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-forest px-5 py-3 text-white shadow-lg">{toast}</div>}
    </div>
  )
}
