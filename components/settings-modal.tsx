"use client"

import { useState, useEffect } from "react"
import { X, RotateCcw, Keyboard, Grid, Moon, Sun, Undo, ChevronRight, ArrowLeft, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useHaloboardStore, DEFAULT_KEYBINDINGS } from "@/lib/store"
import type { Keybindings, Language, GridType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { useTranslation } from "@/lib/i18n"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type View = "main" | "keybindings" | "language"

const FlagIcon = ({ lang }: { lang: Language }) => {
  switch (lang) {
    case "tr":
      return (
        <svg viewBox="0 0 32 32" className="size-6 rounded-full border border-black/10 overflow-hidden">
          <rect width="32" height="32" fill="#E30A17" />
          <circle cx="14" cy="16" r="8" fill="white" />
          <circle cx="16" cy="16" r="6.4" fill="#E30A17" />
          <path d="M21.827,16.897l-0.363-1.117l-0.977-0.663l1.152-0.223l0.558-1.032l0.31,1.133l1.112,0.378l-0.918,0.743l0.182,1.16L21.827,16.897z" fill="white" transform="translate(-1 0.5) scale(1.2)" />
        </svg>
      )
    case "ru":
      return (
        <svg viewBox="0 0 32 32" className="size-6 rounded-full border border-black/10 overflow-hidden">
          <rect width="32" height="10.6" fill="white" />
          <rect y="10.6" width="32" height="10.6" fill="#0039A6" />
          <rect y="21.2" width="32" height="10.8" fill="#D52B1E" />
        </svg>
      )
    case "es":
      return (
        <svg viewBox="0 0 32 32" className="size-6 rounded-full border border-black/10 overflow-hidden">
          <rect width="32" height="8" fill="#AA151B" />
          <rect y="8" width="32" height="16" fill="#F1BF00" />
          <rect y="24" width="32" height="8" fill="#AA151B" />
        </svg>
      )
    case "en":
      return (
        <svg viewBox="0 0 32 32" className="size-6 rounded-full border border-black/10 overflow-hidden">
          <rect width="32" height="32" fill="#00247D" />
          <path d="M0,0 L32,32 M32,0 L0,32" stroke="white" strokeWidth="4" />
          <path d="M16,0 L16,32 M0,16 L32,16" stroke="white" strokeWidth="6" />
          <path d="M16,0 L16,32 M0,16 L32,16" stroke="#CF142B" strokeWidth="3" />
        </svg>
      )
  }
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { 
    keybindings, setKeybinding, resetKeybindings, 
    showGrid, setShowGrid, gridType, setGridType,
    maxUndoSteps, setMaxUndoSteps, 
    highlightColor, setHighlightColor,
    language, setLanguage
  } = useHaloboardStore()
  
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [view, setView] = useState<View>("main")
  const [listeningAction, setListeningAction] = useState<keyof Keybindings | null>(null)

  useEffect(() => setMounted(true), [])

  // Keybinding Listener
  useEffect(() => {
    if (!listeningAction) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      const key = e.key.toLowerCase()
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

  const colors = [ 
    { name: "Blue", value: "#0A84FF" }, 
    { name: "Red", value: "#EF4444" }, 
    { name: "Green", value: "#22C55E" }, 
    { name: "Yellow", value: "#EAB308" }, 
    { name: "Purple", value: "#8B5CF6" } 
  ]

  const actionLabels: Record<keyof Keybindings, string> = {
    select: t("select", "tools") + " Tool",
    brush: t("brush", "tools") + " Tool",
    eraser: t("eraser", "tools") + " Tool",
    shape: t("shape", "tools") + " Tool",
    text: t("text", "tools") + " Tool",
    note: t("note", "tools") + " Tool",
    image: t("image", "tools") + " Tool",
  }

  const languages: { code: Language; name: string }[] = [
    { code: "en", name: "English" },
    { code: "tr", name: "Türkçe" },
    { code: "ru", name: "Русский" },
    { code: "es", name: "Español" },
  ]

  // Override CSS variables for the scope of this modal
  const modalStyle = {
    "--primary": highlightColor,
    "--ring": highlightColor,
  } as React.CSSProperties

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-md rounded-xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/95 overflow-hidden flex flex-col max-h-[85vh]"
        style={modalStyle}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-3">
            {view !== "main" ? (
              <button onClick={() => setView("main")} className="rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/5">
                <ArrowLeft className="size-5 text-neutral-600 dark:text-neutral-400" />
              </button>
            ) : (
              <div className="size-5" /> // Spacer
            )}
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
              {view === "main" ? t("settings") : view === "keybindings" ? t("keybindings") : t("language")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="size-5 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {/* MAIN SETTINGS VIEW */}
          {view === "main" && (
            <div className="space-y-6">
              {/* General Settings */}
              <div className="space-y-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Grid className="size-5 text-neutral-500" />
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t("showGrid")}</span>
                    </div>
                    <Switch checked={showGrid} onCheckedChange={setShowGrid} style={{ "--primary": highlightColor } as React.CSSProperties} />
                  </div>
                  
                  {showGrid && (
                    <div className="flex items-center justify-between pl-8 animate-in slide-in-from-top-2 duration-200">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">{t("gridType")}</span>
                      <Select value={gridType} onValueChange={(v: GridType) => setGridType(v)}>
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dots">{t("dots")}</SelectItem>
                          <SelectItem value="lines">{t("lines")}</SelectItem>
                          <SelectItem value="cross">{t("cross")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {mounted && theme === 'dark' ? <Moon className="size-5 text-neutral-500" /> : <Sun className="size-5 text-neutral-500" />}
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t("darkMode")}</span>
                  </div>
                  <Switch checked={mounted && theme === 'dark'} onCheckedChange={(c) => setTheme(c ? 'dark' : 'light')} style={{ "--primary": highlightColor } as React.CSSProperties} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Undo className="size-5 text-neutral-500" />
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t("maxUndoSteps")}</span>
                  </div>
                  <Input 
                    type="number" 
                    min={1} 
                    max={200} 
                    value={maxUndoSteps} 
                    onChange={(e) => setMaxUndoSteps(Number(e.target.value))} 
                    className="h-8 w-20 text-center focus-visible:ring-[var(--ring)]" 
                  />
                </div>
              </div>

              <div className="h-px bg-neutral-200 dark:bg-neutral-800" />

              {/* Highlight Color */}
              <div>
                <label className="mb-3 block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t("highlightColor")}</label>
                <div className="flex gap-3">
                  {colors.map((c) => (
                    <button 
                      key={c.value} 
                      onClick={() => setHighlightColor(c.value)} 
                      className={cn(
                        "size-8 rounded-full border-2 transition-all", 
                        highlightColor === c.value ? "border-neutral-900 dark:border-white scale-110" : "border-transparent"
                      )} 
                      style={{ backgroundColor: c.value }} 
                      title={c.name} 
                    />
                  ))}
                </div>
              </div>

              <div className="h-px bg-neutral-200 dark:bg-neutral-800" />

              {/* Sub-Menus */}
              <div className="space-y-2">
                <button 
                  onClick={() => setView("language")}
                  className="flex w-full items-center justify-between rounded-lg p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="size-5 text-neutral-500" />
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t("language")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FlagIcon lang={language} />
                    <span className="text-xs text-neutral-500 uppercase">{language}</span>
                    <ChevronRight className="size-4 text-neutral-400" />
                  </div>
                </button>

                <button 
                  onClick={() => setView("keybindings")}
                  className="flex w-full items-center justify-between rounded-lg p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Keyboard className="size-5 text-neutral-500" />
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t("keybindings")}</span>
                  </div>
                  <ChevronRight className="size-4 text-neutral-400" />
                </button>
              </div>
            </div>
          )}

          {/* KEYBINDINGS VIEW */}
          {view === "keybindings" && (
            <div className="space-y-4">
              <div className="space-y-3">
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
                          ? "text-white animate-pulse"
                          : "border-neutral-300 bg-white text-neutral-600 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200"
                      )}
                      style={listeningAction === action ? { backgroundColor: highlightColor, borderColor: highlightColor } : {}}
                    >
                      {listeningAction === action ? "..." : key}
                    </button>
                  </div>
                ))}
              </div>
              
              <Button
                variant="outline"
                onClick={resetKeybindings}
                className="w-full gap-2 text-xs mt-4 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] hover:border-[var(--primary)]"
              >
                <RotateCcw className="size-3" /> {t("resetDefaults")}
              </Button>
            </div>
          )}

          {/* LANGUAGE VIEW */}
          {view === "language" && (
            <div className="space-y-3">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border p-4 transition-all",
                    language === lang.code 
                      ? "bg-[var(--primary)]/5 dark:bg-[var(--primary)]/10" 
                      : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                  )}
                  style={language === lang.code ? { borderColor: highlightColor } : {}}
                >
                  <div className="flex items-center gap-4">
                    <FlagIcon lang={lang.code} />
                    <span className={cn(
                      "text-sm font-medium",
                      language === lang.code ? "text-[var(--primary)]" : "text-neutral-700 dark:text-neutral-300"
                    )}>
                      {lang.name}
                    </span>
                  </div>
                  {language === lang.code && (
                    <div className="size-2 rounded-full" style={{ backgroundColor: highlightColor }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}