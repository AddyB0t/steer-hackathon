import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Film, Loader2, UploadCloud, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Header, card, navigate } from "@/components/shell"

export type RunSummary = {
  slug: string
  fileName: string
  createdAt: string
  state: "queued" | "running" | "done" | "failed"
  title: string
  short: string
  cover: string | null
  hasReel: boolean
  publishedAt: string | null
}

const MAX_MB = 30

function StateTag({ run }: { run: RunSummary }) {
  if (run.state === "failed") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-tomato"><XCircle className="size-3.5" /> Failed</span>
  if (run.state !== "done") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><Loader2 className="size-3.5 animate-spin" /> Working</span>
  if (run.publishedAt) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-leaf"><CheckCircle2 className="size-3.5" /> Published</span>
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-forest"><CheckCircle2 className="size-3.5" /> Ready to review</span>
}

export default function Home() {
  const [runs, setRuns] = useState<RunSummary[] | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [reel, setReel] = useState(false)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/runs").then((r) => r.json()).then(setRuns)
  }, [])

  const pick = (f?: File | null) => {
    setError("")
    if (!f) return
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") return setError("Pick a PDF file.")
    if (f.size > MAX_MB * 1024 * 1024) return setError(`The PDF must be under ${MAX_MB} MB.`)
    setFile(f)
  }

  const start = async () => {
    if (!file) return
    setBusy(true)
    setError("")
    try {
      const r = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/pdf", "x-filename": encodeURIComponent(file.name), "x-reel": reel ? "1" : "0" },
        body: file,
      })
      const body = await r.json()
      if (!r.ok) throw new Error(body.error || "upload failed")
      navigate(`/run/${body.slug}`)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-mint via-white to-mint">
      <Header />

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pt-8 sm:px-6 md:grid-cols-2 md:items-center md:gap-10 md:px-10 md:pt-14">
        <div>
          <h1 className="font-heading text-[2.1rem] font-bold leading-tight text-forest sm:text-5xl md:text-6xl">
            Paper In.
            <br />
            <span className="text-leaf">Posts Out.</span>
            <br />
            <span className="text-amber">Every Claim Proven.</span>
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate md:text-lg">
            Drop in one research paper. Get a carousel, a static post and an AI reel in Steer's voice. Every number is traced to its page. Every line waits for a doctor's sign-off.
          </p>
        </div>

        <div className={cn(card, "min-w-0")}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => input.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
            onDragOver={(e) => (e.preventDefault(), setDrag(true))}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => (e.preventDefault(), setDrag(false), pick(e.dataTransfer.files[0]))}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition",
              drag ? "border-leaf bg-mint" : "border-leaf/30 bg-mint/50 hover:bg-mint",
            )}
          >
            <UploadCloud className="size-10 text-leaf" />
            <div className="font-heading text-xl font-bold text-forest">{file ? file.name : "Drop the paper here"}</div>
            <div className="text-sm text-slate">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · tap to change` : `PDF, up to ${MAX_MB} MB`}</div>
            <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-mint/60 p-4">
            <input type="checkbox" checked={reel} onChange={(e) => setReel(e.target.checked)} className="mt-1 size-4 accent-[#1E8E3E]" />
            <span>
              <span className="flex items-center gap-1.5 font-heading font-semibold text-forest">
                <Film className="size-4 text-leaf" /> Film the AI reel too
              </span>
              <span className="block text-sm text-slate">Adds about 5 minutes and about $3 of video credits. Off: you still get the reel script and its paper proof.</span>
            </span>
          </label>

          {error && <p className="mt-3 text-sm font-medium text-tomato">{error}</p>}

          <Button size="lg" disabled={!file || busy} onClick={start} className="mt-4 h-12 w-full rounded-full bg-leaf text-base font-semibold text-white hover:bg-forest">
            {busy ? <Loader2 className="animate-spin" /> : <UploadCloud />} {busy ? "Uploading…" : "Make the posts"}
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 md:px-10">
        <h2 className="font-heading text-2xl font-bold text-forest md:text-3xl">Past Runs.</h2>
        {!runs ? (
          <p className="mt-4 text-slate">Loading…</p>
        ) : runs.length === 0 ? (
          <p className="mt-4 text-slate">No runs yet. Upload a paper above.</p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {runs.map((run) => (
              <a
                key={run.slug}
                href={`/run/${run.slug}`}
                onClick={(e) => (e.preventDefault(), navigate(`/run/${run.slug}`))}
                className="group flex min-w-0 gap-3 rounded-3xl sm:gap-4 bg-white p-3 shadow-[0_10px_30px_rgba(20,83,45,0.08)] ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="aspect-[4/5] w-20 shrink-0 sm:w-24 overflow-hidden rounded-2xl bg-mint">
                  {run.cover && <img src={run.cover} alt="" className="size-full object-cover" />}
                </div>
                <div className="flex min-w-0 flex-col py-1">
                  <StateTag run={run} />
                  <div className="mt-1 line-clamp-3 break-words font-heading font-semibold leading-snug text-forest [overflow-wrap:anywhere]">{run.title}</div>
                  <div className="mt-auto truncate pt-2 text-xs text-slate">
                    {run.short || run.fileName}
                    {run.hasReel && " · with reel"}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
