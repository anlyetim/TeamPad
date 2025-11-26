"use client"

import { useState, useEffect } from "react"
import { useHaloboardStore } from "@/lib/store"
import { useTranslation } from "@/lib/i18n"
import { checkProjectExists } from "@/lib/collaboration"
import {
  LayoutGrid, Clock, Star, Users, Trash2, Plus,
  Settings, Users2, MoreVertical, X
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SettingsModal } from "./settings-modal"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function Dashboard() {
  const { 
    projects, 
    createNewProject, 
    loadProjectById, 
    deleteProject, 
    joinProject,
    canvasSettings
  } = useHaloboardStore()
  
  const { t } = useTranslation()
  const { highlightColor } = useHaloboardStore()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [showSettings, setShowSettings] = useState(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [currentAvatar, setCurrentAvatar] = useState<string>("/placeholder-user.jpg")
  const [isJoining, setIsJoining] = useState(false)

  // New Project State
  const [projectName, setProjectName] = useState("Untitled Project")
  const [projectMode, setProjectMode] = useState<"infinite" | "fixed">("infinite")
  const [projectWidth, setProjectWidth] = useState(1920)
  const [projectHeight, setProjectHeight] = useState(1080)
  const [projectBg, setProjectBg] = useState("#ffffff")
  const [isOnlineProject, setIsOnlineProject] = useState(false)
  const [creatorNickname, setCreatorNickname] = useState("")

  // Join Project State
  const [joinCode, setJoinCode] = useState("")
  const [nickname, setNickname] = useState("")

  // Avatar Data...
  const sampleAvatars = [
    "/placeholder-user.jpg",
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGRkQ3MDAiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxOCIgcj0iMTgiIGZpbGw9IiNGRkRBQzciLz4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxNCIgcj0iMS41IiBmaWxsPSIjMDAwIi8+CjxjaXJjbGUgY3g9IjI1IiBjeT0iMTQiIHI9IjEuNSIgZmlsbD0iIzAwMCIvPgo8cGF0aCBkPSJNMTAgMzBMMzAgMzBMMzAgMzZMMTAgMzBaIiBmaWxsPSIjMDAwIi8+CjxwYXRoIGQ9Ik0xMiAzNkwyOCAzNk0xNiAzOEwyNCAzOE0yMCA0MEwyMCA0MFoiIGZpbGw9IiMwMDAiLz4KPHJlY3QgeD0iMTQiIHk9IjIyIiB3aWR0aD0iMTIiIGhlaWdodD0iMiIgZmlsbD0iIzAwMCIvPgo8L3N2Zz4K",
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGRkQ3MDAiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxOCIgcj0iMTgiIGZpbGw9IiNGRkRBQzciLz4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxNCIgcj0iMS41IiBmaWxsPSIjMDAwIi8+CjxjaXJjbGUgY3g9IjI1IiBjeT0iMTQiIHI9IjEuNSIgZmlsbD0iIzAwMCIvPgo8cGF0aCBkPSJNMTQgMjhMMjYgMjhMMjYgMzJMMTQgMzJaIiBmaWxsPSIjNUE0RjUwIi8+CjxwYXRoIGQ9Ik0xMiAzNkwyOCAzNk0xNiAzOEwyNCAzOE0yMCA0MEwyMCA0MFoiIGZpbGw9IiMwMDAiLz4KPHJlY3QgeD0iMTgiIHk9IjMwIiB3aWR0aD0iNCIgaGVpZ2h0PSIyIiBmaWxsPSIjMDAwIi8+Cjwvc3ZnPgo=",
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGOUE4RDQiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxOCIgcj0iMTgiIGZpbGw9IiNGOUE4RDQiLz4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxNCIgcj0iMS41IiBmaWxsPSIjMDAwIi8+CjxjaXJjbGUgY3g9IjI1IiBjeT0iMTQiIHI9IjEuNSIgZmlsbD0iIzAwMCIvPgo8cGF0aCBkPSJNMTAgMzBMMzAgMzBMMzAgMzZMMTAgMzBaIiBmaWxsPSIjMDAwIi8+CjxwYXRoIGQ9Ik0xMiAzNkwyOCAzNk0xNiAzOEwyNCAzOE0yMCA0MEwyMCA0MFoiIGZpbGw9IiMwMDAiLz4KPHBhdGggZD0iTTggMzJMMTEgMzBMMTEgMzZMOCA0MEw4IDMyTTEgMzJMMTEgMzBaIiBmaWxsPSIjRjY5QjQyIi8+CjxwYXRoIGQ9Ik0zMiAzMkwyOSAzMEwyOSAzM0wzMiA0MEwzMiAzMkwzOSA0MEwyOSA0MFoiIGZpbGw9IiNGNjlCNDIiLz4KPHJlY3QgeD0iMTQiIHk9IjIyIiB3aWR0aD0iMTIiIGhlaWdodD0iMiIgZmlsbD0iIzAwMCIvPgo8L3N2Zz4K",
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGOUI4NTIiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxOCIgcj0iMTgiIGZpbGw9IiNGOUI4NTIiLz4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxNCIgcj0iMS41IiBmaWxsPSIjMDAwIi8+CjxjaXJjbGUgY3g9IjI1IiBjeT0iMTQiIHI9IjEuNSIgZmlsbD0iIzAwMCIvPgo8cGF0aCBkPSJNMTAgMzBMMzAgMzBMMzAgMzZMMTAgMzBaIiBmaWxsPSIjMDAwIi8+CjxwYXRoIGQ9Ik0xMiAzNkwyOCAzNk0xNiAzOEwyNCAzOE0yMCA0MEwyMCA0MFoiIGZpbGw9IiMwMDAiLz4KPHJlY3QgeD0iMTgiIHk9IjMwIiB3aWR0aD0iNCIgaGVpZ2h0PSIyIiBmaWxsPSIjMDAwIi8+Cjwvc3ZnPgo=",
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGOUE4RDQiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxOCIgcj0iMTgiIGZpbGw9IiNGOUE4RDQiLz4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxNCIgcj0iMS41IiBmaWxsPSIjMDAwIi8+CjxjaXJjbGUgY3g9IjI1IiBjeT0iMTQiIHI9IjEuNSIgZmlsbD0iIzAwMCIvPgo8cGF0aCBkPSJNMTAgMzBMMzAgMzBMMzAgMzZMMTAgMzBaIiBmaWxsPSIjMDAwIi8+CjxwYXRoIGQ9Ik0xMiAzNkwyOCAzNk0xNiAzOEwyNCAzOE0yMCA0MEwyMCA0MFoiIGZpbGw9IiMwMDAiLz4KPHJlY3QgeD0iOCIgeT0iOCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjYiIGZpbGw9IiM4QjQ1MTMiLz4KPHJlY3QgeD0iMTQiIHk9IjIyIiB3aWR0aD0iMTIiIGhlaWdodD0iMiIgZmlsbD0iIzAwMCIvPgo8L3N2Zz4K",
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGOUI4NTIiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxOCIgcj0iMTgiIGZpbGw9IiNGOUI4NTIiLz4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxNCIgcj0iMS41IiBmaWxsPSIjMDAwIi8+CjxjaXJjbGUgY3g9IjI1IiBjeT0iMTQiIHI9IjEuNSIgZmlsbD0iIzAwMCIvPgo8cGF0aCBkPSJNMTQgMjhMMjYgMjhMMjYgMzJMMTQgMzJaIiBmaWxsPSIjODI4MjgyIi8+CjxwYXRoIGQ9Ik0xMiAzNkwyOCAzNk0xNiAzOEwyNCAzOE0yMCA0MEwyMCA0MFoiIGZpbGw9IiMwMDAiLz4KPHBhdGggZD0iTTEwIDI2TDI0IDI0WiIgZmlsbD0iIzAwMCIvPgo8cGF0aCBkPSJNMzAgMjZMMTYgMjRaIiBmaWxsPSIjMDAwIi8+Cjwvc3ZnPgo=",
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGOUE4RDQiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxOCIgcj0iMTgiIGZpbGw9IiNGOUE4RDQiLz4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxNCIgcj0iMS41IiBmaWxsPSIjMDAwIi8+CjxjaXJjbGUgY3g9IjI1IiBjeT0iMTQiIHI9IjEuNSIgZmlsbD0iIzAwMCIvPgo8cGF0aCBkPSJNMTAgMzBMMzAgMzBMMzAgMzZMMTAgMzBaIiBmaWxsPSIjMDAwIi8+CjxwYXRoIGQ9Ik0xMiAzNkwyOCAzNk0xNiAzOEwyNCAzOE0yMCA0MEwyMCA0MFoiIGZpbGw9IiMwMDAiLz4KPHJlY3QgeD0iMjgiIHk9IjE2IiB3aWR0aD0iNCIgaGVpZ2h0PSI4IiBmaWxsPSIjRjY5QjQyIi8+CjxyZWN0IHg9IjE0IiB5PSIyMiIgd2lkdGg9IjEyIiBoZWlnaHQ9IjIiIGZpbGw9IiMwMDAiLz4KPHJlY3QgeD0iMjgiIHk9IjI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjRjY5QjQyIi8+Cjwvc3ZnPgo=",
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGOUI4NTIiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxOCIgcj0iMTgiIGZpbGw9IiNGOUI4NTIiLz4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxNCIgcj0iMS41IiBmaWxsPSIjMDAwIi8+CjxjaXJjbGUgY3g9IjI1IiBjeT0iMTQiIHI9IjEuNSIgZmlsbD0iIzAwMCIvPgo8cGF0aCBkPSJNMTAgMzBMMzAgMzBMMzAgMzZMMTAgMzBaIiBmaWxsPSIjMDAwIi8+CjxwYXRoIGQ9Ik0xMiAzNkwyOCAzNk0xNiAzOEwyNCAzOE0yMCA0MEwyMCA0MFoiIGZpbGw9IiMwMDAiLz4KPHJlY3QgeD0iMTIiIHk9IjE2IiB3aWR0aD0iNiIgaGVpZ2h0PSIyIiBmaWxsPSIjMDAwIi8+CjxyZWN0IHg9IjIyIiB5PSIxNiIgd2lkdGg9IjYiIGhlaWdodD0iMiIgZmlsbD0iIzAwMCIvPgo8cGF0aCBkPSJNMTAgMTZMMTIgMTZMMTIgMThMMTAgMThaIiBmaWxsPSIjMDAwIi8+CjxwYXRoIGQ9Ik0yOCAxNkwzMCAxNkwzMCAxOEwyOCAxOFoiIGZpbGw9IiMwMDAiLz4KPC9zdmc+Cg==",
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGOUE4RDQiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxOCIgcj0iMTgiIGZpbGw9IiNGOUE4RDQiLz4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxNCIgcj0iMS41IiBmaWxsPSIjMDAwIi8+CjxjaXJjbGUgY3g9IjI1IiBjeT0iMTQiIHI9IjEuNSIgZmlsbD0iIzAwMCIvPgo8cGF0aCBkPSJNMTAgMzBMMzAgMzBMMzAgMzZMMTAgMzBaIiBmaWxsPSIjMDAwIi8+CjxwYXRoIGQ9Ik0xMiAzNkwyOCAzNk0xNiAzOEwyNCAzOE0yMCA0MEwyMCA0MFoiIGZpbGw9IiMwMDAiLz4KPHJlY3QgeD0iMTQiIHk9IjIyIiB3aWR0aD0iMTIiIGhlaWdodD0iMiIgZmlsbD0iIzAwMCIvPgo8cGF0aCBkPSJNMTYgMTBMMjQgMTBMMjQgMTJMMTYgMTJaIiBmaWxsPSIjRjk3MUEwIi8+Cjwvc3ZnPgo=",
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGOUE4RDQiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxOCIgcj0iMTgiIGZpbGw9IiNGOUE4RDQiLz4KPGNpcmNsZSBjeD0iMTUiIGN5PSIxNCIgcj0iMS41IiBmaWxsPSIjMDAwIi8+CjxjaXJjbGUgY3g9IjI1IiBjeT0iMTQiIHI9IjEuNSIgZmlsbD0iIzAwMCIvPgo8cGF0aCBkPSJNMTAgMzBMMzAgMzBMMzAgMzZMMTAgMzBaIiBmaWxsPSIjMDAwIi8+CjxwYXRoIGQ9Ik0xMiAzNkwyOCAzNk0xNiAzOEwyNCAzOE0yMCA0MEwyMCA0MFoiIGZpbGw9IiMwMDAiLz4KPHJlY3QgeD0iMTQiIHk9IjIyIiB3aWR0aD0iMTIiIGhlaWdodD0iMiIgZmlsbD0iIzAwMCIvPgo8cmVjdCB4PSIxMCIgeT0iOCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjQiIGZpbGw9IiM4MDgwODAiLz4KPHJlY3QgeD0iMTQiIHk9IjEyIiB3aWR0aD0iMTIiIGhlaWdodD0iNCIgZmlsbD0iIzAwMCIvPgo8L3N2Zz4K"
  ]

  const handleAvatarSelect = (avatarSrc: string) => {
    localStorage.setItem('userAvatar', avatarSrc)
    setCurrentAvatar(avatarSrc)
    setShowAvatarSelector(false)
  }

  useEffect(() => {
    const savedAvatar = localStorage.getItem('userAvatar')
    if (savedAvatar) {
      setCurrentAvatar(savedAvatar)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAvatarSelector && !(event.target as Element).closest('.avatar-container')) {
        setShowAvatarSelector(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAvatarSelector])

  const timeAgo = (timestamp: number) => {
    try {
      return formatDistanceToNow(timestamp, { addSuffix: true })
    } catch (e) {
      return "recently"
    }
  }

  const handleCreateProject = () => {
     const nickname = isOnlineProject ? (creatorNickname.trim() || "Host") : undefined
     createNewProject({
         projectName: projectName.trim() || t("untitledProject"),
         infinite: projectMode === "infinite",
         width: projectWidth,
         height: projectHeight,
         backgroundColor: projectBg
     }, isOnlineProject, nickname)
     setShowNewProjectModal(false)
  }

  const handleJoinProject = async () => {
     const trimmedCode = joinCode.trim()
     const trimmedName = nickname.trim()

     if (!trimmedCode) {
         toast({ description: t("enterCode") || "Please enter a code", variant: "destructive" })
         return
     }
     if (!trimmedName) {
         toast({ description: t("enterNickname") || "Please enter a nickname", variant: "destructive" })
         return
     }

     setIsJoining(true)
     
     // Check if project exists in Firebase before joining
     const exists = await checkProjectExists(trimmedCode)
     
     setIsJoining(false)

     if (exists) {
         joinProject(trimmedCode, trimmedName)
         setShowJoinModal(false)
     } else {
         toast({ description: "Incorrect code entered. Project not found.", variant: "destructive" })
     }
  }

  return (
    <div className="flex h-screen w-full bg-[#F9F9F9] dark:bg-[#171717] text-neutral-900 dark:text-neutral-100 font-sans">
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
               <Button onClick={handleJoinProject} disabled={isJoining} className="w-full hover:opacity-90 gap-2" style={{ backgroundColor: highlightColor }}>
                   {isJoining ? "Checking..." : t("join")}
               </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/95 transition-all" style={{ "--ring": highlightColor } as React.CSSProperties}>
            <button onClick={() => setShowNewProjectModal(false)} className="absolute right-4 top-4 rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5"><X className="size-5 text-neutral-600 dark:text-neutral-400" /></button>
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-6">{t("newProject")}</h2>
            <div className="space-y-6">
              <div className="space-y-2"><Label>Project Name</Label><Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder={t("untitledProject")} className="focus-visible:ring-[var(--ring)]" /></div>
              <div className="space-y-3"><Label className="text-xs font-medium text-neutral-500 uppercase">Project Type</Label><div className="grid grid-cols-2 gap-2"><button onClick={() => setIsOnlineProject(false)} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all", !isOnlineProject ? "bg-[#0A84FF]/5 text-[#0A84FF]" : "border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-400")} style={{ borderColor: !isOnlineProject ? highlightColor : undefined, color: !isOnlineProject ? highlightColor : undefined }}><span className="font-semibold">Offline</span><span className="text-xs text-neutral-500">Single user</span></button><button onClick={() => setIsOnlineProject(true)} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all", isOnlineProject ? "bg-[#0A84FF]/5 text-[#0A84FF]" : "border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-400")} style={{ borderColor: isOnlineProject ? highlightColor : undefined, color: isOnlineProject ? highlightColor : undefined }}><span className="font-semibold">Online</span><span className="text-xs text-neutral-500">Multi-user</span></button></div></div>
              {isOnlineProject && (<div className="space-y-2 animate-in fade-in zoom-in-95 duration-200"><Label>Your Nickname</Label><Input value={creatorNickname} onChange={(e) => setCreatorNickname(e.target.value)} placeholder="Enter your name" className="focus-visible:ring-[var(--ring)]" /></div>)}
              <div className="space-y-3"><Label className="text-xs font-medium text-neutral-500 uppercase">Canvas Mode</Label><div className="grid grid-cols-2 gap-2"><button onClick={() => setProjectMode("infinite")} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all", projectMode === "infinite" ? "bg-[#0A84FF]/5 text-[#0A84FF]" : "border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-400")} style={{ borderColor: projectMode === "infinite" ? highlightColor : undefined, color: projectMode === "infinite" ? highlightColor : undefined }}><span className="font-semibold">Infinite Canvas</span></button><button onClick={() => setProjectMode("fixed")} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all", projectMode === "fixed" ? "bg-[#0A84FF]/5 text-[#0A84FF]" : "border-neutral-200 bg-transparent text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-400")} style={{ borderColor: projectMode === "fixed" ? highlightColor : undefined, color: projectMode === "fixed" ? highlightColor : undefined }}><span className="font-semibold">Specific Resolution</span></button></div></div>
              {projectMode === "fixed" && (<div className="space-y-4 animate-in fade-in zoom-in-95 duration-200"><div className="grid grid-cols-2 gap-4"><div className="space-y-1.5"><Label>Width (px)</Label><Input type="number" value={projectWidth} onChange={(e) => setProjectWidth(Number(e.target.value))} className="focus-visible:ring-[var(--ring)]" /></div><div className="space-y-1.5"><Label>Height (px)</Label><Input type="number" value={projectHeight} onChange={(e) => setProjectHeight(Number(e.target.value))} className="focus-visible:ring-[var(--ring)]" /></div></div><div className="space-y-2"><Label>Background Color</Label><div className="flex items-center gap-3"><button onClick={() => setProjectBg("#ffffff")} className={cn("size-8 rounded-full border shadow-sm bg-white", projectBg === "#ffffff" && "ring-2 ring-offset-2")} style={{ "--ring": highlightColor } as React.CSSProperties} /><button onClick={() => setProjectBg("#000000")} className={cn("size-8 rounded-full border shadow-sm bg-black", projectBg === "#000000" && "ring-2 ring-offset-2")} style={{ "--ring": highlightColor } as React.CSSProperties} /><div className="relative flex items-center"><input type="color" value={projectBg} onChange={(e) => setProjectBg(e.target.value)} className="size-8 p-0 border-0 rounded-full overflow-hidden cursor-pointer" /></div><span className="text-sm font-mono text-neutral-500 uppercase">{projectBg}</span></div></div></div>)}
              <Button onClick={handleCreateProject} className="w-full hover:opacity-90 gap-2" style={{ backgroundColor: highlightColor }}><Plus className="size-4" /> {t("newProject")}</Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sidebar */}
      <aside className="w-[240px] flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-[#FAFAFA] dark:bg-[#1E1E1E]">
        <div className="h-16 flex items-center px-5 gap-3 mb-4">
          <div 
            className="size-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${highlightColor}, ${highlightColor}dd)` }}
          >
             <img 
              src="https://www.svgrepo.com/show/529121/palette-round.svg" 
              alt="TeamPad" 
              className="size-5 brightness-0 invert" 
            />
          </div>
          <span className="font-bold text-lg tracking-tight text-neutral-900 dark:text-white">TeamPad</span>
        </div>

        <div className="px-4 mb-6">
          <Button 
            onClick={() => setShowNewProjectModal(true)}
            className="w-full justify-center gap-2 font-semibold shadow-sm hover:opacity-90 h-10 rounded-lg"
            style={{ backgroundColor: highlightColor }}
          >
            <Plus className="size-4" />
            {t("newProject")}
          </Button>
        </div>

        {/* Navigation Menu */}
        <nav className="px-2 space-y-0.5 flex-1">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "dashboard" 
                ? "bg-[#EBF5FF] text-[#0A84FF] dark:bg-[#0A84FF]/20 dark:text-[#3B9EFF]" 
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            )}
          >
            <LayoutGrid className={cn("size-4", activeTab === "dashboard" ? "fill-current" : "")} />
            {t("dashboard")}
          </button>
          
          <button 
            onClick={() => setActiveTab("recent")}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "recent" ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white" : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            )}
          >
            <Clock className="size-4" />
            {t("recent")}
          </button>

          <button 
            onClick={() => setActiveTab("favorites")}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "favorites" ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white" : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            )}
          >
            <Star className="size-4" />
            {t("favorites")}
          </button>

          <button 
            onClick={() => setActiveTab("shared")}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "shared" ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white" : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            )}
          >
            <Users className="size-4" />
            {t("sharedWithMe")}
          </button>

          <button 
            onClick={() => setActiveTab("trash")}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "trash" ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white" : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            )}
          >
            <Trash2 className="size-4" />
            {t("trash")}
          </button>
        </nav>

        {/* Join Project Section at Bottom */}
        <div className="p-4 mt-auto border-t border-neutral-200 dark:border-neutral-800">
           <Button 
             variant="outline"
             onClick={() => setShowJoinModal(true)}
             className="w-full gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 border-dashed text-neutral-600 dark:text-neutral-400 h-9 text-sm"
           >
             <Users2 className="size-4" />
             {t("joinProject")}
           </Button>
        </div>
      </aside>

      {/* Main Dashboard Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#121212]">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-neutral-100 dark:border-neutral-800">
          <h1 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">{t("dashboard")}</h1>
          
          <div className="flex items-center gap-3">
             <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400" onClick={() => setShowSettings(true)}>
                <MoreVertical className="size-5" />
             </Button>

             <div className="relative avatar-container">
               <Avatar
                 className="size-8 cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-neutral-200 transition-all"
                 onClick={() => setShowAvatarSelector(!showAvatarSelector)}
               >
                  <AvatarImage src={currentAvatar} />
                  <AvatarFallback>U</AvatarFallback>
               </Avatar>

               {/* Avatar Selector Dropdown */}
               {showAvatarSelector && (
                 <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-4 z-50">
                   <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-3">Choose Avatar</h3>
                   <div className="grid grid-cols-4 gap-3">
                     {sampleAvatars.map((avatarSrc, index) => (
                       <button
                         key={index}
                         onClick={() => handleAvatarSelect(avatarSrc)}
                         className="size-12 rounded-full overflow-hidden border-2 border-transparent hover:border-[#0A84FF] transition-colors"
                       >
                         {avatarSrc.startsWith('data:') ? (
                           <img src={avatarSrc} alt={`Avatar ${index + 1}`} className="size-full object-cover" />
                         ) : (
                           <img src={avatarSrc} alt={`Avatar ${index + 1}`} className="size-full object-cover" />
                         )}
                       </button>
                     ))}
                   </div>
                   <button
                     onClick={() => setShowAvatarSelector(false)}
                     className="w-full mt-3 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
                   >
                     Cancel
                   </button>
                 </div>
               )}
             </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{t("myBoards")}</h2>
                <p className="text-neutral-500 text-sm">An overview of your recent whiteboards.</p>
              </div>
              
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              
              {/* Create New Card */}
              <div 
                onClick={() => setShowNewProjectModal(true)}
                className="aspect-[1.6/1] rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#0A84FF] hover:bg-[#0A84FF]/5 transition-all group relative overflow-hidden bg-neutral-50/50 dark:bg-neutral-900/50"
                style={{ "--hover-color": highlightColor } as React.CSSProperties}
              >
                  <div className="size-10 rounded-full bg-white dark:bg-neutral-800 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform z-10 border border-neutral-100 dark:border-neutral-700">
                    <Plus className="size-5 text-neutral-500 group-hover:text-[#0A84FF] transition-colors" />
                  </div>
                  <span className="font-medium text-sm text-neutral-600 dark:text-neutral-400 group-hover:text-[#0A84FF] transition-colors z-10">{t("newProject")}</span>
              </div>

              {/* Project Cards */}
              {projects.map((project) => (
                <div key={project.id} className="group flex flex-col gap-2">
                  <div 
                    onClick={() => loadProjectById(project.id)}
                    className="aspect-[1.6/1] rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-1 transition-all relative border border-neutral-200 dark:border-neutral-700"
                  >
                    {/* Thumbnail Logic */}
                    {project.thumbnail ? (
                      <img src={project.thumbnail} alt={project.name} className="size-full object-cover" />
                    ) : (
                      // Colorful placeholder gradient
                      <div 
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ 
                            background: `linear-gradient(135deg, ${highlightColor}22, ${highlightColor}05)`,
                        }}
                      >
                         <LayoutGrid className="size-10 opacity-20 text-neutral-500" />
                      </div>
                    )}
                    
                    {/* Hover Overlay for Actions */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors" />

                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity scale-95 group-hover:scale-100">
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteProject(project.id) }}
                          className="p-1.5 bg-white/90 dark:bg-black/80 rounded-md text-neutral-500 hover:text-red-500 shadow-sm backdrop-blur-sm transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                    </div>
                  </div>
                  
                  <div className="px-1">
                    <h3 className="font-semibold text-sm truncate text-neutral-800 dark:text-neutral-200">{project.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                        <span>{t("edited")} {timeAgo(project.lastEdited)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}