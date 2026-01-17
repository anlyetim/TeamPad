// components/canvas.tsx - Tool-agnostic canvas with instant local feedback
// Two-state architecture: Persistent Objects + Interaction State
// Continuous 60fps render loop, no delays, no waiting

"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { useHaloboardStore } from "@/lib/store"
import type { Point, CanvasObject, PathData, ShapeData, TextData, NoteData, ImageData } from "@/lib/types"
import { useCollaboration } from "@/lib/collaboration"
import { useTheme } from "next-themes"
import { MousePointer2, Crown, RotateCw, Move, Scaling } from "lucide-react"
import { CollaborationCursors } from "./collaboration-cursors"
import { EditorModal } from "./editor/EditorModal"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { useKeybindings } from "@/hooks/useKeybindings"
import { broadcastCursorLocal } from "@/lib/cursorSync"
import { getEditorRuntime } from "@/lib/editorRuntime"
import { getToolRegistry } from "@/lib/toolRegistry"
import { registerAllTools } from "./tools"

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageCache = useRef<Record<string, HTMLImageElement>>({})

  // Modal state for text/note editing
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'text' | 'note' | null
    objectId: string | null
    position: Point | null
  }>({ isOpen: false, type: null, objectId: null, position: null })

  // Mouse tracking
  const [mousePosition, setMousePosition] = useState<Point>({ x: 0, y: 0 })
  const [cursorType, setCursorType] = useState<string>('default')

  // Editor runtime and tool registry
  const editorRuntime = getEditorRuntime()
  const toolRegistry = getToolRegistry()

  const { theme } = useTheme()
  const store = useHaloboardStore()
  const {
    objects,
    layers,
    activeTool,
    setActiveTool,
    selectedIds,
    setSelectedIds,
    highlightColor,
    canvasSettings,
    zoom,
    panX,
    panY,
    setPan,
    showGrid,
    gridType,
    showTransformHandles,
    setZoom,
    currentUserId,
    currentProjectId,
    users,
    isOnline
  } = store

  const collaboration = useCollaboration(currentProjectId, currentUserId)
  const currentUser = users.find(u => u.id === currentUserId)
  const cursorColor = (isOnline && currentUser && currentUser.isAdmin) ? "#FFD700" : (isOnline && currentUser) ? currentUser.color : null

  // Initialize editor runtime with collaboration callbacks (non-blocking)
  useEffect(() => {
    editorRuntime.setCallbacks({
      onObjectUpdate: (object) => {
        if (collaboration) {
          collaboration.broadcastObjectCommit?.(object)
        }
      },
      onObjectDelete: (objectId) => {
        if (collaboration) {
          collaboration.broadcastObjectDelete?.(objectId)
        }
      },
      onTransformDelta: (delta) => {
        if (collaboration) {
          collaboration.broadcastTransformDelta?.(delta.objectId, delta.delta)
        }
      },
      onTextLiveUpdate: (update) => {
        if (collaboration) {
          collaboration.broadcastTextLive?.(update.objectId, update.content)
        }
      },
      onSnapshotRequest: () => {
        if (collaboration) {
          collaboration.requestSnapshot?.()
        }
      }
    })
  }, [editorRuntime, collaboration])

  // Coordinate conversion functions
  const screenToCanvas = useCallback((screenPoint: Point): Point => {
    const canvas = canvasRef.current
    if (!canvas) return screenPoint

    const rect = canvas.getBoundingClientRect()
    const canvasX = screenPoint.x - rect.left
    const canvasY = screenPoint.y - rect.top

    return {
      x: (canvasX - panX) / zoom,
      y: (canvasY - panY) / zoom
    }
  }, [zoom, panX, panY])

  const canvasToScreen = useCallback((canvasPoint: Point): Point => {
    const canvas = canvasRef.current
    if (!canvas) return canvasPoint

    const rect = canvas.getBoundingClientRect()
    return {
      x: canvasPoint.x * zoom + panX + rect.left,
      y: canvasPoint.y * zoom + panY + rect.top
    }
  }, [zoom, panX, panY])

  // Get object at point (for tool registry context)
  const getObjectAtPoint = useCallback((point: Point): CanvasObject | null => {
    for (const layer of [...layers].reverse()) {
      if (!layer.visible) continue

      for (const objectId of [...layer.objectIds].reverse()) {
        const object = objects.find(o => o.id === objectId)
        if (!object) continue

        const bounds = getObjectBounds(object)
        if (point.x >= bounds.left && point.x <= bounds.right &&
            point.y >= bounds.top && point.y <= bounds.bottom) {
          return object
        }
      }
    }

    return null
  }, [objects, layers])

  // Helper to get object bounds
  function getObjectBounds(obj: CanvasObject): { left: number; top: number; right: number; bottom: number } {
    const { width, height } = getObjectDimensions(obj)
    return {
      left: obj.transform.x,
      top: obj.transform.y,
      right: obj.transform.x + width * obj.transform.scaleX,
      bottom: obj.transform.y + height * obj.transform.scaleY
    }
  }

  function getObjectDimensions(obj: CanvasObject): { width: number; height: number } {
    switch (obj.type) {
      case 'path':
        const pathData = obj.data as PathData
        if (!pathData.points || pathData.points.length < 2) return { width: 0, height: 0 }
        const xs = pathData.points.map(p => p.x)
        const ys = pathData.points.map(p => p.y)
        return {
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys)
        }
      case 'shape':
        const shapeData = obj.data as ShapeData
        return { width: shapeData.width, height: shapeData.height }
      case 'text':
        const textData = obj.data as TextData
        return { width: textData.width, height: textData.height }
      case 'note':
        const noteData = obj.data as NoteData
        return { width: noteData.width, height: noteData.height }
      case 'image':
        const imageData = obj.data as ImageData
        return { width: imageData.width, height: imageData.height }
      default:
        return { width: 0, height: 0 }
    }
  }

  // Register all tools and setup tool registry context
  useEffect(() => {
    registerAllTools()

    toolRegistry.setContext({
      canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
      containerRef: containerRef as React.RefObject<HTMLDivElement>,
      zoom,
      panX,
      panY,
      screenToCanvas,
      canvasToScreen,
      getObjectAtPoint,
      selectedIds,
      setSelectedIds,
      activeTool,
      setActiveTool,
      openModal: (type, objectId, position) => {
        setModalState({ isOpen: true, type, objectId, position })
      },
      closeModal: () => {
        setModalState({ isOpen: false, type: null, objectId: null, position: null })
      }
    })

    toolRegistry.switchTool(activeTool)
  }, [])

  // Update tool registry context when values change
  useEffect(() => {
    const context = toolRegistry.getContext()
    if (context) {
      toolRegistry.setContext({
        ...context,
        zoom,
        panX,
        panY,
        selectedIds,
        activeTool
      })
    }
  }, [zoom, panX, panY, selectedIds, activeTool])

  // Switch tool when activeTool changes
  useEffect(() => {
    toolRegistry.switchTool(activeTool)
  }, [activeTool])

  // Global mouse tracking
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [])

  // Canvas resize and setup
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.scale(dpr, dpr)
      }
    }

    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    updateSize()

    return () => observer.disconnect()
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      Object.values(imageCache.current).forEach(img => {
        img.src = ''
      })
      imageCache.current = {}

      if (scratchCanvasRef.current) {
        scratchCanvasRef.current.width = 1
        scratchCanvasRef.current.height = 1
        scratchCanvasRef.current = null
      }
    }
  }, [])

  // Prevent native browser zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
      }
    }
    window.addEventListener("wheel", handleWheel, { passive: false })
    return () => window.removeEventListener("wheel", handleWheel)
  }, [])

  // CONTINUOUS 60fps render loop - NO dirty flags, always renders
  useEffect(() => {
    let animationFrameId: number

    const render = () => {
      const canvas = canvasRef.current
      if (!canvas) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      renderCanvas(ctx)
      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [objects, layers, zoom, panX, panY, theme, showGrid, gridType, canvasSettings, highlightColor, modalState, selectedIds, showTransformHandles])

  // Keyboard shortcuts
  useKeyboardShortcuts()
  useKeybindings()

  // Broadcast cursor updates
  useEffect(() => {
    if (collaboration && mousePosition) {
      broadcastCursorLocal(mousePosition)
    }
  }, [activeTool, collaboration, mousePosition])

  // Pointer event handlers - delegate to tool registry immediately
  const handlePointerDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return

    const canvasPoint = screenToCanvas({ x: e.clientX, y: e.clientY })
    toolRegistry.handleMouseDown(e, canvasPoint)

    const cursor = toolRegistry.getCursor(canvasPoint)
    setCursorType(cursor)
  }, [screenToCanvas, toolRegistry])

  const handlePointerMove = useCallback((e: React.MouseEvent) => {
    const canvasPoint = screenToCanvas({ x: e.clientX, y: e.clientY })
    toolRegistry.handleMouseMove(e, canvasPoint)

    const cursor = toolRegistry.getCursor(canvasPoint)
    setCursorType(cursor)

    if (collaboration) {
      broadcastCursorLocal(canvasPoint)
    }
  }, [screenToCanvas, toolRegistry, collaboration])

  const handlePointerUp = useCallback((e: React.MouseEvent) => {
    const canvasPoint = screenToCanvas({ x: e.clientX, y: e.clientY })
    toolRegistry.handleMouseUp(e, canvasPoint)

    const cursor = toolRegistry.getCursor(canvasPoint)
    setCursorType(cursor)
  }, [screenToCanvas, toolRegistry])

  // Double-click handler - must be reliable, no debounce
  const doubleClickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastClickTimeRef = useRef<number>(0)
  const lastClickPointRef = useRef<Point | null>(null)

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // Clear any pending single-click timeout
    if (doubleClickTimeoutRef.current) {
      clearTimeout(doubleClickTimeoutRef.current)
      doubleClickTimeoutRef.current = null
    }

    const canvasPoint = screenToCanvas({ x: e.clientX, y: e.clientY })
    toolRegistry.handleDoubleClick?.(e, canvasPoint)
  }, [screenToCanvas, toolRegistry])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoom(zoom * delta)
    } else {
      setPan(panX - e.deltaX, panY - e.deltaY)
    }
  }, [zoom, panX, panY, setZoom, setPan])

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      toolRegistry.handleKeyDown(e)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      toolRegistry.handleKeyUp(e)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [toolRegistry])

  // Imperative render function - renders every frame
  const renderCanvas = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const logicalWidth = canvas.width / (window.devicePixelRatio || 1)
    const logicalHeight = canvas.height / (window.devicePixelRatio || 1)

    // Clear canvas
    if (theme === 'dark') {
      ctx.fillStyle = "#171717"
      ctx.fillRect(0, 0, logicalWidth, logicalHeight)
    } else {
      ctx.clearRect(0, 0, logicalWidth, logicalHeight)
    }

    // Render grid
    if (showGrid) {
      ctx.save()
      ctx.translate(panX, panY)
      ctx.scale(zoom, zoom)
      const gridSize = 20
      const gridColor = theme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
      ctx.fillStyle = gridColor
      ctx.strokeStyle = gridColor
      ctx.lineWidth = 1 / zoom

      const startX = -panX / zoom
      const startY = -panY / zoom
      const endX = startX + logicalWidth / zoom
      const endY = startY + logicalHeight / zoom

      const left = Math.floor(startX / gridSize) * gridSize
      const top = Math.floor(startY / gridSize) * gridSize
      const right = Math.ceil(endX / gridSize) * gridSize
      const bottom = Math.ceil(endY / gridSize) * gridSize

      ctx.beginPath()
      if (gridType === 'lines' || gridType === 'grid') {
        for (let x = left; x <= right; x += gridSize) {
          ctx.moveTo(x, top)
          ctx.lineTo(x, bottom)
        }
        if (gridType === 'grid') {
          for (let y = top; y <= bottom; y += gridSize) {
            ctx.moveTo(left, y)
            ctx.lineTo(right, y)
          }
        }
      } else {
        for (let x = left; x <= right; x += gridSize) {
          for (let y = top; y <= bottom; y += gridSize) {
            if (gridType === 'dots') {
              ctx.fillRect(x - 1 / zoom, y - 1 / zoom, 2 / zoom, 2 / zoom)
            } else if (gridType === 'cross') {
              const size = 4 / zoom
              ctx.moveTo(x - size, y)
              ctx.lineTo(x + size, y)
              ctx.moveTo(x, y - size)
              ctx.lineTo(x, y + size)
            }
          }
        }
      }
      ctx.stroke()
      ctx.restore()
    }

    // Transform for canvas space
    ctx.save()
    ctx.translate(panX, panY)
    ctx.scale(zoom, zoom)

    // Render canvas background (if not infinite)
    if (!canvasSettings.infinite) {
      ctx.shadowColor = "rgba(0,0,0,0.1)"
      ctx.shadowBlur = 20
      ctx.shadowOffsetY = 4
      ctx.fillStyle = canvasSettings.backgroundColor
      ctx.fillRect(0, 0, canvasSettings.width, canvasSettings.height)
      ctx.shadowColor = "transparent"
    }

    // STATE A: Render Persistent Objects (finalized objects)
    [...layers].reverse().forEach(layer => {
      if (!layer.visible) return

      const layerOpacity = layer.opacity ?? 1
      const layerBlendMode = layer.blendMode ?? 'normal'

      if (layerOpacity === 0) return

      [...layer.objectIds].reverse().forEach(objId => {
        const obj = objects.find(o => o.id === objId)
        if (!obj || (modalState.isOpen && modalState.objectId === obj.id)) return

        const { width, height } = getObjectDimensions(obj)
        const anchor = getAnchorOffset(obj, width, height)

        ctx.save()

        ctx.globalAlpha = layerOpacity
        ctx.globalCompositeOperation = layerBlendMode === 'normal' ? 'source-over' : layerBlendMode as GlobalCompositeOperation

        ctx.translate(obj.transform.x, obj.transform.y)
        ctx.translate(anchor.x * obj.transform.scaleX, anchor.y * obj.transform.scaleY)
        ctx.rotate((obj.transform.rotation * Math.PI) / 180)
        ctx.scale(obj.transform.scaleX, obj.transform.scaleY)
        ctx.translate(-anchor.x, -anchor.y)

        switch (obj.type) {
          case "path":
            renderPath(ctx, obj)
            break
          case "shape":
            renderShape(ctx, obj)
            break
          case "text":
            renderText(ctx, obj)
            break
          case "note":
            renderNote(ctx, obj)
            break
          case "image":
            renderImage(ctx, obj)
            break
        }

        ctx.restore()
      })
    })

    // STATE B: Render Interaction State (live tool previews, handles, etc.)
    // This renders on top of persistent objects
    toolRegistry.renderOverlay(ctx)

    ctx.restore()
  }, [objects, layers, zoom, panX, panY, theme, showGrid, gridType, canvasSettings, highlightColor, modalState, selectedIds, showTransformHandles, toolRegistry])

  // Object rendering functions
  function getAnchorOffset(obj: CanvasObject, width: number, height: number): Point {
    const anchor = obj.transform.anchor || 'top-left'
    let x = 0, y = 0
    if (anchor.includes('center')) x = width / 2
    if (anchor.includes('right')) x = width
    if (anchor.includes('bottom')) y = height
    if (anchor === 'center') { x = width / 2; y = height / 2 }
    return { x, y }
  }

  function renderPath(ctx: CanvasRenderingContext2D, obj: CanvasObject) {
    const data = obj.data as PathData
    if (!data.points || data.points.length < 2) return

    if (data.erasePaths && data.erasePaths.length > 0) {
      if (!scratchCanvasRef.current) {
        scratchCanvasRef.current = document.createElement('canvas')
      }
      const scratch = scratchCanvasRef.current
      if (scratch.width !== ctx.canvas.width || scratch.height !== ctx.canvas.height) {
        scratch.width = ctx.canvas.width
        scratch.height = ctx.canvas.height
      } else {
        const sCtx = scratch.getContext('2d')
        sCtx?.clearRect(0, 0, scratch.width, scratch.height)
      }

      const sCtx = scratch.getContext('2d')
      if (!sCtx) return

      const transform = ctx.getTransform()
      sCtx.setTransform(transform)

      sCtx.globalAlpha *= data.opacity
      sCtx.strokeStyle = data.strokeColor
      sCtx.lineWidth = data.strokeWidth
      sCtx.lineCap = "round"
      sCtx.lineJoin = "round"
      sCtx.setLineDash([])
      sCtx.beginPath()
      sCtx.moveTo(data.points[0].x, data.points[0].y)
      for (let i = 1; i < data.points.length; i++) {
        sCtx.lineTo(data.points[i].x, data.points[i].y)
      }
      sCtx.stroke()

      sCtx.globalCompositeOperation = 'destination-out'
      data.erasePaths.forEach(path => {
        if (!path.points || path.points.length === 0) return
        sCtx.lineWidth = path.width || data.strokeWidth
        sCtx.beginPath()
        sCtx.moveTo(path.points[0].x, path.points[0].y)
        if (path.points.length === 1) {
          sCtx.lineTo(path.points[0].x, path.points[0].y)
        } else {
          for (let i = 1; i < path.points.length; i++) {
            sCtx.lineTo(path.points[i].x, path.points[i].y)
          }
        }
        sCtx.stroke()
      })

      sCtx.globalCompositeOperation = 'source-over'

      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(scratch, 0, 0)
      ctx.restore()
    } else {
      ctx.globalAlpha *= data.opacity
      ctx.strokeStyle = data.strokeColor
      ctx.lineWidth = data.strokeWidth
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(data.points[0].x, data.points[0].y)
      for (let i = 1; i < data.points.length; i++) {
        ctx.lineTo(data.points[i].x, data.points[i].y)
      }
      ctx.stroke()
    }
  }

  function renderShape(ctx: CanvasRenderingContext2D, obj: CanvasObject) {
    const data = obj.data as ShapeData
    ctx.globalAlpha *= data.opacity
    ctx.setLineDash([])

    let lineWidth = data.strokeWidth
    if (data.borderType === 'dashed') ctx.setLineDash([10, 10])
    if (data.borderType === 'dotted') ctx.setLineDash([3, 5])
    if (data.borderType === 'bold') lineWidth = data.strokeWidth * 2
    if (data.borderType === 'none') lineWidth = 0

    ctx.lineWidth = lineWidth
    ctx.strokeStyle = data.strokeColor
    ctx.fillStyle = data.fillColor

    ctx.beginPath()
    const w = data.width
    const h = data.height

    switch (data.shapeType) {
      case "rectangle":
        ctx.rect(0, 0, w, h)
        break
      case "rounded_rectangle":
        ctx.roundRect(0, 0, w, h, Math.min(w, h) * 0.2)
        break
      case "ellipse":
        ctx.ellipse(w / 2, h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2)
        break
      case "circle":
        const radius = Math.min(Math.abs(w), Math.abs(h)) / 2
        ctx.ellipse(w / 2, h / 2, radius, radius, 0, 0, Math.PI * 2)
        break
      case "triangle":
        ctx.moveTo(w / 2, 0)
        ctx.lineTo(w, h)
        ctx.lineTo(0, h)
        ctx.closePath()
        break
      case "arrow": {
        const head = Math.min(Math.abs(w), Math.abs(h)) * 0.3
        ctx.moveTo(0, h / 3)
        ctx.lineTo(w - head, h / 3)
        ctx.lineTo(w - head, 0)
        ctx.lineTo(w, h / 2)
        ctx.lineTo(w - head, h)
        ctx.lineTo(w - head, h * 2 / 3)
        ctx.lineTo(0, h * 2 / 3)
        ctx.closePath()
        break
      }
      case "star": {
        const cx = w / 2, cy = h / 2, or = Math.min(w, h) / 2, ir = or / 2.5
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? or : ir
          const a = (Math.PI / 5) * i - Math.PI / 2
          if (i === 0) {
            ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
          } else {
            ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
          }
        }
        ctx.closePath()
        break
      }
      default:
        ctx.rect(0, 0, w, h)
    }

    if (data.fillColor) ctx.fill()
    if (data.borderType !== 'none') ctx.stroke()
  }

  function renderText(ctx: CanvasRenderingContext2D, obj: CanvasObject) {
    const data = obj.data as TextData
    const fontWeight = data.fontWeight === 'bold' ? 'bold' : 'normal'
    const fontStyle = data.fontStyle === 'italic' ? 'italic' : 'normal'
    ctx.font = `${fontStyle} ${fontWeight} ${data.fontSize}px ${data.fontFamily}`
    ctx.fillStyle = data.color
    ctx.textBaseline = "top"
    ctx.textAlign = data.align || "left"
    ctx.setLineDash([])

    const lines = data.content.split("\n")
    const lineHeight = data.fontSize * 1.2
    let xOffset = 0
    if (data.align === "center") xOffset = data.width / 2
    if (data.align === "right") xOffset = data.width

    lines.forEach((line, i) => {
      const y = i * lineHeight
      ctx.fillText(line, xOffset, y)

      if (data.textDecoration === 'underline') {
        const metrics = ctx.measureText(line)
        let underlineX = xOffset
        if (data.align === "center") underlineX = xOffset - metrics.width / 2
        else if (data.align === "right") underlineX = xOffset - metrics.width

        ctx.beginPath()
        ctx.strokeStyle = data.color
        ctx.lineWidth = Math.max(1, data.fontSize / 12)
        ctx.moveTo(underlineX, y + data.fontSize * 0.9)
        ctx.lineTo(underlineX + metrics.width, y + data.fontSize * 0.9)
        ctx.stroke()
      }
    })
  }

  function renderNote(ctx: CanvasRenderingContext2D, obj: CanvasObject) {
    const data = obj.data as NoteData
    const cornerRadius = data.cornerRadius || 12

    ctx.fillStyle = data.backgroundColor || '#FFF2CC'
    ctx.beginPath()
    ctx.roundRect(0, 0, data.width, data.height, cornerRadius)
    ctx.fill()

    if (data.backgroundType === 'grid') {
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      ctx.lineWidth = 1
      const gridSize = 20
      for (let x = 0; x < data.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, data.height)
        ctx.stroke()
      }
      for (let y = 0; y < data.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(data.width, y)
        ctx.stroke()
      }
    } else if (data.backgroundType === 'lined') {
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'
      ctx.lineWidth = 1
      const lineSpacing = 24
      for (let y = lineSpacing; y < data.height; y += lineSpacing) {
        ctx.beginPath()
        ctx.moveTo(8, y)
        ctx.lineTo(data.width - 8, y)
        ctx.stroke()
      }
    } else if (data.backgroundType === 'striped') {
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      ctx.lineWidth = 2
      const stripeHeight = 12
      for (let y = 0; y < data.height; y += stripeHeight * 2) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(data.width, y)
        ctx.stroke()
      }
    }

    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(0, 0, data.width, data.height, cornerRadius)
    ctx.stroke()

    ctx.fillStyle = '#000000'
    ctx.font = `${data.fontSize || 14}px ${data.fontFamily || 'Inter'}, sans-serif`
    ctx.textBaseline = "top"
    ctx.setLineDash([])
    ctx.textAlign = 'left'

    const padding = 12
    const lines = (data.content || '').split("\n")
    const lineHeight = (data.fontSize || 14) * 1.2

    lines.forEach((line, i) => {
      ctx.fillText(line, padding, padding + i * lineHeight, data.width - padding * 2)
    })
  }

  function renderImage(ctx: CanvasRenderingContext2D, obj: CanvasObject) {
    const data = obj.data as ImageData
    ctx.globalAlpha *= data.opacity
    const blend = (data.blendMode && data.blendMode !== 'normal') ? data.blendMode : 'source-over'
    ctx.globalCompositeOperation = blend as GlobalCompositeOperation
    ctx.setLineDash([])

    if (data.src && !data.src.startsWith('/placeholder')) {
      let img = imageCache.current[data.src]
      if (!img) {
        img = new Image()
        img.src = data.src
        img.onload = () => {
          // Trigger re-render when image loads
          const canvas = canvasRef.current
          if (canvas) {
            const ctx = canvas.getContext("2d")
            if (ctx) renderCanvas(ctx)
          }
        }
        imageCache.current[data.src] = img
      }
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, data.width, data.height)
        return
      }
    }

    ctx.fillStyle = "#e0e0e0"
    ctx.fillRect(0, 0, data.width, data.height)
    ctx.strokeStyle = "#999999"
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, data.width, data.height)
    ctx.fillStyle = "#666666"
    ctx.font = "48px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("🖼️", data.width / 2, data.height / 2)
  }

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{
          cursor: cursorType === 'move' ? 'move' :
            cursorType === 'grabbing' ? 'grabbing' :
              cursorType === 'nw-resize' ? 'nw-resize' :
                cursorType === 'ne-resize' ? 'ne-resize' :
                  cursorType === 'ns-resize' ? 'ns-resize' :
                    cursorType === 'ew-resize' ? 'ew-resize' :
                      cursorType === 'crosshair' ? 'crosshair' :
                        cursorType === 'text' ? 'text' :
                          cursorType === 'rotate' ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12a9 9 0 1 1-9-9c2.52 0 4.85.85 6.71 2.29'/%3E%3Cpath d='M21 3v6h-6'/%3E%3C/svg%3E") 12 12, crosshair` :
                            cursorType === 'resize' ? 'nw-resize' : 'default'
        }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />
      <CollaborationCursors />

      {/* Global cursor */}
      {cursorColor && (
        <div
          className="pointer-events-none fixed z-[9999]"
          style={{
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y}px`,
            transform: "translate(-2px, -2px)",
          }}
        >
          {cursorType === 'rotate' ? (
            <div className="relative">
              <RotateCw className="size-5 animate-spin-slow drop-shadow-md" style={{ color: cursorColor }} />
            </div>
          ) : cursorType === 'resize' ? (
            <div className="relative">
              <Scaling className="size-5 drop-shadow-md" style={{ color: cursorColor }} />
            </div>
          ) : cursorType === 'move' ? (
            <div className="relative">
              <Move className="size-5 drop-shadow-md" style={{ color: cursorColor }} />
            </div>
          ) : (
            <div className="relative">
              <MousePointer2
                className="size-5 drop-shadow-md"
                style={{
                  color: cursorColor,
                  fill: cursorColor
                }}
              />
              {isOnline && currentUser?.isAdmin && (
                <Crown className="absolute -top-1 -right-1 size-3 drop-shadow-md" style={{ color: "#FFD700", fill: "#FFD700" }} />
              )}
            </div>
          )}

          {isOnline && currentUser && cursorType === 'default' && (
            <div
              className="mt-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium text-white shadow-sm"
              style={{ backgroundColor: cursorColor }}
            >
              {currentUser.name || "Me"}
            </div>
          )}
        </div>
      )}

      {/* Editor Modal */}
      {modalState.isOpen && modalState.type && modalState.objectId && modalState.position && (
        <EditorModal
          type={modalState.type}
          objectId={modalState.objectId}
          initialPosition={modalState.position}
          onClose={() => setModalState({ isOpen: false, type: null, objectId: null, position: null })}
        />
      )}
    </div>
  )
}
