"use client"

import { Canvas } from "@/components/canvas"
import { Toolbar } from "@/components/toolbar"
import { Header } from "@/components/header"
import { ZoomControls } from "@/components/zoom-controls"
import { RightPanel } from "@/components/right-panel"
import { CollaborationCursors } from "@/components/collaboration-cursors"
import { FloatingChatMessages } from "@/components/floating-chat-messages"
import { Dashboard } from "@/components/dashboard"
import { WelcomeModal } from "@/components/welcome-modal"
import { useIsMobile } from "@/hooks/use-mobile"
import { Smartphone, Maximize2, LayoutGrid, Bell } from "lucide-react"
import { useTheme } from "next-themes"
import { useHaloboardStore } from "@/lib/store"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  const isMobile = useIsMobile()
  const { theme } = useTheme()
  const { activeView, isProjectMinimized, setIsProjectMinimized, canvasSettings, highlightColor, notifications } = useHaloboardStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (isMobile) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-neutral-50 p-4 text-center dark:bg-neutral-950">
        <div className="mb-4 rounded-full bg-neutral-200 p-6 dark:bg-neutral-800">
          <Smartphone className="size-10 text-neutral-500" />
        </div>
        <h1 className="mb-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Mobile support is currently unavailable
        </h1>
        <p className="max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
          Please use a desktop or laptop device to access Haloboard features.
        </p>
      </div>
    )
  }

  const isDark = mounted && theme === 'dark'
  const bgColor = isDark ? '#171717' : '#F9F9F9'

  return (
    <div className="relative h-screen w-full overflow-hidden transition-colors duration-300" style={{ backgroundColor: bgColor }}>
      {/* Notifications Layer */}
      <Toaster />
      <div className="absolute bottom-4 left-4 z-[100] flex flex-col gap-2 pointer-events-none">
         {notifications.map((n) => (
            <div key={n.id} className="flex items-center gap-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3 rounded-lg shadow-lg animate-in slide-in-from-left-5 fade-in duration-300 pointer-events-auto max-w-xs">
                <div className="p-1.5 bg-[#0A84FF]/10 rounded-full">
                   <Bell className="size-4 text-[#0A84FF]" />
                </div>
                <span className="text-sm font-medium">{n.message}</span>
            </div>
         ))}
      </div>

      {/* Welcome Modal on mount */}
      <WelcomeModal />

      {/* DASHBOARD LAYER */}
      <div 
        className={cn(
          "absolute inset-0 z-10 transition-all duration-500 ease-in-out",
          activeView === "dashboard" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        )}
      >
        <Dashboard />
      </div>

      {/* APP LAYER (Canvas + UI) */}
      <div 
        className={cn(
          "absolute transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] shadow-2xl overflow-hidden bg-background",
          isProjectMinimized
            ? "w-64 h-16 right-6 bottom-6 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:scale-105 cursor-pointer z-50 translate-y-0 opacity-100 bg-white dark:bg-[#1E1E1E]"
            : "inset-0 z-0 rounded-none translate-y-0"
        )}
        onClick={() => {
          if (isProjectMinimized) setIsProjectMinimized(false)
        }}
      >
        {/* Minimized View Overlay */}
        {isProjectMinimized ? (
           <div className="flex items-center justify-between w-full h-full px-4">
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg shrink-0">
                   <LayoutGrid className="size-4 text-neutral-600 dark:text-neutral-400" />
                </div>
                <span className="font-medium text-sm text-neutral-800 dark:text-neutral-200 truncate">
                  {canvasSettings.projectName}
                </span>
             </div>
             <div className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                <Maximize2 className="size-4 text-neutral-500" />
             </div>
           </div>
        ) : (
          /* Actual App Content */
          <div className="relative w-full h-full flex flex-col">
             <Header />
             <main className="h-full w-full flex-1 pt-14 relative">
                <div className="relative h-full w-full">
                  <Canvas />
                  <CollaborationCursors />
                  <FloatingChatMessages />
                </div>
             </main>
             <Toolbar />
             <RightPanel />
             <ZoomControls />
          </div>
        )}
      </div>
    </div>
  )
}