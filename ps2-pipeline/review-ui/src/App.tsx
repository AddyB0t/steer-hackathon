import { useEffect, useState } from "react"
import Home from "./Home"
import Run from "./Run"

export default function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const run = path.match(/^\/run\/([a-z0-9-]+)\/?$/)
  return run ? <Run key={run[1]} slug={run[1]} /> : <Home />
}
