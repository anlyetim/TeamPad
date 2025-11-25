"use client"

import { useState } from "react"
import { useHaloboardStore } from "@/lib/store"
import { useTranslation } from "@/lib/i18n"
import { 
  LayoutGrid, Clock, Star, Users, Trash2, Search, Plus, 
  MoreVertical, Settings, LogOut, Users2
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SettingsModal } from "./settings-modal"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"

export function Dashboard() {
  const { 
    projects, 
    createNewProject, 
    loadProjectById, 
    deleteProject, 
    highlightColor,
    joinProject // store action
  } = useHaloboardStore()
  
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [showSettings, setShowSettings] = useState(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false) // Join Modal State
  const [searchQuery, setSearchQuery] = useState("")

  // New Project State
  const [projectName, setProjectName] = useState("Untitled Project")
  const [projectMode, setProjectMode] = useState<"infinite" | "fixed">("infinite")
  const [projectWidth, setProjectWidth] = useState(1920)
  const [projectHeight, setProjectHeight] = useState(1080)
  const [projectBg, setProjectBg] = useState("#ffffff")

  // Join Project State
  const [joinCode, setJoinCode] = useState("")
  const [nickname, setNickname] = useState("")

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const timeAgo = (timestamp: number) => {
    try {
      return formatDistanceToNow(timestamp, { addSuffix: true })
    } catch (e) {
      return "recently"
    }
  }

  const handleCreateProject = () => {
     createNewProject({ 
         projectName: projectName.trim() || t("untitledProject"), 
         infinite: projectMode === "infinite", 
         width: projectWidth, 
         height: projectHeight, 
         backgroundColor: projectBg 
     })
     setShowNewProjectModal(false)
  }

  const handleJoinProject = () => {
     if (joinCode.trim() && nickname.trim()) {
         joinProject(joinCode.trim(), nickname.trim())
         setShowJoinModal(false)
     }
  }

  return (
    <div className="flex h-screen w-full bg-[#F9F9F9] dark:bg-[#171717] text-neutral-900 dark:text-neutral-100">
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      
      {/* Join Project Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/95 transition-all" style={{ "--ring": highlightColor } as React.CSSProperties}>
            <button onClick={() => setShowJoinModal(false)} className="absolute right-4 top-4 rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5"><X className="size-5 text-neutral-600 dark:text-neutral-400" /></button>
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-6">{t("joinProject")}</h2>
            <div className="space-y-4">
               <div className="space-y-2">
                   <Label>{t("enterCode")}</Label>
                   <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="e.g. AB12CD" className="focus-visible:ring-[var(--ring)]" />
               </div>
               <div className="space-y-2">
                   <Label>{t("nickname")}</Label>
                   <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Your Name" className="focus-visible:ring-[var(--ring)]" />
               </div>
               <Button onClick={handleJoinProject} className="w-full hover:opacity-90 gap-2" style={{ backgroundColor: highlightColor }}>
                   {t("join")}
               </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal (Reused Logic) */}
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
      
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E]">
        <div className="p-6 flex items-center gap-3">
          <div 
            className="size-8 rounded-lg flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${highlightColor}, ${highlightColor}dd)` }}
          >
            <img 
              src="https://www.svgrepo.com/show/529121/palette-round.svg" 
              alt="TeamPad" 
              className="size-5 brightness-0 invert" 
            />
          </div>
          <span className="font-bold text-xl tracking-tight">TeamPad</span>
        </div>

        <div className="px-3 space-y-1">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "dashboard" 
                ? "bg-[#0A84FF]/10 text-[#0A84FF]" 
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            )}
            style={activeTab === "dashboard" ? { color: highlightColor, backgroundColor: `${highlightColor}15` } : {}}
          >
            <LayoutGrid className="size-4" />
            {t("dashboard")}
          </button>
          <button 
            onClick={() => setActiveTab("recent")}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "recent" 
                ? "bg-[#0A84FF]/10 text-[#0A84FF]" 
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            )}
          >
            <Clock className="size-4" />
            {t("recent")}
          </button>
          <button 
            onClick={() => setActiveTab("favorites")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <Star className="size-4" />
            {t("favorites")}
          </button>
          <button 
            onClick={() => setActiveTab("shared")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <Users className="size-4" />
            {t("sharedWithMe")}
          </button>
          <button 
            onClick={() => setActiveTab("trash")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <Trash2 className="size-4" />
            {t("trash")}
          </button>
        </div>

        <div className="mt-auto p-4 space-y-3">
          <Button 
             variant="outline"
             onClick={() => setShowJoinModal(true)}
             className="w-full gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 border-dashed"
          >
             <Users2 className="size-4" />
             {t("joinProject")}
          </Button>
          
          <Button 
            onClick={() => setShowNewProjectModal(true)}
            className="w-full gap-2 text-white"
            style={{ backgroundColor: highlightColor }}
          >
            <Plus className="size-4" />
            {t("newProject")}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#1E1E1E] flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold">{t("dashboard")}</h1>
          
          <div className="flex items-center gap-4">
             <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-500">
               <Settings className="size-5" />
             </button>
             <Avatar className="size-8">
                <AvatarImage src="/placeholder-user.jpg" />
                <AvatarFallback>U</AvatarFallback>
             </Avatar>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold mb-1">{t("myBoards")}</h2>
              <p className="text-neutral-500 text-sm">An overview of your recent whiteboards.</p>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
              <Input 
                placeholder={t("searchBoards")} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-neutral-100 dark:bg-neutral-800 border-transparent" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {/* Create New Card */}
             <div 
               onClick={() => setShowNewProjectModal(true)}
               className="aspect-[4/3] rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#0A84FF] hover:bg-[#0A84FF]/5 transition-all group"
               style={{ "--hover-color": highlightColor } as React.CSSProperties}
             >
                <div className="size-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="size-6 text-neutral-500" />
                </div>
                <span className="font-medium text-neutral-600 dark:text-neutral-400">{t("newProject")}</span>
             </div>

             {/* Project Cards */}
             {filteredProjects.map((project) => (
               <div key={project.id} className="group relative flex flex-col gap-2">
                 <div 
                   onClick={() => loadProjectById(project.id)}
                   className="aspect-[4/3] rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all relative"
                 >
                   {/* Render Thumbnail if available, else Placeholder */}
                   {project.thumbnail ? (
                     <img src={project.thumbnail} alt={project.name} className="size-full object-cover" />
                   ) : (
                     <div className="absolute inset-0 flex items-center justify-center text-neutral-300 dark:text-neutral-700">
                        <LayoutGrid className="size-12 opacity-20" />
                     </div>
                   )}
                   
                   {/* Overlay Actions */}
                   <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteProject(project.id) }}
                        className="p-1.5 bg-white/90 dark:bg-black/80 rounded-lg text-red-500 hover:text-red-600 shadow-sm"
                      >
                        <Trash2 className="size-4" />
                      </button>
                   </div>
                 </div>
                 
                 <div className="px-1">
                   <h3 className="font-semibold truncate">{project.name}</h3>
                   <p className="text-xs text-neutral-500">{t("edited")} {timeAgo(project.lastEdited)}</p>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </main>
    </div>
  )
}