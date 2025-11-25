"use client"

import type React from "react"
import { useState } from "react"
import { useHaloboardStore } from "@/lib/store"
import type { ToolType } from "@/lib/types"
import {
  MousePointer2,
  Brush,
  Eraser,
  Shapes,
  Type,
  StickyNote,
  ImageIcon,
} from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function Toolbar() {
  const { activeTool, setActiveTool, highlightColor } = useHaloboardStore()
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const tools: { type: ToolType; icon: React.ElementType; label: string }[] = [
    { type: "select", icon: MousePointer2, label: t("select", "tools") },
    { type: "brush", icon: Brush, label: t("brush", "tools") },
    { type: "eraser", icon: Eraser, label: t("eraser", "tools") },
    { type: "shape", icon: Shapes, label: t("shape", "tools") },
    { type: "text", icon: Type, label: t("text", "tools") },
    { type: "note", icon: StickyNote, label: t("note", "tools") },
    { type: "image", icon: ImageIcon, label: t("image", "tools") },
  ]

  return (
    <aside 
      className={cn(
        "fixed left-4 z-30 flex flex-col gap-1 rounded-xl transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden",
        isCollapsed 
          ? "top-20 translate-y-0 bg-transparent border-transparent shadow-none w-[52px]" 
          : "top-1/2 -translate-y-1/2 border border-white/20 bg-white/60 p-1.5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60 w-[52px]" 
      )}
    >
      {/* Logo/Brand Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "flex size-10 items-center justify-center rounded-lg transition-all duration-500 hover:scale-105 active:scale-95 z-40 mx-auto shrink-0",
          isCollapsed ? "rotate-90" : "rotate-0"
        )}
        style={{ background: `linear-gradient(135deg, ${highlightColor}, ${highlightColor}dd)` }}
        title={isCollapsed ? "Show Toolbar" : "Hide Toolbar"}
      >
        <img 
          src="https://www.svgrepo.com/show/529121/palette-round.svg" 
          alt="TeamPad" 
          className="size-6 brightness-0 invert" 
        />
      </button>

      {/* Tools Container */}
      <div className={cn(
        "flex flex-col gap-1 transition-all duration-500 origin-top w-full items-center",
        isCollapsed ? "opacity-0 max-h-0 mt-0" : "opacity-100 max-h-[500px] mt-2"
      )}>
        {tools.map(({ type, icon: Icon, label }) => {
          const isActive = activeTool === type
          
          return (
            <button
              key={type}
              onClick={() => setActiveTool(type)}
              className={`group relative flex size-9 items-center justify-center rounded-lg transition-all duration-200 shrink-0 ${
                !isActive ? "text-neutral-700 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10" : "text-white"
              }`}
              style={isActive ? { 
                backgroundColor: highlightColor,
                boxShadow: `0 4px 12px -2px ${highlightColor}66`
              } : undefined}
              title={label}
            >
              <Icon className="size-5" />
              {/* Tooltip to the right */}
              {!isCollapsed && (
                <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-neutral-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 z-50">
                  {label}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </aside>
  )
}