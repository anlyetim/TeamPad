"use client"

import { useEffect, useState } from "react"
import { Cloud, CloudOff, Check } from "lucide-react"
import { useHaloboardStore } from "@/lib/store"
import { useTranslation } from "@/lib/i18n"

export function AutoSaveIndicator() {
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved")
  const [lastSaved, setLastSaved] = useState<Date>(new Date())
  const objects = useHaloboardStore((state) => state.objects)
  const { t } = useTranslation()

  // Simulate auto-save visual feedback on changes
  useEffect(() => {
    if (objects.length === 0) return

    setStatus("saving")

    // In a real app, this would be tied to the actual save promise
    // Here we just debounce visual feedback since store saves synchronously
    const timer = setTimeout(() => {
      setStatus("saved")
      setLastSaved(new Date())
    }, 800)

    return () => clearTimeout(timer)
  }, [objects])

  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/60 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-xl dark:bg-neutral-900/60">
      {status === "saving" && (
        <>
          <Cloud className="size-3 animate-pulse text-[#0A84FF]" />
          <span className="text-neutral-600 dark:text-neutral-400">Saving...</span>
        </>
      )}

      {status === "saved" && (
        <>
          <Check className="size-3 text-green-500" />
          <span className="text-neutral-600 dark:text-neutral-400">Saved</span>
        </>
      )}

      {status === "error" && (
        <>
          <CloudOff className="size-3 text-red-500" />
          <span className="text-red-600 dark:text-red-400">Failed to save</span>
        </>
      )}
    </div>
  )
}