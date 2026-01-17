"use client"

import { useState, useEffect } from "react"
import { useHaloboardStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"
import { LayoutGrid, ArrowRight } from "lucide-react"

export function WelcomeModal() {
  const { 
    projects, 
    currentProjectId,
    setActiveView, 
    highlightColor,
    loadProjectById,
    activeView // Check current view
  } = useHaloboardStore()
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [lastProject, setLastProject] = useState<string | null>(null)

  useEffect(() => {
    // Only show if we are NOT already in canvas mode and haven't decided yet
    // Using a session storage flag to avoid showing multiple times per session
    const hasShown = sessionStorage.getItem("haloboard-welcome-shown")

    if (!hasShown && projects.length > 0) {
      // Sort by last edited descending
      const sorted = [...projects].sort((a, b) => b.lastEdited - a.lastEdited)
      const recent = sorted[0]
      
      if (recent) {
          setLastProject(recent.id)
          setIsOpen(true)
      } else {
          setActiveView("dashboard")
      }
      sessionStorage.setItem("haloboard-welcome-shown", "true")
    } else if (!hasShown) {
        // No projects, just go dashboard
        setActiveView("dashboard")
        sessionStorage.setItem("haloboard-welcome-shown", "true")
    }
  }, [])

  if (!isOpen || !lastProject) return null

  const handleContinue = () => {
    loadProjectById(lastProject)
    setIsOpen(false)
  }

  const handleDashboard = () => {
    setActiveView("dashboard")
    setIsOpen(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-[#1E1E1E] flex flex-col items-center text-center gap-6 transform transition-all scale-100">
        <div className="size-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-3xl">
          👋
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t("welcomeBack")}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            {t("continueOldProject")}
          </p>
        </div>

        <div className="flex flex-col w-full gap-3">
          <Button 
            onClick={handleContinue}
            className="w-full h-11 gap-2 text-base font-semibold shadow-lg hover:scale-[1.02] transition-transform text-white"
            style={{ backgroundColor: highlightColor }}
          >
            {t("yesContinue")} <ArrowRight className="size-4" />
          </Button>
          
          <Button 
            variant="ghost"
            onClick={handleDashboard}
            className="w-full gap-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 h-11"
          >
            <LayoutGrid className="size-4" />
            {t("noDashboard")}
          </Button>
        </div>
      </div>
    </div>
  )
}