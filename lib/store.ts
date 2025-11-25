import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CanvasObject, Layer, User, ChatMessage, ToolType, BrushSettings, ShapeSettings, HistoryStep, CanvasSettings, Keybindings, Language, GridType, Project, Point } from "./types"
import { getCollaborationManager } from "./collaboration"

const generateKey = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const generateColor = () => {
  const colors = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#0A84FF", "#8B5CF6", "#EC4899"]
  return colors[Math.floor(Math.random() * colors.length)]
}

export const DEFAULT_KEYBINDINGS: Keybindings = {
  select: "v",
  brush: "b",
  eraser: "e",
  shape: "s",
  text: "t",
  note: "n",
  image: "i",
}

interface Notification {
    id: string
    message: string
    type: 'info' | 'success'
}

interface HaloboardState {
  activeView: "dashboard" | "canvas"
  setActiveView: (view: "dashboard" | "canvas") => void
  
  isProjectMinimized: boolean
  setIsProjectMinimized: (minimized: boolean) => void

  projects: Project[]
  currentProjectId: string | null
  saveCurrentProject: (thumbnail?: string) => void
  loadProjectById: (id: string) => void
  createNewProject: (settings: CanvasSettings) => void
  joinProject: (code: string, nickname: string) => void
  deleteProject: (id: string) => void

  notifications: Notification[]
  addNotification: (message: string) => void
  removeNotification: (id: string) => void

  projectKey: string
  setProjectKey: (key: string) => void

  canvasSettings: CanvasSettings
  setCanvasSettings: (settings: Partial<CanvasSettings>) => void

  objects: CanvasObject[]
  layers: Layer[]
  activeLayerId: string
  selectedIds: string[]
  clipboard: CanvasObject[]
  
  history: HistoryStep[]
  historyIndex: number

  showGrid: boolean
  gridType: GridType
  setGridType: (type: GridType) => void
  showTransformHandles: boolean
  maxUndoSteps: number
  highlightColor: string
  
  language: Language
  setLanguage: (lang: Language) => void

  keybindings: Keybindings
  setKeybinding: (action: keyof Keybindings, key: string) => void
  resetKeybindings: () => void

  activeTool: ToolType
  brushSettings: BrushSettings
  shapeSettings: ShapeSettings

  users: User[]
  currentUserId: string
  updateUserCursor: (userId: string, position: Point, name?: string, color?: string) => void
  
  chatMessages: ChatMessage[]
  addChatMessage: (message: ChatMessage, isRemote?: boolean) => void

  zoom: number
  panX: number
  panY: number
  isPanning: boolean

  showPropertiesPanel: boolean
  showChat: boolean

  setActiveTool: (tool: ToolType) => void
  setBrushSettings: (settings: Partial<BrushSettings>) => void
  setShapeSettings: (settings: Partial<ShapeSettings>) => void
  setActiveLayer: (layerId: string) => void
  
  setShowGrid: (show: boolean) => void
  setShowTransformHandles: (show: boolean) => void
  setMaxUndoSteps: (steps: number) => void
  setHighlightColor: (color: string) => void

  loadProject: (data: Partial<HaloboardState>) => void
  resetProject: (settings?: CanvasSettings) => void

  addObject: (object: CanvasObject, isRemote?: boolean) => void
  updateObject: (id: string, updates: Partial<CanvasObject>, isRemote?: boolean) => void
  deleteObject: (id: string, isRemote?: boolean) => void
  
  setSelectedIds: (ids: string[]) => void
  addLayer: (name: string) => void
  updateLayer: (id: string, updates: Partial<Layer>) => void
  deleteLayer: (id: string) => void
  
  moveLayer: (id: string, direction: 'up' | 'down') => void
  reorderLayer: (fromIndex: number, toIndex: number) => void
  moveObjectToLayer: (objectId: string, targetLayerId: string) => void
  reorderObject: (objectId: string, direction: 'up' | 'down') => void 
  reorderObjectInLayer: (objectId: string, targetLayerId: string, newIndex: number) => void
  
  copy: () => void
  paste: () => void
  duplicate: () => void

  undo: () => void
  redo: () => void
  setHistoryIndex: (index: number) => void
  
  addUser: (user: User) => void
  updateUser: (id: string, updates: Partial<User>) => void
  removeUser: (id: string) => void
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  setIsPanning: (isPanning: boolean) => void
  togglePropertiesPanel: () => void
  toggleChat: () => void
}

const initialUserId = `user-${Math.random().toString(36).substr(2, 9)}`

export const useHaloboardStore = create<HaloboardState>()(
  persist(
    (set, get) => ({
      activeView: "dashboard",
      setActiveView: (view) => set({ activeView: view, isProjectMinimized: view === "dashboard" }),
      
      isProjectMinimized: true,
      setIsProjectMinimized: (minimized) => set({ isProjectMinimized: minimized, activeView: minimized ? "dashboard" : "canvas" }),

      projects: [],
      currentProjectId: null,

      notifications: [],
      addNotification: (message) => {
          const id = Math.random().toString(36).substr(2, 9)
          set(state => ({ notifications: [...state.notifications, { id, message, type: 'info' }] }))
          setTimeout(() => get().removeNotification(id), 5000)
      },
      removeNotification: (id) => set(state => ({ notifications: state.notifications.filter(n => n.id !== id) })),

      joinProject: (code, nickname) => {
          const newId = code
          const myColor = generateColor()
          set(state => ({
              currentUserId: initialUserId,
              users: [{ id: initialUserId, name: nickname, color: myColor, lastActive: Date.now() }],
              currentProjectId: newId,
              activeView: "canvas",
              isProjectMinimized: false
          }))
          get().addNotification(`Joined project: ${code} as ${nickname}`)
      },

      saveCurrentProject: (thumbnail) => {
        const state = get()
        if (!state.currentProjectId) return

        const currentProject: Project = {
          id: state.currentProjectId,
          name: state.canvasSettings.projectName,
          lastEdited: Date.now(),
          thumbnail: thumbnail || state.projects.find(p => p.id === state.currentProjectId)?.thumbnail,
          data: {
            objects: state.objects,
            layers: state.layers,
            canvasSettings: state.canvasSettings
          }
        }
        
        set((state) => ({
            projects: [currentProject, ...state.projects.filter(p => p.id !== currentProject.id)]
        }))
      },

      loadProjectById: (id) => {
        const project = get().projects.find(p => p.id === id)
        if (project) {
          set({
            currentProjectId: project.id,
            objects: project.data.objects,
            layers: project.data.layers,
            canvasSettings: project.data.canvasSettings,
            history: [{ objects: project.data.objects, layers: project.data.layers }],
            historyIndex: 0,
            activeView: "canvas",
            isProjectMinimized: false
          })
        }
      },

      createNewProject: (settings) => {
        const newId = generateKey()
        set({
          currentProjectId: newId,
          activeView: "canvas",
          isProjectMinimized: false,
          canvasSettings: settings,
          objects: [],
          layers: [{ id: "layer-1", name: "Layer 1", opacity: 1, blendMode: "normal", visible: true, locked: false, objectIds: [] }],
          history: [{ objects: [], layers: [{ id: "layer-1", name: "Layer 1", opacity: 1, blendMode: "normal", visible: true, locked: false, objectIds: [] }] }],
          historyIndex: 0,
          panX: 0, panY: 0, zoom: 1
        })
        get().saveCurrentProject()
      },

      deleteProject: (id) => set((state) => ({ projects: state.projects.filter(p => p.id !== id) })),

      projectKey: generateKey(),
      
      canvasSettings: {
        projectName: "Untitled Project",
        infinite: true,
        width: 1920,
        height: 1080,
        backgroundColor: "#ffffff"
      },

      objects: [],
      layers: [{ id: "layer-1", name: "Layer 1", opacity: 1, blendMode: "normal", visible: true, locked: false, objectIds: [] }],
      activeLayerId: "layer-1",
      selectedIds: [],
      clipboard: [],
      
      history: [{ objects: [], layers: [{ id: "layer-1", name: "Layer 1", opacity: 1, blendMode: "normal", visible: true, locked: false, objectIds: [] }] }],
      historyIndex: 0,

      showGrid: true,
      gridType: "dots",
      setGridType: (type) => set({ gridType: type }),
      showTransformHandles: true,
      maxUndoSteps: 50,
      highlightColor: "#0A84FF",
      
      language: "en",
      setLanguage: (lang) => set({ language: lang }),

      keybindings: DEFAULT_KEYBINDINGS,
      setKeybinding: (action, key) => set((state) => ({ keybindings: { ...state.keybindings, [action]: key } })),
      resetKeybindings: () => set({ keybindings: DEFAULT_KEYBINDINGS }),

      activeTool: "select",
      brushSettings: { size: 5, opacity: 1, softness: 0.5, color: "#000000", eraserMode: "object" },
      shapeSettings: { shapeType: "rectangle", fillColor: "#E0E0E0", strokeColor: "#000000", strokeWidth: 2, borderType: "solid", opacity: 1 },

      users: [{ id: initialUserId, name: "Me", color: generateColor(), lastActive: Date.now() }],
      currentUserId: initialUserId,
      
      updateUserCursor: (userId, position, name, color) => set((state) => {
         const existingUser = state.users.find(u => u.id === userId)
         if (!existingUser) {
            get().addNotification(`${name || "Someone"} joined!`)
         }
         
         if (existingUser) {
            return {
                users: state.users.map(u => u.id === userId ? { ...u, cursor: position, lastActive: Date.now() } : u)
            }
         } else {
            return {
                users: [...state.users, { id: userId, name: name || "Guest", color: color || "#999", cursor: position, lastActive: Date.now() }]
            }
         }
      }),

      chatMessages: [],
      addChatMessage: (message, isRemote = false) => {
          set((state) => ({ chatMessages: [...state.chatMessages, message] }))
          if (!isRemote) {
              const manager = getCollaborationManager()
              if (manager) manager.broadcastChat(message)
          }
      },

      zoom: 1,
      panX: 0,
      panY: 0,
      isPanning: false,

      showPropertiesPanel: true,
      showChat: true,

      setProjectKey: (key) => set({ projectKey: key }),
      setCanvasSettings: (settings) => {
         set((state) => ({ canvasSettings: { ...state.canvasSettings, ...settings } }))
         get().saveCurrentProject()
      },
      setActiveTool: (tool) => set({ activeTool: tool }),
      setBrushSettings: (settings) => set((state) => ({ brushSettings: { ...state.brushSettings, ...settings } })),
      setShapeSettings: (settings) => set((state) => ({ shapeSettings: { ...state.shapeSettings, ...settings } })),
      setActiveLayer: (layerId) => set({ activeLayerId: layerId }),

      setShowGrid: (show) => set({ showGrid: show }),
      setShowTransformHandles: (show) => set({ showTransformHandles: show }),
      setMaxUndoSteps: (steps) => set({ maxUndoSteps: Math.min(200, Math.max(1, steps)) }),
      setHighlightColor: (color) => set({ highlightColor: color }),

      loadProject: (data) => {
        set((state) => ({ ...state, ...data, history: data.history || [{ objects: data.objects || [], layers: data.layers || [] }], historyIndex: data.historyIndex || 0 }))
        get().saveCurrentProject()
      },

      resetProject: (settings) => {
        const newSettings = settings || { projectName: "Untitled Project", infinite: true, width: 1920, height: 1080, backgroundColor: "#ffffff" }
        get().createNewProject(newSettings)
      },

      addObject: (object, isRemote = false) => {
        set((state) => {
          if (!object.transform.anchor) object.transform.anchor = "top-left"
          if (!object.name) object.name = `${object.type.charAt(0).toUpperCase() + object.type.slice(1)} ${state.objects.filter(o => o.type === object.type).length + 1}`

          const updatedLayers = state.layers.map(layer => {
            if (layer.id === state.activeLayerId) {
              return { ...layer, objectIds: [object.id, ...layer.objectIds] }
            }
            return layer
          })
          const newObjects = [...state.objects, { ...object, layerId: state.activeLayerId }]
          
          const newHistory = state.history.slice(0, state.historyIndex + 1)
          newHistory.push({ objects: newObjects, layers: updatedLayers })
          if (newHistory.length > state.maxUndoSteps) newHistory.shift()
          
          return { objects: newObjects, layers: updatedLayers, history: newHistory, historyIndex: newHistory.length - 1 }
        })
        get().saveCurrentProject()
        
        if (!isRemote) {
            const manager = getCollaborationManager()
            if (manager) manager.broadcastObject(object)
        }
      },

      updateObject: (id, updates, isRemote = false) => {
        set((state) => {
          const obj = state.objects.find(o => o.id === id)
          if (!obj) return state

          const newObjects = state.objects.map((o) => (o.id === id ? { ...o, ...updates } : o))
          return { objects: newObjects }
        })
        
        if (!isRemote) {
           const state = get()
           const updatedObj = state.objects.find(o => o.id === id)
           if (updatedObj) {
               const manager = getCollaborationManager()
               if (manager) manager.broadcastObject(updatedObj)
           }
        }
      },

      deleteObject: (id, isRemote = false) => {
        set((state) => {
          const newObjects = state.objects.filter((obj) => obj.id !== id)
          const newLayers = state.layers.map(layer => ({ ...layer, objectIds: layer.objectIds.filter(objId => objId !== id) }))
          const newHistory = state.history.slice(0, state.historyIndex + 1)
          newHistory.push({ objects: newObjects, layers: newLayers })
          if (newHistory.length > state.maxUndoSteps) newHistory.shift()
          return { objects: newObjects, layers: newLayers, selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id), history: newHistory, historyIndex: newHistory.length - 1 }
        })
        get().saveCurrentProject()

        if (!isRemote) {
            const manager = getCollaborationManager()
            if (manager) manager.broadcastDelete(id)
        }
      },

      setSelectedIds: (ids) => set({ selectedIds: ids }),

      addLayer: (name) => {
        set((state) => {
          const newId = `layer-${Date.now()}`
          const newLayer: Layer = { id: newId, name: name || `Layer ${state.layers.length + 1}`, opacity: 1, blendMode: "normal", visible: true, locked: false, objectIds: [] }
          const newLayers = [newLayer, ...state.layers]
          const newHistory = state.history.slice(0, state.historyIndex + 1)
          newHistory.push({ objects: state.objects, layers: newLayers })
          if (newHistory.length > state.maxUndoSteps) newHistory.shift()
          return { layers: newLayers, activeLayerId: newId, history: newHistory, historyIndex: newHistory.length - 1 }
        })
        get().saveCurrentProject()
      },

      updateLayer: (id, updates) => {
        set((state) => {
          const newLayers = state.layers.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer))
          return { layers: newLayers }
        })
        get().saveCurrentProject()
      },

      deleteLayer: (id) => {
        set((state) => {
          const layerToDelete = state.layers.find(l => l.id === id); if (!layerToDelete) return state
          const objectsToDelete = new Set(layerToDelete.objectIds)
          const newObjects = state.objects.filter(obj => !objectsToDelete.has(obj.id))
          const newLayers = state.layers.filter((layer) => layer.id !== id)
          const newHistory = state.history.slice(0, state.historyIndex + 1)
          newHistory.push({ objects: newObjects, layers: newLayers })
          if (newHistory.length > state.maxUndoSteps) newHistory.shift()
          return { layers: newLayers, objects: newObjects, activeLayerId: state.activeLayerId === id ? newLayers[0]?.id || "" : state.activeLayerId, history: newHistory, historyIndex: newHistory.length - 1 }
        })
        get().saveCurrentProject()
      },

      moveLayer: (id, direction) => {
        set((state) => {
          const index = state.layers.findIndex(l => l.id === id); if (index < 0) return state
          const newLayers = [...state.layers]
          if (direction === 'up' && index > 0) { [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]] }
          else if (direction === 'down' && index < newLayers.length - 1) { [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]] }
          return { layers: newLayers }
        })
        get().saveCurrentProject()
      },

      reorderLayer: (fromIndex, toIndex) => {
        set((state) => {
          const newLayers = [...state.layers]
          const [movedLayer] = newLayers.splice(fromIndex, 1)
          newLayers.splice(toIndex, 0, movedLayer)
          return { layers: newLayers }
        })
        get().saveCurrentProject()
      },

      moveObjectToLayer: (objectId, targetLayerId) => {
        set((state) => {
          const obj = state.objects.find(o => o.id === objectId); if (!obj || obj.layerId === targetLayerId) return state
          const newLayers = state.layers.map(l => {
            if (l.id === obj.layerId) return { ...l, objectIds: l.objectIds.filter(id => id !== objectId) }
            if (l.id === targetLayerId) return { ...l, objectIds: [objectId, ...l.objectIds] }
            return l
          })
          const newObjects = state.objects.map(o => o.id === objectId ? { ...o, layerId: targetLayerId } : o)
          return { layers: newLayers, objects: newObjects }
        })
        get().saveCurrentProject()
      },

      reorderObject: (objectId, direction) => {
        set((state) => {
          const obj = state.objects.find(o => o.id === objectId); if (!obj) return state
          const layer = state.layers.find(l => l.id === obj.layerId); if (!layer) return state
          const currentIdx = layer.objectIds.indexOf(objectId); if (currentIdx < 0) return state
          const newObjectIds = [...layer.objectIds]
          if (direction === 'up' && currentIdx > 0) {
            [newObjectIds[currentIdx], newObjectIds[currentIdx - 1]] = [newObjectIds[currentIdx - 1], newObjectIds[currentIdx]]
          } else if (direction === 'down' && currentIdx < newObjectIds.length - 1) {
            [newObjectIds[currentIdx], newObjectIds[currentIdx + 1]] = [newObjectIds[currentIdx + 1], newObjectIds[currentIdx]]
          } else { return state }
          const newLayers = state.layers.map(l => l.id === layer.id ? { ...l, objectIds: newObjectIds } : l)
          return { layers: newLayers }
        })
        get().saveCurrentProject()
      },

      reorderObjectInLayer: (objectId, targetLayerId, newIndex) => {
        set((state) => {
          const obj = state.objects.find(o => o.id === objectId); if (!obj) return state
          const sourceLayer = state.layers.find(l => l.id === obj.layerId); if (!sourceLayer) return state
          let newLayers = [...state.layers]
          newLayers = newLayers.map(l => {
            if (l.id === obj.layerId) return { ...l, objectIds: l.objectIds.filter(id => id !== objectId) }
            return l
          })
          newLayers = newLayers.map(l => {
            if (l.id === targetLayerId) {
              const newIds = [...l.objectIds]
              newIds.splice(newIndex, 0, objectId)
              return { ...l, objectIds: newIds }
            }
            return l
          })
          const newObjects = state.objects.map(o => o.id === objectId ? { ...o, layerId: targetLayerId } : o)
          return { layers: newLayers, objects: newObjects }
        })
        get().saveCurrentProject()
      },

      copy: () => set((state) => {
        const selected = state.objects.filter(o => state.selectedIds.includes(o.id))
        return { clipboard: selected }
      }),

      paste: () => {
        set((state) => {
          if (state.clipboard.length === 0) return state
          const newObjects: CanvasObject[] = []
          const pastedIds: string[] = []
          state.clipboard.forEach(item => {
            const newId = `${item.type}-${Date.now()}-${Math.random()}`
            const newObj = {
              ...item, id: newId, layerId: state.activeLayerId, name: item.name + " Copy",
              transform: { ...item.transform, x: item.transform.x + 20, y: item.transform.y + 20 }
            }
            newObjects.push(newObj)
            pastedIds.push(newId)
          })
          const updatedLayers = state.layers.map(layer => {
            if (layer.id === state.activeLayerId) return { ...layer, objectIds: [ ...pastedIds, ...layer.objectIds] }
            return layer
          })
          const finalObjects = [...state.objects, ...newObjects]
          return { objects: finalObjects, layers: updatedLayers, selectedIds: pastedIds }
        })
        get().saveCurrentProject()
      },

      duplicate: () => { const state = get(); state.copy(); state.paste() },
      undo: () => {
        set((state) => { if (state.historyIndex > 0) { const prevStep = state.history[state.historyIndex - 1]; return { objects: prevStep.objects, layers: prevStep.layers, historyIndex: state.historyIndex - 1 } } return state })
        get().saveCurrentProject()
      },
      redo: () => {
        set((state) => { if (state.historyIndex < state.history.length - 1) { const nextStep = state.history[state.historyIndex + 1]; return { objects: nextStep.objects, layers: nextStep.layers, historyIndex: state.historyIndex + 1 } } return state })
        get().saveCurrentProject()
      },
      setHistoryIndex: (index) => set((state) => { if (index >= 0 && index < state.history.length) { const step = state.history[index]; return { objects: step.objects, layers: step.layers, historyIndex: index } } return state }),

      addUser: (user) => set((state) => ({ users: [...state.users, user] })),
      updateUser: (id, updates) => set((state) => ({ users: state.users.map((user) => (user.id === id ? { ...user, ...updates } : user)) })),
      removeUser: (id) => set((state) => ({ users: state.users.filter((user) => user.id !== id) })),
      
      setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(zoom, 5)) }),
      setPan: (x, y) => set({ panX: x, panY: y }),
      setIsPanning: (isPanning) => set({ isPanning }),
      togglePropertiesPanel: () => set((state) => ({ showPropertiesPanel: !state.showPropertiesPanel })),
      toggleChat: () => set((state) => ({ showChat: !state.showChat })),
    }),
    {
      name: 'haloboard-storage',
      partialize: (state) => ({
        highlightColor: state.highlightColor,
        maxUndoSteps: state.maxUndoSteps,
        brushSettings: state.brushSettings,
        shapeSettings: state.shapeSettings,
        showGrid: state.showGrid,
        showTransformHandles: state.showTransformHandles,
        keybindings: state.keybindings,
        language: state.language,
        gridType: state.gridType,
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        isProjectMinimized: state.isProjectMinimized,
        activeView: state.activeView,
        currentUserId: state.currentUserId
      }),
    }
  )
)