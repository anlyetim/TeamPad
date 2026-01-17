"use client"

import { useState } from "react"
import { Download, FileImage, FileType, FileJson, FileBox, Image as ImageIcon } from "lucide-react"
import { useHaloboardStore } from "@/lib/store"
import { useStorage } from "@/lib/storage"
import { useTranslation } from "@/lib/i18n"

export function ExportMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const storage = useStorage()
  const { t } = useTranslation()

  const handleExportPNG = () => {
    const canvas = document.querySelector("canvas")
    if (canvas && storage) {
      storage.exportAsPNG(canvas)
      setIsOpen(false)
    }
  }

  const handleExportSVG = () => {
    if (storage) {
      storage.exportAsSVG([]) // Placeholder call
      setIsOpen(false)
    }
  }

  const handleExportJSON = () => {
    if (storage) {
      storage.exportAsJSON()
      setIsOpen(false)
    }
  }

  const handleExportTPAD = () => {
    if (storage) {
      storage.exportAsTPAD()
      setIsOpen(false)
    }
  }

  const handleExportPSD = () => {
    const canvas = document.querySelector("canvas")
    if (canvas && storage) {
      storage.exportAsPSD(canvas)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2 text-sm font-medium text-neutral-700 shadow-lg backdrop-blur-xl transition-colors hover:bg-white/80 dark:bg-neutral-900/60 dark:text-neutral-300 dark:hover:bg-neutral-900/80"
      >
        <Download className="size-4" />
        {t("export")}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-white/20 bg-white/90 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/90">
            <div className="p-1 space-y-0.5">
              <button onClick={handleExportTPAD} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/5">
                <FileBox className="size-4" />
                {t("exportTPAD")}
              </button>
              <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-1" />
              <button onClick={handleExportPSD} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/5">
                <ImageIcon className="size-4" />
                {t("exportPSD")}
              </button>
              <button onClick={handleExportPNG} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/5">
                <FileImage className="size-4" />
                {t("exportPNG")}
              </button>
              <button onClick={handleExportSVG} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/5">
                <FileType className="size-4" />
                {t("exportSVG")}
              </button>
              <button onClick={handleExportJSON} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/5">
                <FileJson className="size-4" />
                {t("exportJSON")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}