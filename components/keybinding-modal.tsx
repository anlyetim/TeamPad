"use client"

import { useState, useEffect } from "react"
import { X, RotateCcw, Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useHaloboardStore, DEFAULT_KEYBINDINGS } from "@/lib/store"
import type { Keybindings } from "@/lib/types"
import { cn } from "@/lib/utils"

interface KeybindingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function KeybindingsModal({ isOpen, onClose }: KeybindingsModalProps) {
  const { keybindings, setKeybinding, resetKeybindings } = useHaloboardStore()
  const [listeningAction, setListeningAction] = useState<keyof Keybindings | null>(null)

  useEffect(() => {
    if (!listeningAction) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      const key = e.key.toLowerCase()
      // Avoid binding Escape as it closes things
      if (key === "escape") {
        setListeningAction(null)
        return
      }
      setKeybinding(listeningAction, key)
      setListeningAction(null)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [listeningAction, setKeybinding])

  if (!isOpen) return null

  const actionLabels: Record<keyof Keybindings, string> = {
    select: "Select Tool",
    brush: "Brush Tool",
    eraser: "Eraser Tool",
    shape: "Shape Tool",
    text: "Text Tool",
    note: "Sticky Note Tool",
    image: "Image Tool",
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/95">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5"
        >
          <X className="size-5 text-neutral-600 dark:text-neutral-400" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
            <Keyboard className="size-5 text-neutral-500" />
          </div>
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
            Keybindings
          </h2>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {Object.entries(keybindings).map(([action, key]) => (
            <div
              key={action}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50"
            >
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {actionLabels[action as keyof Keybindings]}
              </span>
              <button
                onClick={() => setListeningAction(action as keyof Keybindings)}
                className={cn(
                  "min-w-[3rem] rounded-md border px-2 py-1 text-xs font-mono font-bold uppercase transition-all",
                  listeningAction === action
                    ? "border-[#0A84FF] bg-[#0A84FF] text-white animate-pulse"
                    : "border-neutral-300 bg-white text-neutral-600 hover:border-[#0A84FF] dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200"
                )}
              >
                {listeningAction === action ? "..." : key}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={resetKeybindings}
            className="flex-1 gap-2 text-xs"
          >
            <RotateCcw className="size-3" /> Reset Defaults
          </Button>
          <Button 
            onClick={onClose}
            className="flex-1 bg-[#0A84FF] hover:bg-[#0A84FF]/90 text-xs"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}