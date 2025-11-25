"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useHaloboardStore } from "@/lib/store"
import type { Point, CanvasObject, PathData, ShapeData, TextData, NoteData, ImageData, AnchorPosition } from "@/lib/types"
import { useCollaboration } from "@/lib/collaboration"
import { useTheme } from "next-themes"
import { useTranslation } from "@/lib/i18n"

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const imageCache = useRef<Record<string, HTMLImageElement>>({})
  
  // Visual State
  const [interactionMode, setInteractionMode] = useState<'none' | 'drawing' | 'moving' | 'resizing' | 'rotating' | 'selecting'>('none')
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [currentMousePos, setCurrentMousePos] = useState<Point | null>(null)
  
  // Logic Refs
  const dragStartRef = useRef<Point | null>(null)
  const currentMousePosRef = useRef<Point | null>(null)
  const interactionModeRef = useRef<'none' | 'drawing' | 'moving' | 'resizing' | 'rotating' | 'selecting'>('none')
  const activeHandleRef = useRef<string | null>(null)
  const initialObjectStateRef = useRef<CanvasObject | null>(null)
  const initialObjectsMapRef = useRef<Map<string, CanvasObject>>(new Map())
  const startPointRef = useRef<Point | null>(null)

  // Inline Editing State
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  const { theme } = useTheme()
  const { t } = useTranslation()

  const {
    objects,
    layers,
    activeTool,
    setActiveTool,
    brushSettings,
    shapeSettings,
    canvasSettings,
    activeLayerId,
    zoom,
    panX,
    panY,
    isPanning,
    selectedIds,
    addObject,
    updateObject,
    deleteObject, 
    setIsPanning,
    setPan,
    setSelectedIds,
    showGrid,
    gridType, 
    showTransformHandles,
    highlightColor,
    setZoom,
    copy, paste, duplicate,
    keybindings,
    currentUserId
  } = useHaloboardStore()

  // Initialize collaboration
  const collaboration = useCollaboration(currentUserId)

  useEffect(() => {
    const canvas = canvasRef.current; const container = containerRef.current
    if (!canvas || !container) return; const ctx = canvas.getContext("2d"); if (!ctx) return
    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      renderCanvas()
    }
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    updateSize()
    return () => observer.disconnect()
  }, [])

  // Prevent Browser Zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => { renderCanvas() }, [objects, zoom, panX, panY, selectedIds, layers, showGrid, gridType, highlightColor, interactionMode, currentMousePos, theme, canvasSettings, currentPath, showTransformHandles, editingTextId])

  // --- Helpers ---
  const getObjectSize = (obj: CanvasObject) => {
    // ... same logic
    switch (obj.type) {
      case "path": const d = obj.data as PathData; if (d.points.length < 2) return { width: 0, height: 0 }; const xs = d.points.map(p=>p.x); const ys = d.points.map(p=>p.y); return { width: Math.max(...xs)-Math.min(...xs), height: Math.max(...ys)-Math.min(...ys) }
      case "shape": return { width: (obj.data as ShapeData).width, height: (obj.data as ShapeData).height }
      case "text": return { width: (obj.data as TextData).width, height: (obj.data as TextData).height }
      case "note": return { width: (obj.data as NoteData).width, height: (obj.data as NoteData).height }
      case "image": return { width: (obj.data as ImageData).width, height: (obj.data as ImageData).height }
    }
    return { width: 0, height: 0 }
  }
  
  const getAnchorOffset = (obj: CanvasObject, width: number, height: number) => {
    // ... same logic
    const anchor = obj.transform.anchor || 'center' 
    let x = 0, y = 0
    if (anchor.includes('center')) x = width / 2
    if (anchor.includes('right')) x = width
    if (anchor.includes('bottom')) y = height
    if (anchor === 'center-left') y = height / 2
    if (anchor === 'center-right') y = height / 2
    if (anchor === 'center') { x = width / 2; y = height / 2 }
    return { x, y }
  }
  
  // --- Renderer ---
  const renderCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return
    const logicalWidth = canvas.width / (window.devicePixelRatio || 1); const logicalHeight = canvas.height / (window.devicePixelRatio || 1)
    
    if (theme === 'dark') { ctx.fillStyle = "#171717"; ctx.fillRect(0, 0, logicalWidth, logicalHeight) } 
    else { ctx.clearRect(0, 0, logicalWidth, logicalHeight) }

    // INFINITE GRID RENDERING
    if (showGrid) {
        ctx.save()
        const gridSize = 20
        const gridColor = theme === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
        
        const startX = -panX / zoom
        const startY = -panY / zoom
        const endX = startX + logicalWidth / zoom
        const endY = startY + logicalHeight / zoom

        const left = Math.floor(startX / gridSize) * gridSize
        const top = Math.floor(startY / gridSize) * gridSize
        const right = Math.ceil(endX / gridSize) * gridSize
        const bottom = Math.ceil(endY / gridSize) * gridSize

        ctx.translate(panX, panY)
        ctx.scale(zoom, zoom)

        ctx.lineWidth = 1 / zoom
        ctx.strokeStyle = gridColor
        ctx.fillStyle = gridColor

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
                        ctx.fillRect(x - 1/zoom, y - 1/zoom, 2/zoom, 2/zoom)
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

    ctx.save()
    ctx.translate(panX, panY)
    ctx.scale(zoom, zoom)

    if (!canvasSettings.infinite) {
      ctx.shadowColor = "rgba(0,0,0,0.1)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 4
      ctx.fillStyle = canvasSettings.backgroundColor; ctx.fillRect(0, 0, canvasSettings.width, canvasSettings.height)
      ctx.shadowColor = "transparent"
    }

    const layersToRender = [...layers].reverse()
    layersToRender.forEach(layer => {
      if (!layer.visible) return
      const objectsToRenderIds = [...layer.objectIds].reverse()
      objectsToRenderIds.forEach(objId => {
        const obj = objects.find(o => o.id === objId)
        if (!obj || obj.id === editingTextId) return
        const { width, height } = getObjectSize(obj)
        const anchor = getAnchorOffset(obj, width, height)
        
        ctx.save()
        ctx.translate(obj.transform.x, obj.transform.y)
        ctx.translate(anchor.x * obj.transform.scaleX, anchor.y * obj.transform.scaleY)
        ctx.rotate((obj.transform.rotation * Math.PI) / 180)
        ctx.scale(obj.transform.scaleX, obj.transform.scaleY)
        ctx.translate(-anchor.x, -anchor.y)

        switch (obj.type) { 
          case "path": renderPath(ctx, obj); break; 
          case "shape": renderShape(ctx, obj); break; 
          case "text": renderText(ctx, obj); break; 
          case "note": renderNote(ctx, obj); break; 
          case "image": renderImage(ctx, obj); break; 
        }
        ctx.restore()
        if (selectedIds.includes(obj.id) && obj.id !== editingTextId) renderSelection(ctx, obj)
      })
    })

    if (interactionMode === 'drawing' && activeTool === 'brush' && currentPath.length > 1) {
      ctx.save(); ctx.globalAlpha = brushSettings.opacity; ctx.strokeStyle = brushSettings.color; ctx.lineWidth = brushSettings.size
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(currentPath[0].x, currentPath[0].y)
      for (let i = 1; i < currentPath.length; i++) ctx.lineTo(currentPath[i].x, currentPath[i].y)
      ctx.stroke(); ctx.restore()
    }

    if (interactionMode === 'selecting' && dragStartRef.current && currentMousePos) {
      const dragStart = dragStartRef.current
      const x = Math.min(dragStart.x, currentMousePos.x)
      const y = Math.min(dragStart.y, currentMousePos.y)
      const w = Math.abs(currentMousePos.x - dragStart.x)
      const h = Math.abs(currentMousePos.y - dragStart.y)
      
      ctx.save()
      ctx.fillStyle = `${highlightColor}20`
      ctx.strokeStyle = highlightColor
      ctx.lineWidth = 1 / zoom
      ctx.fillRect(x, y, w, h)
      ctx.strokeRect(x, y, w, h)
      ctx.restore()
    }

    if ((activeTool === 'brush' || activeTool === 'eraser') && currentMousePos) {
      ctx.save(); ctx.beginPath(); ctx.arc(currentMousePos.x, currentMousePos.y, brushSettings.size / 2, 0, Math.PI * 2)
      ctx.strokeStyle = '#888'; ctx.fillStyle = activeTool === 'eraser' ? 'rgba(255,255,255,0.3)' : brushSettings.color + '33'
      ctx.lineWidth = 1 / zoom; ctx.fill(); ctx.stroke(); ctx.restore()
    }
    ctx.restore()
  }

  // Render Helpers
  const renderPath = (ctx: CanvasRenderingContext2D, obj: CanvasObject) => { const data = obj.data as PathData; if (data.points.length < 2) return; ctx.globalAlpha = data.opacity; ctx.strokeStyle = data.strokeColor; ctx.lineWidth = data.strokeWidth; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(data.points[0].x, data.points[0].y); for (let i = 1; i < data.points.length; i++) ctx.lineTo(data.points[i].x, data.points[i].y); ctx.stroke() }
  const renderShape = (ctx: CanvasRenderingContext2D, obj: CanvasObject) => { const data = obj.data as ShapeData; ctx.globalAlpha = data.opacity; ctx.setLineDash([]); let lineWidth = data.strokeWidth; if (data.borderType === 'dashed') ctx.setLineDash([10, 10]); if (data.borderType === 'dotted') ctx.setLineDash([3, 5]); if (data.borderType === 'bold') lineWidth = data.strokeWidth * 2; if (data.borderType === 'none') lineWidth = 0; ctx.lineWidth = lineWidth; ctx.strokeStyle = data.strokeColor; ctx.fillStyle = data.fillColor; ctx.beginPath(); const w = data.width, h = data.height; switch (data.shapeType) { case "rectangle": ctx.rect(0, 0, w, h); break; case "rounded_rectangle": ctx.roundRect(0, 0, w, h, Math.min(w, h) * 0.2); break; case "ellipse": ctx.ellipse(w / 2, h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2); break; case "circle": ctx.ellipse(w / 2, h / 2, Math.min(Math.abs(w), Math.abs(h)) / 2, Math.min(Math.abs(w), Math.abs(h)) / 2, 0, 0, Math.PI * 2); break; case "line": ctx.moveTo(0, 0); ctx.lineTo(w, h); break; case "triangle": ctx.moveTo(w / 2, 0); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); break; case "arrow": { const head = Math.min(Math.abs(w), Math.abs(h)) * 0.3; ctx.moveTo(0, h/3); ctx.lineTo(w-head, h/3); ctx.lineTo(w-head, 0); ctx.lineTo(w, h/2); ctx.lineTo(w-head, h); ctx.lineTo(w-head, h*2/3); ctx.lineTo(0, h*2/3); ctx.closePath(); break; } case "star": { const cx = w/2, cy = h/2, or = Math.min(w, h)/2, ir = or/2.5; for(let i=0; i<10; i++) { const r = i%2===0 ? or : ir; const a = (Math.PI/5)*i - Math.PI/2; i===0 ? ctx.moveTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r) : ctx.lineTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r); } ctx.closePath(); break; } case "cloud": { ctx.moveTo(w*0.2, h*0.5); ctx.bezierCurveTo(w*0.1, h*0.3, w*0.3, h*0.1, w*0.4, h*0.3); ctx.bezierCurveTo(w*0.5, h*0.1, w*0.7, h*0.2, w*0.7, h*0.4); ctx.bezierCurveTo(w*0.9, h*0.3, w, h*0.6, w*0.8, h*0.8); ctx.bezierCurveTo(w*0.9, h, w*0.6, h, w*0.5, h*0.9); ctx.bezierCurveTo(w*0.4, h, w*0.1, h*0.9, w*0.2, h*0.7); ctx.bezierCurveTo(0, h*0.7, 0, h*0.5, w*0.2, h*0.5); ctx.closePath(); break; } case "speech_bubble": { const br = Math.min(w, h)*0.2; ctx.moveTo(br, 0); ctx.lineTo(w-br, 0); ctx.quadraticCurveTo(w, 0, w, br); ctx.lineTo(w, h-br*2); ctx.quadraticCurveTo(w, h-br, w-br, h-br); ctx.lineTo(w/2+br, h-br); ctx.lineTo(w/2, h); ctx.lineTo(w/2-br, h-br); ctx.lineTo(br, h-br); ctx.quadraticCurveTo(0, h-br, 0, h-br*2); ctx.lineTo(0, br); ctx.quadraticCurveTo(0, 0, br, 0); ctx.closePath(); break; } } if (data.fillColor) ctx.fill(); if (data.borderType !== 'none') ctx.stroke() }
  const renderText = (ctx: CanvasRenderingContext2D, obj: CanvasObject) => { const data = obj.data as TextData; ctx.font = `${data.fontSize}px ${data.fontFamily}`; ctx.fillStyle = data.color; ctx.textBaseline = "top"; ctx.textAlign = data.align || "left"; ctx.setLineDash([]); const lines = data.content.split("\n"); const lineHeight = data.fontSize * 1.2; let xOffset = 0; if (data.align === "center") xOffset = data.width / 2; if (data.align === "right") xOffset = data.width; lines.forEach((line, i) => ctx.fillText(line, xOffset, i * lineHeight)) }
  const renderNote = (ctx: CanvasRenderingContext2D, obj: CanvasObject) => { 
    const data = obj.data as NoteData; 
    ctx.fillStyle = data.color; 
    ctx.fillRect(0, 0, data.width, data.height); 
    ctx.fillStyle = data.textColor || "#000000"; 
    ctx.font = `${data.fontSize || 14}px ${data.fontFamily || 'Inter'}, sans-serif`; 
    ctx.textBaseline = "top"; 
    ctx.setLineDash([]); 
    ctx.textAlign = data.align || 'left'; 
    const padding = 16; 
    const lines = data.content.split("\n"); 
    let x = padding; 
    if (data.align === 'center') x = data.width / 2; 
    if (data.align === 'right') x = data.width - padding; 
    
    const lineHeight = (data.fontSize || 14) * 1.2;
    const totalTextHeight = lines.length * lineHeight;
    let startY = padding;
    if (data.verticalAlign === 'center') startY = (data.height - totalTextHeight) / 2;
    if (data.verticalAlign === 'bottom') startY = data.height - totalTextHeight - padding;

    lines.forEach((line, i) => ctx.fillText(line, x, startY + i * lineHeight, data.width - padding * 2)) 
  }
  const renderImage = (ctx: CanvasRenderingContext2D, obj: CanvasObject) => { const data = obj.data as ImageData; ctx.globalAlpha = data.opacity; ctx.globalCompositeOperation = (data.blendMode && data.blendMode !== 'normal') ? data.blendMode : 'source-over'; ctx.setLineDash([]); if (data.src && !data.src.startsWith('/placeholder')) { let img = imageCache.current[data.src]; if (!img) { img = new Image(); img.src = data.src; img.onload = () => renderCanvas(); imageCache.current[data.src] = img; } if (img.complete && img.naturalWidth > 0) { ctx.drawImage(img, 0, 0, data.width, data.height); return; } } ctx.fillStyle = "#e0e0e0"; ctx.fillRect(0, 0, data.width, data.height); ctx.strokeStyle = "#999999"; ctx.lineWidth = 2; ctx.strokeRect(0, 0, data.width, data.height); ctx.fillStyle = "#666666"; ctx.font = "48px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🖼️", data.width / 2, data.height / 2) }

  const renderSelection = (ctx: CanvasRenderingContext2D, obj: CanvasObject) => {
    if (!showTransformHandles) return
    const { width, height } = getObjectSize(obj); const anchor = getAnchorOffset(obj, width, height); const handleSize = 8 / zoom
    ctx.save(); ctx.translate(obj.transform.x + anchor.x * obj.transform.scaleX, obj.transform.y + anchor.y * obj.transform.scaleY); ctx.rotate((obj.transform.rotation * Math.PI) / 180); ctx.scale(obj.transform.scaleX, obj.transform.scaleY); ctx.translate(-anchor.x, -anchor.y)
    
    ctx.strokeStyle = highlightColor; 
    ctx.lineWidth = 2 / zoom; 
    ctx.strokeRect(0, 0, width, height)
    
    const hSizeX = handleSize / obj.transform.scaleX; const hSizeY = handleSize / obj.transform.scaleY; ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = highlightColor; ctx.lineWidth = 1 / zoom
    const drawHandle = (x: number, y: number) => { 
        ctx.fillRect(x - hSizeX/2, y - hSizeY/2, hSizeX, hSizeY); 
        ctx.strokeRect(x - hSizeX/2, y - hSizeY/2, hSizeX, hSizeY) 
    }
    drawHandle(0, 0); drawHandle(width, 0); drawHandle(width, height); drawHandle(0, height)
    
    const rotHandleY = - (30 / obj.transform.scaleY / zoom); ctx.beginPath(); ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, rotHandleY); ctx.stroke(); ctx.beginPath(); ctx.arc(width / 2, rotHandleY, Math.abs(hSizeX/1.5), 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(anchor.x - 5/zoom/obj.transform.scaleX, anchor.y); ctx.lineTo(anchor.x + 5/zoom/obj.transform.scaleX, anchor.y); ctx.moveTo(anchor.x, anchor.y - 5/zoom/obj.transform.scaleY); ctx.lineTo(anchor.x, anchor.y + 5/zoom/obj.transform.scaleY); ctx.strokeStyle = '#0A84FF'; ctx.lineWidth = 2/zoom; ctx.stroke()
    ctx.restore()
  }

  // --- Interaction Logic ---
  const getCanvasPoint = (e: React.MouseEvent) => { const canvas = canvasRef.current; if (!canvas) return { x: 0, y: 0 }; const rect = canvas.getBoundingClientRect(); return { x: (e.clientX - rect.left - panX) / zoom, y: (e.clientY - rect.top - panY) / zoom } }
  const getClickType = (point: Point, obj: CanvasObject): 'tl'|'tr'|'bl'|'br'|'rot'|'body'|'none' => { 
    const { width, height } = getObjectSize(obj)
    const anchor = getAnchorOffset(obj, width, height)
    const handleSize = 8 / zoom / Math.min(Math.abs(obj.transform.scaleX), Math.abs(obj.transform.scaleY))
    const pivotX = obj.transform.x + anchor.x * obj.transform.scaleX
    const pivotY = obj.transform.y + anchor.y * obj.transform.scaleY
    const dx = point.x - pivotX; const dy = point.y - pivotY
    const rad = -obj.transform.rotation * (Math.PI / 180)
    const lx = (dx * Math.cos(rad) - dy * Math.sin(rad)) / obj.transform.scaleX
    const ly = (dx * Math.sin(rad) + dy * Math.cos(rad)) / obj.transform.scaleY
    const localX = lx + anchor.x; const localY = ly + anchor.y
    const rotHandleY = - (30 / obj.transform.scaleY / zoom)
    if (Math.abs(localX - width/2) < handleSize && Math.abs(localY - rotHandleY) < handleSize) return 'rot'
    if (Math.abs(localX - 0) < handleSize && Math.abs(localY - 0) < handleSize) return 'tl'
    if (Math.abs(localX - width) < handleSize && Math.abs(localY - 0) < handleSize) return 'tr'
    if (Math.abs(localX - 0) < handleSize && Math.abs(localY - height) < handleSize) return 'bl'
    if (Math.abs(localX - width) < handleSize && Math.abs(localY - height) < handleSize) return 'br'
    if (localX >= 0 && localX <= width && localY >= 0 && localY <= height) return 'body'
    return 'none' 
  }

  const handleEraser = (point: Point) => {
    const radius = brushSettings.size / zoom / 2
    if (brushSettings.eraserMode === 'object') {
      const hitObject = [...objects].reverse().find(obj => {
        const layer = layers.find(l => l.id === obj.layerId); if (!layer || !layer.visible || layer.locked) return false
        return getClickType(point, obj) !== 'none'
      })
      if (hitObject) deleteObject(hitObject.id)
    } else {
      objects.forEach(obj => {
        if (obj.type === 'path') {
          const data = obj.data as PathData; const originalPoints = data.points; const newSegments: Point[][] = []; let currentSegment: Point[] = []; let hasSplit = false
          for (let i = 0; i < originalPoints.length; i++) {
            const p = originalPoints[i]; const gx = obj.transform.x + p.x; const gy = obj.transform.y + p.y; const distSq = (gx - point.x)**2 + (gy - point.y)**2
            if (distSq > radius**2) { currentSegment.push(p) } else { hasSplit = true; if (currentSegment.length > 0) { newSegments.push(currentSegment); currentSegment = [] } }
          }
          if (currentSegment.length > 0) newSegments.push(currentSegment)
          if (hasSplit) { deleteObject(obj.id); newSegments.forEach((seg, idx) => { if (seg.length < 2) return; addObject({ ...obj, id: `path-split-${obj.id}-${Date.now()}-${idx}`, data: { ...data, points: seg } }) }) }
        }
      })
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.spaceKey)) { setIsPanning(true); return }
    const point = getCanvasPoint(e); dragStartRef.current = point; currentMousePosRef.current = point
    if (activeTool === "select" && selectedIds.length === 1) { const obj = objects.find(o => o.id === selectedIds[0]); if (obj) { const clickType = getClickType(point, obj); if (clickType !== 'none' && clickType !== 'body') { interactionModeRef.current = clickType === 'rot' ? 'rotating' : 'resizing'; setInteractionMode(clickType === 'rot' ? 'rotating' : 'resizing'); activeHandleRef.current = clickType; initialObjectStateRef.current = JSON.parse(JSON.stringify(obj)); return } } }
    switch (activeTool) {
      case "select": const clickedObject = [...objects].reverse().find((obj) => { const layer = layers.find(l => l.id === obj.layerId); if (!layer || !layer.visible || layer.locked) return false; return getClickType(point, obj) !== 'none' }); if (clickedObject) { if (e.shiftKey) { if (selectedIds.includes(clickedObject.id)) setSelectedIds(selectedIds.filter(id => id !== clickedObject.id)); else setSelectedIds([...selectedIds, clickedObject.id]) } else { if (!selectedIds.includes(clickedObject.id)) setSelectedIds([clickedObject.id]) } interactionModeRef.current = 'moving'; setInteractionMode('moving'); initialObjectsMapRef.current.clear(); const ids = e.shiftKey && selectedIds.includes(clickedObject.id) ? selectedIds : [clickedObject.id]; ids.forEach(id => { const o = objects.find(obj => obj.id === id); if (o) initialObjectsMapRef.current.set(id, JSON.parse(JSON.stringify(o))) }); if (!initialObjectsMapRef.current.has(clickedObject.id)) initialObjectsMapRef.current.set(clickedObject.id, JSON.parse(JSON.stringify(clickedObject))) } else { if (!e.shiftKey) setSelectedIds([]); interactionModeRef.current = 'selecting'; setInteractionMode('selecting'); dragStartRef.current = point; setCurrentMousePos(point) } break;
      case "brush": interactionModeRef.current = 'drawing'; setInteractionMode('drawing'); setIsDrawing(true); setCurrentPath([point]); break;
      case "shape": interactionModeRef.current = 'drawing'; setInteractionMode('drawing'); setIsDrawing(true); startPointRef.current = point; setStartPoint(point); break;
      case "eraser": interactionModeRef.current = 'drawing'; setInteractionMode('drawing'); setIsDrawing(true); setCurrentMousePos(point); handleEraser(point); break;
      case "text": addObject({ id: `text-${Date.now()}`, type: "text", layerId: activeLayerId, transform: { x: point.x, y: point.y, rotation: 0, scaleX: 1, scaleY: 1, anchor: "center" }, data: { content: t("clickToEdit"), fontFamily: "Inter", fontSize: 24, color: "#000000", width: 200, height: 30, align: "left" } }); setActiveTool('select'); break;
      case "note": addObject({ id: `note-${Date.now()}`, type: "note", layerId: activeLayerId, transform: { x: point.x, y: point.y, rotation: Math.random() * 4 - 2, scaleX: 1, scaleY: 1, anchor: "center" }, data: { content: t("newNote"), width: 200, height: 200, color: "#FFF2CC", textColor: "#000000", fontFamily: "Inter", fontSize: 14, align: "left", verticalAlign: "top" } }); setActiveTool('select'); break;
      case "image": addObject({ id: `image-${Date.now()}`, type: "image", layerId: activeLayerId, transform: { x: point.x, y: point.y, rotation: 0, scaleX: 1, scaleY: 1, anchor: "center" }, data: { src: "/placeholder.svg?height=200&width=200", width: 200, height: 200, opacity: 1, blendMode: 'normal' } }); setActiveTool('select'); break;
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e); currentMousePosRef.current = point; setCurrentMousePos(point)
    
    if (collaboration) {
        collaboration.broadcastCursor(point)
    }
    
    if (isPanning) { setPan(panX + e.movementX, panY + e.movementY); return }
    const mode = interactionModeRef.current
    if (mode === 'drawing' && activeTool === 'eraser') handleEraser(point)
    if (mode === 'moving' && dragStartRef.current) { const dx = point.x - dragStartRef.current.x; const dy = point.y - dragStartRef.current.y; initialObjectsMapRef.current.forEach((initObj, id) => { if (objects.some(o => o.id === id)) { updateObject(id, { transform: { ...initObj.transform, x: initObj.transform.x + dx, y: initObj.transform.y + dy } }) } }) }
    if (mode === 'rotating' && initialObjectStateRef.current) { const obj = initialObjectStateRef.current; const { width, height } = getObjectSize(obj); const anchor = getAnchorOffset(obj, width, height); const pivotX = obj.transform.x + anchor.x * obj.transform.scaleX; const pivotY = obj.transform.y + anchor.y * obj.transform.scaleY; const angle = Math.atan2(point.y - pivotY, point.x - pivotX) * (180 / Math.PI) + 90; updateObject(obj.id, { transform: { ...obj.transform, rotation: angle } }) }
    
    if (mode === 'resizing' && initialObjectStateRef.current && activeHandleRef.current && dragStartRef.current) { 
        const obj = initialObjectStateRef.current
        const { width, height } = getObjectSize(obj)
        
        const dx = point.x - dragStartRef.current.x
        const dy = point.y - dragStartRef.current.y
        
        const rad = -obj.transform.rotation * (Math.PI / 180)
        const localDx = dx * Math.cos(rad) - dy * Math.sin(rad)
        const localDy = dx * Math.sin(rad) + dy * Math.cos(rad)

        let scaleX = obj.transform.scaleX
        let scaleY = obj.transform.scaleY
        
        const safeWidth = width === 0 ? 100 : width
        const safeHeight = height === 0 ? 100 : height

        if (activeHandleRef.current.includes('r')) scaleX = obj.transform.scaleX + (localDx / safeWidth) * obj.transform.scaleX
        if (activeHandleRef.current.includes('l')) scaleX = obj.transform.scaleX - (localDx / safeWidth) * obj.transform.scaleX
        if (activeHandleRef.current.includes('b')) scaleY = obj.transform.scaleY + (localDy / safeHeight) * obj.transform.scaleY
        if (activeHandleRef.current.includes('t')) scaleY = obj.transform.scaleY - (localDy / safeHeight) * obj.transform.scaleY

        const isCorner = activeHandleRef.current.length === 2
        if (!e.shiftKey && isCorner) {
           const ratio = Math.max(Math.abs(scaleX/obj.transform.scaleX), Math.abs(scaleY/obj.transform.scaleY))
           const signX = Math.sign(scaleX) || 1
           const signY = Math.sign(scaleY) || 1
           scaleX = obj.transform.scaleX * ratio * signX
           scaleY = obj.transform.scaleY * ratio * signY
        }
        updateObject(obj.id, { transform: { ...obj.transform, scaleX, scaleY } }) 
    }

    if (mode === 'drawing' && activeTool === 'brush') {
      let newPoint = point
      if (e.shiftKey && currentPath.length > 0) {
        const start = currentPath[0]
        const dx = Math.abs(point.x - start.x)
        const dy = Math.abs(point.y - start.y)
        
        if (dx > dy) {
          newPoint = { x: point.x, y: start.y }
        } else {
          newPoint = { x: start.x, y: point.y }
        }
      }
      setCurrentPath(p => [...p, newPoint])
    }
    
    if (mode === 'selecting' || (mode === 'drawing' && activeTool === 'shape')) setInteractionMode(prev => prev)
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) { setIsPanning(false); return }
    const point = getCanvasPoint(e); const mode = interactionModeRef.current
    if (mode === 'selecting' && dragStartRef.current) { const x1 = Math.min(dragStartRef.current.x, point.x); const y1 = Math.min(dragStartRef.current.y, point.y); const x2 = Math.max(dragStartRef.current.x, point.x); const y2 = Math.max(dragStartRef.current.y, point.y); const ids: string[] = []; objects.forEach(obj => { const layer = layers.find(l => l.id === obj.layerId); if (!layer || !layer.visible || layer.locked) return; const { width, height } = getObjectSize(obj); const ox = obj.transform.x; const oy = obj.transform.y; if (ox < x2 && ox + width > x1 && oy < y2 && oy + height > y1) ids.push(obj.id) }); setSelectedIds(ids) }
    if (mode === 'drawing' && activeTool === 'brush' && currentPath.length > 1) { const xs = currentPath.map(p => p.x); const ys = currentPath.map(p => p.y); const minX = Math.min(...xs); const minY = Math.min(...ys); const norm = currentPath.map(p => ({ x: p.x - minX, y: p.y - minY })); addObject({ id: `path-${Date.now()}`, type: "path", layerId: activeLayerId, transform: { x: minX, y: minY, rotation: 0, scaleX: 1, scaleY: 1, anchor: "center" }, data: { points: norm, strokeColor: brushSettings.color, strokeWidth: brushSettings.size, opacity: brushSettings.opacity } }); setCurrentPath([]) }
    if (mode === 'drawing' && activeTool === 'shape' && startPointRef.current) { const rawW = point.x - startPointRef.current.x; const rawH = point.y - startPointRef.current.y; const w = Math.abs(rawW); const h = Math.abs(rawH); const x = rawW < 0 ? point.x : startPointRef.current.x; const y = rawH < 0 ? point.y : startPointRef.current.y; if (w > 5 && h > 5) { addObject({ id: `shape-${Date.now()}`, type: "shape", layerId: activeLayerId, transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1, anchor: "center" }, data: { shapeType: shapeSettings.shapeType, width: w, height: h, fillColor: shapeSettings.fillColor, strokeColor: shapeSettings.strokeColor, strokeWidth: shapeSettings.strokeWidth, borderType: shapeSettings.borderType, opacity: shapeSettings.opacity } }); setActiveTool('select') } startPointRef.current = null; setStartPoint(null) }
    interactionModeRef.current = 'none'; activeHandleRef.current = null; dragStartRef.current = null; initialObjectStateRef.current = null; initialObjectsMapRef.current.clear(); setInteractionMode('none'); setIsDrawing(false); activeHandleRef.current = null; dragStartRef.current = null
  }

  const handleDoubleClick = (e: React.MouseEvent) => { 
    const point = getCanvasPoint(e); 
    const clickedObject = [...objects].reverse().find((obj) => { 
      const layer = layers.find(l => l.id === obj.layerId); 
      if (!layer || !layer.visible || layer.locked) return false; 
      return getClickType(point, obj) !== 'none' 
    }); 
    
    if (clickedObject && (clickedObject.type === "text" || clickedObject.type === "note")) { 
      setEditingTextId(clickedObject.id); 
      const data = clickedObject.data as (TextData | NoteData); 
      
      const isPlaceholder = 
        (clickedObject.type === 'text' && (data.content === t("clickToEdit") || data.content === "Click to edit")) ||
        (clickedObject.type === 'note' && (data.content === t("newNote") || data.content === "New note"));
        
      setEditText(isPlaceholder ? "" : data.content) 
    } 
  }
  
  const handleTextBlur = () => { if (editingTextId) { const obj = objects.find(o => o.id === editingTextId); if (obj) { const newData = { ...obj.data, content: editText }; updateObject(obj.id, { data: newData as any }) } setEditingTextId(null) } }
  const handleWheel = (e: React.WheelEvent) => { 
    if (e.ctrlKey || e.metaKey) { 
        e.preventDefault(); 
        const delta = e.deltaY > 0 ? 0.9 : 1.1; 
        setZoom(zoom * delta) 
    } else { 
        setPan(panX - e.deltaX, panY - e.deltaY) 
    } 
  }
  
  useEffect(() => { const handleMouseEvent = (e: MouseEvent) => { (window as any).lastMouseEvent = e }; window.addEventListener("mousemove", handleMouseEvent); return () => window.removeEventListener("mousemove", handleMouseEvent) }, [])
  
  useEffect(() => { 
    const handleKeyDown = (e: KeyboardEvent) => { 
      const tagName = (e.target as HTMLElement).tagName; if (tagName === 'INPUT' || tagName === 'TEXTAREA') return
      
      const key = e.key.toLowerCase()
      if (!e.metaKey && !e.ctrlKey) { 
        if (key === keybindings.select) setActiveTool('select');
        else if (key === keybindings.brush) setActiveTool('brush');
        else if (key === keybindings.eraser) setActiveTool('eraser');
        else if (key === keybindings.image) setActiveTool('image');
        else if (key === keybindings.shape) setActiveTool('shape');
        else if (key === keybindings.note) setActiveTool('note');
        else if (key === keybindings.text) setActiveTool('text');
      } 
      
      if ((e.ctrlKey || e.metaKey) && key === "z" && !e.shiftKey) { e.preventDefault(); useHaloboardStore.getState().undo() } 
      if ((e.ctrlKey || e.metaKey) && (key === "y" || (key === "z" && e.shiftKey))) { e.preventDefault(); useHaloboardStore.getState().redo() } 
      
      if (e.key === "Delete" || e.key === "Backspace") { const { selectedIds, deleteObject } = useHaloboardStore.getState(); selectedIds.forEach((id) => deleteObject(id)) } 
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { useHaloboardStore.getState().copy() } 
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { useHaloboardStore.getState().paste() } 
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); useHaloboardStore.getState().duplicate() } 
    }; window.addEventListener("keydown", handleKeyDown); return () => window.removeEventListener("keydown", handleKeyDown) 
  }, [keybindings])

  const renderTextEditor = () => {
    if (!editingTextId) return null
    const obj = objects.find(o => o.id === editingTextId); if (!obj) return null
    const data = obj.data as (TextData | NoteData); const { width, height } = getObjectSize(obj); const anchor = getAnchorOffset(obj, width, height)
    const screenX = (obj.transform.x - anchor.x * obj.transform.scaleX) * zoom + panX + (containerRef.current?.getBoundingClientRect().left || 0)
    const screenY = (obj.transform.y - anchor.y * obj.transform.scaleY) * zoom + panY + (containerRef.current?.getBoundingClientRect().top || 0)
    const textColor = obj.type === 'note' ? ((data as NoteData).textColor || '#000') : (data as TextData).color
    const style: React.CSSProperties = { position: 'absolute', left: screenX, top: screenY, width: width * zoom * obj.transform.scaleX, height: height * zoom * obj.transform.scaleY, fontSize: (data.fontSize || 14) * zoom * obj.transform.scaleY, fontFamily: (data as any).fontFamily || 'Inter', color: textColor, backgroundColor: obj.type === 'note' ? (data as NoteData).color : 'transparent', border: 'none', padding: obj.type === 'note' ? 16 * zoom : 0, zIndex: 100, resize: 'none', outline: 'none', textAlign: (data as any).align || 'left', overflow: 'hidden', lineHeight: '1.2' }
    
    return (
      <textarea 
        ref={textAreaRef} 
        value={editText} 
        onChange={(e) => setEditText(e.target.value)} 
        onBlur={handleTextBlur} 
        style={style} 
        autoFocus 
        onKeyDown={(e) => { 
          if (e.key === "Escape") {
            handleTextBlur();
            return;
          }
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleTextBlur();
          }
        }} 
      />
    )
  }

  return <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden"><canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onDoubleClick={handleDoubleClick} onWheel={handleWheel} />{renderTextEditor()}</div>
}