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
    loadProjectById 
  } = useHaloboardStore()
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [lastProject, setLastProject] = useState<string | null>(null)

  useEffect(() => {
    // Check if there's a last edited project
    if (projects.length > 0) {
      // Sort by last edited
      const sorted = [...projects].sort((a, b) => b.lastEdited - a.lastEdited)
      const recent = sorted[0]
      
      // If we are just loading app (not already in a view explicitly), and there's a recent project
      // Logic: Use a session flag or just show on initial mount
      // Here we just check on mount.
      setLastProject(recent.id)
      setIsOpen(true)
    } else {
      // No projects, go to dashboard
      setActiveView("dashboard")
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-[#1E1E1E] flex flex-col items-center text-center gap-6">
        <div className="size-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <span className="text-3xl">👋</span>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t("welcomeBack")}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400">
            {t("continueOldProject")}
          </p>
        </div>

        <div className="flex flex-col w-full gap-3">
          <Button 
            onClick={handleContinue}
            className="w-full h-11 gap-2 text-base font-semibold shadow-lg hover:scale-[1.02] transition-transform"
            style={{ backgroundColor: highlightColor }}
          >
            {t("yesContinue")} <ArrowRight className="size-4" />
          </Button>
          
          <Button 
            variant="ghost"
            onClick={handleDashboard}
            className="w-full gap-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <LayoutGrid className="size-4" />
            {t("noDashboard")}
          </Button>
        </div>
      </div>
    </div>
  )
}