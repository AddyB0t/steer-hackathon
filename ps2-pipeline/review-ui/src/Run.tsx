import { useEffect, useState } from "react"
import { CheckCircle2, Circle, Loader2, MinusCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Header, card, navigate } from "@/components/shell"
import Review from "./Review"

type Stage = { id: string; label: string; status: "pending" | "running" | "done" | "failed" | "skipped"; detail?: string; startedAt?: string; endedAt?: string }
type Status = { slug: string; fileName: string; state: "queued" | "running" | "done" | "failed"; stages: Stage[]; error?: string; machineSeconds?: number }

const ICON = {
  pending: <Circle className="size-5 text-gray-300" />,
  running: <Loader2 className="size-5 animate-spin text-leaf" />,
  done: <CheckCircle2 className="size-5 text-leaf" />,
  failed: <XCircle className="size-5 text-tomato" />,
  skipped: <MinusCircle className="size-5 text-gray-300" />,
}

function Elapsed({ from }: { from?: string }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
  if (!from) return null
  const s = Math.round((Date.now() - Date.parse(from)) / 1000)
  return <span className="tabular-nums">{Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</span>
}

export default function Run({ slug }: { slug: string }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let stop = false
    const poll = async () => {
      const r = await fetch(`/api/runs/${slug}/status`)
      if (!r.ok) return setMissing(true)
      const s: Status = await r.json()
      if (stop) return
      setStatus(s)
      if (s.state === "queued" || s.state === "running") setTimeout(poll, 2000)
    }
    poll()
    return () => {
      stop = true
    }
  }, [slug])

  if (status?.state === "done") return <Review slug={slug} />

  return (
    <div className="min-h-screen bg-gradient-to-b from-mint via-white to-mint">
      <Header />
      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {missing ? (
          <div className={card}>
            <p className="font-heading text-2xl font-bold text-forest">No run here.</p>
            <Button className="mt-4 rounded-full bg-leaf text-white hover:bg-forest" onClick={() => navigate("/")}>Back home</Button>
          </div>
        ) : !status ? (
          <p className="text-slate">Loading…</p>
        ) : (
          <div className={card}>
            <p className="text-sm font-medium text-slate">{status.fileName}</p>
            <h1 className="mt-1 font-heading text-3xl font-bold text-forest md:text-4xl">
              {status.state === "failed" ? <span className="text-tomato">Run Stopped.</span> : status.state === "queued" ? "In The Queue." : "Reading The Paper."}
            </h1>
            <p className="mt-1 text-pretty text-slate">
              {status.state === "failed" ? "Nothing half-made is shown. Fix the cause and upload again." : "Every number gets checked against the text. Keep this page open, or come back later from Past Runs."}
            </p>

            <ol className="mt-6 flex flex-col gap-1">
              {status.stages.map((s) => (
                <li key={s.id} className={cn("flex gap-3 rounded-2xl px-3 py-3", s.status === "running" && "bg-mint")}>
                  <span className="mt-0.5">{ICON[s.status]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("font-heading font-semibold", s.status === "pending" || s.status === "skipped" ? "text-gray-400" : "text-forest")}>{s.label}</span>
                      {s.status === "running" && <span className="text-sm text-leaf"><Elapsed from={s.startedAt} /></span>}
                      {s.status === "skipped" && <span className="text-xs text-gray-400">off</span>}
                    </div>
                    {s.detail && <p className="mt-0.5 text-pretty text-sm text-slate">{s.detail}</p>}
                  </div>
                </li>
              ))}
            </ol>

            {status.error && <p className="mt-4 break-words rounded-2xl bg-tomato/10 p-4 text-sm text-tomato">{status.error}</p>}
          </div>
        )}
      </section>
    </div>
  )
}
