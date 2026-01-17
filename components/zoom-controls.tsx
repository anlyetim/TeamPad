"use client"

import { Minus, Plus, Maximize2 } from "lucide-react"
import { useHaloboardStore } from "@/lib/store"

export function ZoomControls() {
  const { zoom, setZoom, setPan } = useHaloboardStore()

  const handleZoomIn = () => setZoom(zoom * 1.2)
  const handleZoomOut = () => setZoom(zoom / 1.2)
  const handleResetView = () => {
    setZoom(1)
    setPan(0, 0)
  }

  return (
    <footer className="fixed bottom-4 right-4 z-30">
      <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/60 p-1 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60">
        <button
          onClick={handleZoomOut}
          className="rounded p-1.5 text-neutral-600 transition-colors hover:bg-[#0A84FF]/10 hover:text-[#0A84FF] dark:text-neutral-400"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-12 text-center text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="rounded p-1.5 text-neutral-600 transition-colors hover:bg-[#0A84FF]/10 hover:text-[#0A84FF] dark:text-neutral-400"
        >
          <Plus className="size-4" />
        </button>
        <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
        <button
          onClick={handleResetView}
          className="rounded p-1.5 text-neutral-600 transition-colors hover:bg-[#0A84FF]/10 hover:text-[#0A84FF] dark:text-neutral-400"
        >
          <Maximize2 className="size-4" />
        </button>
      </div>
    </footer>
  )
}
