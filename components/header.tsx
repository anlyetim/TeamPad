"use client"

import { Share2, MoreVertical, Plus, FolderOpen, FilePlus, Check, X, LayoutGrid, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef } from "react"
import { InviteModal } from "@/components/invite-modal"
import { useHaloboardStore } from "@/lib/store"
import { ExportMenu } from "@/components/export-menu"
import { AutoSaveIndicator } from "@/components/auto-save-indicator"
import { useStorage } from "@/lib/storage"
import { useTheme } from "next-themes"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { SettingsModal } from "@/components/settings-modal"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n"

export function Header() {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [projectName, setProjectName] = useState("Untitled Project")
  const [projectMode, setProjectMode] = useState<"infinite" | "fixed">("infinite")
  const [projectWidth, setProjectWidth] = useState(1920)
  const [projectHeight, setProjectHeight] = useState(1080)
  const [projectBg, setProjectBg] = useState("#ffffff")
  
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState("")
  const nameInputRef = useRef<HTMLInputElement>(null)

  const users = useHaloboardStore((state) => state.users)
  const { resetProject, loadProject, canvasSettings, setCanvasSettings, addObject, addLayer, updateLayer, highlightColor, setIsProjectMinimized } = useHaloboardStore()
  const { theme, setTheme } = useTheme()
  const storage = useStorage()
  const { toast } = useToast()
  const { t } = useTranslation()
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  useEffect(() => { return () => { if (storage) storage.stopAutoSave() } }, [storage])

  // Ctrl + S Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        toast({
          description: t("autoSaveMessage"),
          duration: 3000,
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [t, toast])

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

  const handleImportTPAD = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = (event) => { try { const content = event.target?.result as string; const data = JSON.parse(content); if (data.objects && data.layers) loadProject(data); else alert("Invalid .tpad file") } catch (err) { console.error("Failed to parse tpad file", err); alert("Failed to load file") } }; reader.readAsText(file); e.target.value = ''
  }

  const handleImportBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = (event) => {
      const src = event.target?.result as string; const img = new Image(); img.onload = () => {
        const store = useHaloboardStore.getState()
        store.addLayer(t("newLayer") + " " + (store.layers.length + 1)) 
        const { activeLayerId, layers, reorderLayer, updateLayer, addObject } = useHaloboardStore.getState()
        updateLayer(activeLayerId, { name: t("background") })
        reorderLayer(0, layers.length)
        addObject({ 
          id: `bg-${Date.now()}`, 
          name: t("background"), 
          type: "image", 
          layerId: activeLayerId, 
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, anchor: "center" }, 
          data: { src, width: img.width, height: img.height, opacity: 1, blendMode: 'normal' } 
        })
      }; img.src = src;
    }; reader.readAsDataURL(file); e.target.value = '';
  }

  const handleCreateProject = () => { resetProject({ projectName: projectName.trim() || t("untitledProject"), infinite: projectMode === "infinite", width: projectWidth, height: projectHeight, backgroundColor: projectBg }); setShowNewProjectModal(false) }

  const startRenaming = () => {
    setTempName(canvasSettings.projectName)
    setIsEditingName(true)
  }

  const finishRenaming = () => {
    if (tempName.trim()) {
      setCanvasSettings({ projectName: tempName.trim() })
    }
    setIsEditingName(false)
  }

  return (
    <>
      <header className="absolute left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-neutral-200/80 bg-neutral-100/50 px-4 backdrop-blur-sm dark:border-neutral-800/80 dark:bg-neutral-900/50">
        <div className="flex items-center gap-4">
          {/* Dashboard Button - Replaces Menu */}
          <Button 
            variant="ghost" 
            className="gap-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 font-medium text-neutral-700 dark:text-neutral-300"
            onClick={() => setIsProjectMinimized(true)}
          >
            <LayoutGrid className="size-4" /> {/* Using LayoutGrid as icon */}
            {t("dashboard")}
          </Button>

          <div className="h-5 w-px bg-neutral-300 dark:bg-neutral-700" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 hover:bg-neutral-200 dark:hover:bg-neutral-800"><Plus className="size-5 text-neutral-700 dark:text-neutral-300" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setShowNewProjectModal(true)}><FilePlus className="mr-2 size-4" /><span>{t("newProject")}</span></DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}><FolderOpen className="mr-2 size-4" /><span>{t("openTpad")}</span></DropdownMenuItem>
              <DropdownMenuItem onClick={() => imgInputRef.current?.click()}><FolderOpen className="mr-2 size-4" /><span>{t("importImage")}</span></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input type="file" accept=".tpad,.json" ref={fileInputRef} className="hidden" onChange={handleImportTPAD} />
          <input type="file" accept="image/*" ref={imgInputRef} className="hidden" onChange={handleImportBackground} />
          <div className="flex gap-2"><div className="size-3 rounded-full bg-red-500" /><div className="size-3 rounded-full bg-yellow-500" /><div className="size-3 rounded-full bg-green-500" /></div>
        </div>
        
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3">
          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">TeamPad - </span>
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={finishRenaming}
              onKeyDown={(e) => e.key === "Enter" && finishRenaming()}
              className="h-6 w-40 rounded-sm border bg-white px-1 text-sm font-medium text-neutral-900 outline-none dark:bg-neutral-800 dark:text-neutral-100 focus:ring-2"
              style={{ borderColor: highlightColor, "--ring": highlightColor } as React.CSSProperties}
            />
          ) : (
            <h1 
              onClick={startRenaming}
              className="cursor-text rounded-sm px-1 text-sm font-medium text-neutral-900 hover:bg-black/5 dark:text-neutral-100 dark:hover:bg-white/10"
            >
              {canvasSettings.projectName}
            </h1>
          )}
          <AutoSaveIndicator />
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="flex items-center -space-x-2">{users.slice(0, 3).map((user) => (<div key={user.id} className="size-8 rounded-full border-2 border-white dark:border-neutral-800" style={{ backgroundColor: user.color }} title={user.name} />))}{users.length > 3 && (<div className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-neutral-200 text-xs font-semibold text-neutral-600 dark:border-neutral-800 dark:bg-neutral-700 dark:text-neutral-300">+{users.length - 3}</div>)}</div>
          <ExportMenu />
          <Button onClick={() => setShowInviteModal(true)} className="h-8 gap-2 text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: highlightColor }}><Share2 className="size-4" /> {t("share")}</Button>
          
          <Button 
            onClick={() => setShowSettingsModal(true)} 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
          >
            <MoreVertical className="size-4" />
          </Button>
        </div>
      </header>
      
      <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
      
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/95 transition-all" style={{ "--ring": highlightColor } as React.CSSProperties}>
            <button onClick={() => setShowNewProjectModal(false)} className="absolute right-4 top-4 rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5"><X className="size-5 text-neutral-600 dark:text-neutral-400" /></button>
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-6">{t("newProject")}</h2>
            <div className="space-y-6">
              <div className="space-y-2"><Label>Project Name</Label><Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder={t("untitledProject")} className="focus-visible:ring-[var(--ring)]" /></div>
              <div className="space-y-3"><Label className="text-xs font-medium text-neutral-500 uppercase">Canvas Mode</Label><div className="grid grid-cols-2 gap-2"><button onClick={() => setProjectMode("infinite")} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all", projectMode === "infinite" ? "bg-[#0A84FF]/5 text-[#0A84FF]" : "border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-400")} style={{ borderColor: projectMode === "infinite" ? highlightColor : undefined, color: projectMode === "infinite" ? highlightColor : undefined }}><span className="font-semibold">Infinite Canvas</span></button><button onClick={() => setProjectMode("fixed")} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all", projectMode === "fixed" ? "bg-[#0A84FF]/5 text-[#0A84FF]" : "border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-400")} style={{ borderColor: projectMode === "fixed" ? highlightColor : undefined, color: projectMode === "fixed" ? highlightColor : undefined }}><span className="font-semibold">Specific Resolution</span></button></div></div>
              {projectMode === "fixed" && (<div className="space-y-4 animate-in fade-in zoom-in-95 duration-200"><div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>Width (px)</Label><Input type="number" value={projectWidth} onChange={(e) => setProjectWidth(Number(e.target.value))} className="focus-visible:ring-[var(--ring)]" /></div><div className="space-y-1.5"><Label>Height (px)</Label><Input type="number" value={projectHeight} onChange={(e) => setProjectHeight(Number(e.target.value))} className="focus-visible:ring-[var(--ring)]" /></div></div><div className="space-y-2"><Label>Background Color</Label><div className="flex items-center gap-3"><button onClick={() => setProjectBg("#ffffff")} className={cn("size-8 rounded-full border shadow-sm bg-white", projectBg === "#ffffff" && "ring-2 ring-offset-2")} style={{ "--ring": highlightColor } as React.CSSProperties} /><button onClick={() => setProjectBg("#000000")} className={cn("size-8 rounded-full border shadow-sm bg-black", projectBg === "#000000" && "ring-2 ring-offset-2")} style={{ "--ring": highlightColor } as React.CSSProperties} /><div className="relative flex items-center"><input type="color" value={projectBg} onChange={(e) => setProjectBg(e.target.value)} className="size-8 p-0 border-0 rounded-full overflow-hidden cursor-pointer" /></div><span className="text-sm font-mono text-neutral-500 uppercase">{projectBg}</span></div></div></div>)}
              <Button onClick={handleCreateProject} className="w-full hover:opacity-90 gap-2" style={{ backgroundColor: highlightColor }}><Plus className="size-4" /> {t("newProject")}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}