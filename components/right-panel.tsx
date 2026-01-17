"use client"

import { useState, useRef, useEffect } from "react"
import { useHaloboardStore } from "@/lib/store"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Eye, EyeOff, Lock, LockOpen, ChevronDown, ChevronRight, Plus, Trash2,
  Minimize2, Maximize2, RotateCcw, Clock,
  AlignLeft, AlignCenter, AlignRight, Type, Image as ImageIcon, Upload,
  BoxSelect, Eraser, GripVertical, Send
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AnchorPosition } from "@/lib/types"
import { useTranslation } from "@/lib/i18n"

interface PanelSectionProps {
  title: string
  children: React.ReactNode
  className?: string
  defaultOpen?: boolean
}

function PanelSection({ title, children, className, defaultOpen = true }: PanelSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className={cn("rounded-xl border border-white/20 bg-white/70 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/70", className)}>
      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-t-xl" onClick={() => setIsOpen(!isOpen)}>
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{title}</h3>
        <Button variant="ghost" size="icon" className="size-6 h-6 w-6">{isOpen ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}</Button>
      </div>
      {isOpen && <div className="p-3 pt-0 border-t border-neutral-200/50 dark:border-neutral-800/50 mt-1">{children}</div>}
    </div>
  )
}

function PropertiesSection() {
  const {
    selectedIds, objects, updateObject, addObject, setSelectedIds,
    activeTool, setActiveTool, brushSettings, setBrushSettings, shapeSettings, setShapeSettings,
    showTransformHandles, setShowTransformHandles,
    panX, panY, zoom, highlightColor
  } = useHaloboardStore()

  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = (event) => {
      const src = event.target?.result as string; const img = new Image(); img.onload = () => {
        const imageObj = { id: `image-${Date.now()}`, name: "Image", type: "image" as const, layerId: "layer-1", transform: { x: -panX / zoom + 100, y: -panY / zoom + 100, rotation: 0, scaleX: 1, scaleY: 1, anchor: "top-left" as const }, data: { src, width: 200, height: 200 * (img.height / img.width), opacity: 1, blendMode: 'normal' as const } }
        addObject(imageObj)
        setSelectedIds([imageObj.id])
        setActiveTool('select') // Auto-switch to selection tool after placing image
      }; img.src = src;
    }; reader.readAsDataURL(file); e.target.value = '';
  }
  const selectedObject = selectedIds.length > 0 ? objects.find((obj) => obj.id === selectedIds[selectedIds.length - 1]) : null

  if (activeTool === 'select' && !selectedObject) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BoxSelect className="size-4 text-neutral-500" />
            <Label htmlFor="show-handles" className="text-xs font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer">{t("showTransform")}</Label>
          </div>
          <div style={{ color: highlightColor }}>
            <Checkbox id="show-handles" checked={showTransformHandles} onCheckedChange={(c) => setShowTransformHandles(!!c)} className="data-[state=checked]:bg-[var(--primary)] data-[state=checked]:border-[var(--primary)]" />
          </div>
        </div>
      </div>
    )
  }

  if (activeTool === 'eraser') {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <div className="flex items-center gap-2"><Eraser className="size-4 text-neutral-500" /><span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{t("eraserSettings")}</span></div>
        <div><label className="mb-2 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400"><span>{t("size")}</span><span className="font-medium">{brushSettings.size}px</span></label><Slider value={[brushSettings.size]} onValueChange={([value]) => setBrushSettings({ size: value })} min={1} max={100} step={1} className="w-full" /></div>
        <div>
          <label className="text-[10px] text-neutral-500 mb-1 block">{t("mode")}</label>
          <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-md p-1 gap-1">
            {['object', 'partial'].map((mode) => (
              <button key={mode} onClick={() => setBrushSettings({ eraserMode: mode as any })} className={cn("flex-1 flex justify-center py-1.5 rounded text-xs font-medium text-neutral-500 hover:bg-white hover:text-neutral-900 dark:hover:bg-neutral-700 transition-all", brushSettings.eraserMode === mode && "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white")} style={brushSettings.eraserMode === mode ? { color: highlightColor, fontWeight: 'bold' } : {}}>{mode === 'object' ? t("whole") : t("partial")}</button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (activeTool === 'shape') { return (<div className="flex flex-col gap-3 pt-2"><div className="flex items-center justify-between"><span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{t("shapeTool")}</span></div><div><label className="text-[10px] text-neutral-500 mb-1 block">Shape Type</label><select className="w-full h-8 rounded-md border border-neutral-200 bg-white text-xs px-2 dark:bg-neutral-800 dark:border-neutral-700" value={shapeSettings.shapeType} onChange={(e) => setShapeSettings({ shapeType: e.target.value as any })} style={{ outlineColor: highlightColor }}><option value="rectangle">{t("rectangle")}</option><option value="rounded_rectangle">{t("roundedRectangle")}</option><option value="ellipse">{t("ellipse")}</option><option value="circle">{t("circle")}</option><option value="triangle">{t("triangle")}</option><option value="line">{t("line")}</option><option value="arrow">{t("arrow")}</option><option value="star">{t("star")}</option><option value="cloud">{t("cloud")}</option><option value="speech_bubble">{t("speechBubble")}</option></select></div><div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] text-neutral-500 mb-1 block">{t("fillColor")}</label><div className="flex items-center gap-2"><input type="color" value={shapeSettings.fillColor} onChange={(e) => setShapeSettings({ fillColor: e.target.value })} className="size-6 border-0 p-0 rounded cursor-pointer" /></div></div><div><label className="text-[10px] text-neutral-500 mb-1 block">{t("strokeColor")}</label><div className="flex items-center gap-2"><input type="color" value={shapeSettings.strokeColor} onChange={(e) => setShapeSettings({ strokeColor: e.target.value })} className="size-6 border-0 p-0 rounded cursor-pointer" /></div></div></div><div><label className="text-[10px] text-neutral-500 mb-1 block">Border Type</label><Select value={shapeSettings.borderType} onValueChange={(value: any) => setShapeSettings({ borderType: value })}><SelectTrigger className="w-full h-8 text-xs"><SelectValue placeholder={t("selectBorder")} /></SelectTrigger><SelectContent><SelectItem value="solid"><div className="flex items-center gap-2 w-24"><div className="h-0.5 w-full bg-current" /></div></SelectItem><SelectItem value="dashed"><div className="flex items-center gap-2 w-24"><div className="h-0.5 w-full border-t-2 border-dashed border-current" /></div></SelectItem><SelectItem value="dotted"><div className="flex items-center gap-2 w-24"><div className="h-0.5 w-full border-t-2 border-dotted border-current" /></div></SelectItem><SelectItem value="bold"><div className="flex items-center gap-2 w-24"><div className="h-1 w-full bg-current" /></div></SelectItem><SelectItem value="none"><span className="text-xs text-muted-foreground">{t("none")}</span></SelectItem></SelectContent></Select></div></div>) }

  if (activeTool === 'text') {
    const { textProperties, setTextProperties } = useHaloboardStore.getState()

    // Sync function: update both textProperties and selected text object
    const updateText = (updates: Partial<typeof textProperties>) => {
      setTextProperties(updates)
      // Also update selected text object if one is selected
      if (selectedObject && selectedObject.type === 'text') {
        const dataUpdates: any = {}
        if (updates.fontFamily !== undefined) dataUpdates.fontFamily = updates.fontFamily
        if (updates.fontSize !== undefined) dataUpdates.fontSize = updates.fontSize
        if (updates.color !== undefined) dataUpdates.color = updates.color
        if (updates.alignment !== undefined) dataUpdates.align = updates.alignment
        if (Object.keys(dataUpdates).length > 0) {
          updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), ...dataUpdates } })
        }
      }
    }

    // Get current values: prefer selected object if text, else use textProperties
    const currentFont = (selectedObject?.type === 'text' ? (selectedObject.data as any).fontFamily : null) || textProperties.fontFamily
    const currentSize = (selectedObject?.type === 'text' ? (selectedObject.data as any).fontSize : null) || textProperties.fontSize
    const currentColor = (selectedObject?.type === 'text' ? (selectedObject.data as any).color : null) || textProperties.color
    const currentAlign = (selectedObject?.type === 'text' ? (selectedObject.data as any).align : null) || textProperties.alignment

    return (
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between"><span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{t("textTool")}</span></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-neutral-500 mb-1 block font-medium">{t("font")}</label>
            <select
              className="w-full h-8 rounded-md border border-neutral-200 bg-white text-xs px-2 dark:bg-neutral-800 dark:border-neutral-700"
              value={currentFont}
              onChange={(e) => updateText({ fontFamily: e.target.value })}
              style={{ fontFamily: currentFont }}
            >
              <option value="Inter" style={{ fontFamily: 'Inter, sans-serif' }}>Inter</option>
              <option value="Arial" style={{ fontFamily: 'Arial, sans-serif' }}>Arial</option>
              <option value="Georgia" style={{ fontFamily: 'Georgia, serif' }}>Georgia</option>
              <option value="Times New Roman" style={{ fontFamily: '"Times New Roman", serif' }}>Times New Roman</option>
              <option value="Courier New" style={{ fontFamily: '"Courier New", monospace' }}>Courier New</option>
              <option value="Verdana" style={{ fontFamily: 'Verdana, sans-serif' }}>Verdana</option>
              <option value="Trebuchet MS" style={{ fontFamily: '"Trebuchet MS", sans-serif' }}>Trebuchet MS</option>
              <option value="Palatino Linotype" style={{ fontFamily: '"Palatino Linotype", serif' }}>Palatino</option>
              <option value="Lucida Console" style={{ fontFamily: '"Lucida Console", monospace' }}>Lucida Console</option>
              <option value="Impact" style={{ fontFamily: 'Impact, sans-serif' }}>Impact</option>
              <option value="Comic Sans MS" style={{ fontFamily: '"Comic Sans MS", cursive' }}>Comic Sans</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-neutral-500 mb-1 block font-medium">{t("size")}</label>
            <input
              type="number"
              className="w-full h-8 rounded-md border border-neutral-200 bg-white text-xs px-2 dark:bg-neutral-800 dark:border-neutral-700"
              value={currentSize}
              onChange={(e) => updateText({ fontSize: Number(e.target.value) })}
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-neutral-500 mb-1 block font-medium">{t("color")}</label>
          <div className="flex items-center gap-2">
            <input type="color" value={currentColor} onChange={(e) => updateText({ color: e.target.value })} className="size-6 border-0 p-0 rounded cursor-pointer" />
            <span className="text-xs font-mono">{currentColor}</span>
          </div>
        </div>
        <div>
          <label className="text-[10px] text-neutral-500 mb-1 block font-medium">{t("align")}</label>
          <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-md p-1 gap-1">
            {['left', 'center', 'right'].map((align) => (
              <button
                key={align}
                onClick={() => updateText({ alignment: align as any })}
                className={cn(
                  "flex-1 flex justify-center py-1 rounded text-neutral-500 hover:bg-white hover:text-neutral-900 dark:hover:bg-neutral-700 transition-all",
                  currentAlign === align && "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                )}
              >
                {align === 'left' && <AlignLeft className="size-3" />}
                {align === 'center' && <AlignCenter className="size-3" />}
                {align === 'right' && <AlignRight className="size-3" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (activeTool === 'note') {
    const { noteProperties, setNoteProperties } = useHaloboardStore.getState()
    const noteColors = ['#FFF2CC', '#FFD1D1', '#D1FFD6', '#D1F4FF', '#FAD1FF']
    return (
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between"><span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{t("noteTool")}</span></div>
        <div>
          <label className="text-[10px] text-neutral-500 mb-1 block">{t("backgroundColor")}</label>
          <div className="flex gap-2 flex-wrap">
            {noteColors.map(color => (
              <button
                key={color}
                onClick={() => setNoteProperties({ backgroundColor: color })}
                className={cn("size-6 rounded-full border shadow-sm", noteProperties.backgroundColor === color && "ring-2 ring-[var(--primary)] ring-offset-1")}
                style={{ backgroundColor: color }}
              />
            ))}
            <input type="color" value={noteProperties.backgroundColor} onChange={(e) => setNoteProperties({ backgroundColor: e.target.value })} className="size-6 border-0 p-0 rounded-full cursor-pointer overflow-hidden" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-neutral-500 mb-1 block">{t("font")}</label>
            <select className="w-full h-8 rounded-md border border-neutral-200 bg-white text-xs px-2 dark:bg-neutral-800 dark:border-neutral-700" value={noteProperties.fontFamily} onChange={(e) => setNoteProperties({ fontFamily: e.target.value })}>
              <option value="Inter">Inter</option>
              <option value="Kalam">Handwritten</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-neutral-500 mb-1 block">{t("size")}</label>
            <input type="number" className="w-full h-8 rounded-md border border-neutral-200 bg-white text-xs px-2 dark:bg-neutral-800 dark:border-neutral-700" value={noteProperties.fontSize} onChange={(e) => setNoteProperties({ fontSize: Number(e.target.value) })} />
          </div>
        </div>
      </div>
    )
  }

  if (activeTool === 'brush') { return (<div className="flex flex-col gap-4 pt-2"><div className="flex items-center justify-between"><span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{t("brushSettings")}</span></div><div><label className="mb-2 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400"><span>{t("size")}</span><span className="font-medium">{brushSettings.size}px</span></label><Slider value={[brushSettings.size]} onValueChange={([value]) => setBrushSettings({ size: value })} min={1} max={50} step={1} className="w-full" /></div><div><label className="mb-2 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400"><span>{t("opacity")}</span><span className="font-medium">{Math.round(brushSettings.opacity * 100)}%</span></label><Slider value={[brushSettings.opacity * 100]} onValueChange={([value]) => setBrushSettings({ opacity: value / 100 })} min={0} max={100} step={1} className="w-full" /></div><div><label className="mb-2 block text-xs text-neutral-600 dark:text-neutral-400">{t("color")}</label><div className="flex flex-wrap gap-2">{["#000000", "#EF4444", "#F97316", "#EAB308", "#22C55E", "#0A84FF", "#8B5CF6", "#EC4899"].map((color) => (<button key={color} onClick={() => setBrushSettings({ color })} className={cn("size-6 rounded-full border-2 transition-transform hover:scale-110", brushSettings.color === color ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/30" : "border-transparent")} style={{ backgroundColor: color }} />))}<input type="color" value={brushSettings.color} onChange={(e) => setBrushSettings({ color: e.target.value })} className="size-6 p-0 border-0 rounded-full overflow-hidden cursor-pointer" /></div></div></div>) }
  if (activeTool === 'image') { return (<div className="flex flex-col gap-4 pt-2"><div className="flex items-center justify-between"><span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{t("imageSettings")}</span></div><input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} /><Button onClick={() => fileInputRef.current?.click()} className="w-full gap-2" style={{ backgroundColor: highlightColor }}><Upload className="size-4" /> {t("importImage")}</Button></div>) }

  if (!selectedObject) return <div className="text-xs text-neutral-500 p-2 text-center italic">{t("selectObjectOrTool")}</div>
  const currentAnchor = selectedObject.transform.anchor || 'top-left'
  const anchorPositions: AnchorPosition[] = ["top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right"]

  const textColors = [
    "#000000", "#333333", "#EF4444", "#F97316", "#EAB308", "#22C55E", "#0A84FF", "#8B5CF6", "#EC4899", "#FFFFFF"
  ]

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div><label className="mb-2 block text-xs font-medium text-neutral-600 dark:text-neutral-400">{t("anchorPoint")}</label><div className="grid grid-cols-3 gap-1 w-20 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-md mx-auto">{anchorPositions.map(pos => (<button key={pos} onClick={() => updateObject(selectedObject.id, { transform: { ...selectedObject.transform, anchor: pos } })} className={cn("size-5 flex items-center justify-center rounded-[2px] hover:bg-white dark:hover:bg-neutral-700 transition-all", currentAnchor === pos && "bg-white dark:bg-neutral-700 shadow-sm ring-1 ring-black/5")}><div className={cn("size-1.5 rounded-full", currentAnchor === pos ? "bg-[var(--primary)]" : "bg-neutral-400")} /></button>))}</div></div>
      {(selectedObject.type === "text" || selectedObject.type === "note") && (
        <div className="space-y-3 pb-3 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2"><Type className="size-4 text-neutral-500" /><span className="text-xs font-medium">{selectedObject.type === 'note' ? t("noteStyles") : t("textStyles")}</span></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-neutral-500 mb-1 block font-medium">{t("font")}</label>
              <select
                className="w-full h-8 rounded-md border border-neutral-200 bg-white text-xs px-2 dark:bg-neutral-800 dark:border-neutral-700 focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
                style={{ "--ring": highlightColor, fontFamily: (selectedObject.data as any).fontFamily } as React.CSSProperties}
                value={(selectedObject.data as any).fontFamily}
                onChange={(e) => updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), fontFamily: e.target.value } })}
              >
                <option value="Inter" style={{ fontFamily: 'Inter, sans-serif' }}>Inter</option>
                <option value="Arial" style={{ fontFamily: 'Arial, sans-serif' }}>Arial</option>
                <option value="Georgia" style={{ fontFamily: 'Georgia, serif' }}>Georgia</option>
                <option value="Times New Roman" style={{ fontFamily: '"Times New Roman", serif' }}>Times New Roman</option>
                <option value="Courier New" style={{ fontFamily: '"Courier New", monospace' }}>Courier New</option>
                <option value="Verdana" style={{ fontFamily: 'Verdana, sans-serif' }}>Verdana</option>
                <option value="Trebuchet MS" style={{ fontFamily: '"Trebuchet MS", sans-serif' }}>Trebuchet MS</option>
                <option value="Palatino Linotype" style={{ fontFamily: '"Palatino Linotype", serif' }}>Palatino</option>
                <option value="Lucida Console" style={{ fontFamily: '"Lucida Console", monospace' }}>Lucida Console</option>
                <option value="Impact" style={{ fontFamily: 'Impact, sans-serif' }}>Impact</option>
                <option value="Comic Sans MS" style={{ fontFamily: '"Comic Sans MS", cursive' }}>Comic Sans</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 mb-1 block font-medium">{t("size")}</label>
              <input type="number" className="w-full h-8 rounded-md border border-neutral-200 bg-white text-xs px-2 dark:bg-neutral-800 dark:border-neutral-700 focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none" style={{ "--ring": highlightColor } as React.CSSProperties} value={(selectedObject.data as any).fontSize || 14} onChange={(e) => updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), fontSize: Number(e.target.value) } })} />
            </div>
          </div>
          <div><label className="text-[10px] text-neutral-500 mb-1 block font-medium">{t("align")}</label><div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-md p-1 gap-1">{['left', 'center', 'right'].map((align) => (<button key={align} onClick={() => updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), align } })} className={cn("flex-1 flex justify-center py-1 rounded text-neutral-500 hover:bg-white hover:text-neutral-900 dark:hover:bg-neutral-700 transition-all", (selectedObject.data as any).align === align && "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white")}>{align === 'left' && <AlignLeft className="size-3" />}{align === 'center' && <AlignCenter className="size-3" />}{align === 'right' && <AlignRight className="size-3" />}</button>))}</div></div>

          {selectedObject.type === "note" && (
            <div>
              <label className="text-[10px] text-neutral-500 mb-1 block">{t("verticalAlign")}</label>
              <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-md p-1 gap-1">
                {['top', 'center', 'bottom'].map((align) => (
                  <button
                    key={align}
                    onClick={() => updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), verticalAlign: align } })}
                    className={cn(
                      "flex-1 flex justify-center py-1 rounded text-neutral-500 hover:bg-white hover:text-neutral-900 dark:hover:bg-neutral-700 transition-all",
                      ((selectedObject.data as any).verticalAlign || 'top') === align && "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                    )}
                  >
                    {align === 'top' && <AlignLeft className="size-3 rotate-90" />}
                    {align === 'center' && <AlignCenter className="size-3 rotate-90" />}
                    {align === 'bottom' && <AlignRight className="size-3 rotate-90" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] text-neutral-500 mb-1 block">
              {selectedObject.type === "note" ? t("strokeColor") : t("fillColor")}
            </label>
            <div className="flex flex-wrap gap-2">
              {textColors.map(color => (
                <button
                  key={color}
                  onClick={() => updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), [selectedObject.type === 'note' ? 'textColor' : 'color']: color } })}
                  className={cn(
                    "size-6 rounded-full border transition-transform hover:scale-110",
                    ((selectedObject.type === 'note' ? (selectedObject.data as any).textColor : (selectedObject.data as any).color) === color) && "ring-2 ring-[var(--primary)] ring-offset-1 border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
              <div className="relative size-6 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:scale-110 transition-transform">
                <input
                  type="color"
                  value={(selectedObject.type === 'note' ? (selectedObject.data as any).textColor : (selectedObject.data as any).color) || "#000000"}
                  onChange={(e) => updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), [selectedObject.type === 'note' ? 'textColor' : 'color']: e.target.value } })}
                  className="absolute -top-2 -left-2 size-10 p-0 border-0 cursor-pointer"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[1px]">
                  <div className="size-2 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500" />
                </div>
              </div>
            </div>
          </div>

          {selectedObject.type === "note" && (
            <>
              <div>
                <label className="text-[10px] text-neutral-500 mb-1 block font-medium">{t("background")}</label>
                <div className="flex gap-2 flex-wrap">
                  {['#FFF2CC', '#FFD1D1', '#D1FFD6', '#D1F4FF', '#FAD1FF', '#FFE6CC', '#E8F5E9', '#E3F2FD'].map(color => (
                    <button
                      key={color}
                      onClick={() => updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), backgroundColor: color } })}
                      className={cn("size-6 rounded-full border shadow-sm hover:scale-110 transition-transform", (selectedObject.data as any).backgroundColor === color && "ring-2 ring-[var(--primary)] ring-offset-1")}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input
                    type="color"
                    value={(selectedObject.data as any).backgroundColor || '#FFF2CC'}
                    onChange={(e) => updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), backgroundColor: e.target.value } })}
                    className="size-6 border-0 p-0 rounded-full cursor-pointer"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {/* ... Shape & Image & Transform props ... */}
      {selectedObject.type === "shape" && (
        <div className="space-y-3 pb-3 border-b border-neutral-200 dark:border-neutral-700">
          <div>
            <label className="text-[10px] text-neutral-500 mb-1 block font-medium">Shape Type</label>
            <select
              className="w-full h-8 rounded-md border border-neutral-200 bg-white text-xs px-2 dark:bg-neutral-800 dark:border-neutral-700 focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none"
              style={{ "--ring": highlightColor } as React.CSSProperties}
              value={(selectedObject.data as any).shapeType}
              onChange={(e) => updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), shapeType: e.target.value } })}
            >
              <option value="rectangle">{t("rectangle")}</option>
              <option value="rounded_rectangle">{t("roundedRectangle")}</option>
              <option value="ellipse">{t("ellipse")}</option>
              <option value="circle">{t("circle")}</option>
              <option value="triangle">{t("triangle")}</option>
              <option value="line">{t("line")}</option>
              <option value="arrow">{t("arrow")}</option>
              <option value="star">{t("star")}</option>
              <option value="cloud">{t("cloud")}</option>
              <option value="speech_bubble">{t("speechBubble")}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-neutral-500 mb-1 block font-medium">{t("fillColor")}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(selectedObject.data as any).fillColor}
                  onChange={(e) => updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), fillColor: e.target.value } })}
                  className="size-8 border-0 p-0 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={(selectedObject.data as any).fillColor}
                  onChange={(e) => updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), fillColor: e.target.value } })}
                  className="flex-1 h-8 rounded-md border border-neutral-200 bg-white text-xs px-2 font-mono dark:bg-neutral-800 dark:border-neutral-700"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 mb-1 block font-medium">{t("strokeColor")}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(selectedObject.data as any).strokeColor}
                  onChange={(e) => updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), strokeColor: e.target.value } })}
                  className="size-8 border-0 p-0 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-neutral-500 mb-1 block font-medium">Border Type</label>
            <Select value={(selectedObject.data as any).borderType || 'solid'} onValueChange={(value: any) => updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), borderType: value } })}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder={t("selectBorder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid"><div className="flex items-center gap-2 w-24"><div className="h-0.5 w-full bg-current" /></div></SelectItem>
                <SelectItem value="dashed"><div className="flex items-center gap-2 w-24"><div className="h-0.5 w-full border-t-2 border-dashed border-current" /></div></SelectItem>
                <SelectItem value="dotted"><div className="flex items-center gap-2 w-24"><div className="h-0.5 w-full border-t-2 border-dotted border-current" /></div></SelectItem>
                <SelectItem value="bold"><div className="flex items-center gap-2 w-24"><div className="h-1 w-full bg-current" /></div></SelectItem>
                <SelectItem value="none"><span className="text-xs text-muted-foreground">{t("none")}</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      {selectedObject.type === "image" && (<div className="space-y-3 pb-3 border-b border-neutral-200 dark:border-neutral-700"><div className="flex items-center gap-2"><ImageIcon className="size-4 text-neutral-500" /><span className="text-xs font-medium">{t("imageSettings")}</span></div><div><label className="mb-2 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400"><span>{t("opacity")}</span><span className="font-medium">{Math.round((selectedObject.data as any).opacity * 100)}%</span></label><Slider value={[(selectedObject.data as any).opacity * 100]} onValueChange={([value]) => updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), opacity: value / 100 } })} min={0} max={100} step={1} className="w-full" /></div><div><label className="text-[10px] text-neutral-500 mb-1 block">Blend Mode</label><select className="w-full h-8 rounded-md border border-neutral-200 bg-white text-xs px-2 dark:bg-neutral-800 dark:border-neutral-700" value={(selectedObject.data as any).blendMode || 'normal'} onChange={(e) => updateObject(selectedObject.id, { data: { ...(selectedObject.data as any), blendMode: e.target.value } })}><option value="normal">{t("normal")}</option><option value="multiply">{t("multiply")}</option><option value="screen">{t("screen")}</option><option value="overlay">{t("overlay")}</option></select></div></div>)}
      <div><label className="mb-2 block text-xs font-medium text-neutral-600 dark:text-neutral-400">{t("position")}</label><div className="grid grid-cols-2 gap-2"><div><label className="mb-1 block text-xs text-neutral-500">X</label><input type="number" value={Math.round(selectedObject.transform.x)} onChange={(e) => updateObject(selectedObject.id, { transform: { ...selectedObject.transform, x: parseFloat(e.target.value) } })} className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800 focus:ring-2 focus:border-transparent outline-none" style={{ "--ring": highlightColor } as React.CSSProperties} /></div><div><label className="mb-1 block text-xs text-neutral-500">Y</label><input type="number" value={Math.round(selectedObject.transform.y)} onChange={(e) => updateObject(selectedObject.id, { transform: { ...selectedObject.transform, y: parseFloat(e.target.value) } })} className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800 focus:ring-2 focus:border-transparent outline-none" style={{ "--ring": highlightColor } as React.CSSProperties} /></div></div></div><div><label className="mb-2 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400"><span>{t("rotation")}</span><span className="font-medium">{Math.round(selectedObject.transform.rotation)}°</span></label><Slider value={[selectedObject.transform.rotation]} onValueChange={([value]) => updateObject(selectedObject.id, { transform: { ...selectedObject.transform, rotation: value } })} min={-180} max={180} step={1} className="w-full" /></div>
    </div>
  )
}

function LayersSection() {
  const { layers, activeLayerId, setActiveLayer, updateLayer, deleteLayer, addLayer, objects, moveLayer, moveObjectToLayer, highlightColor, reorderLayer, reorderObjectInLayer, deleteObject, updateObject } = useHaloboardStore()
  const { t } = useTranslation()
  const [expandedLayers, setExpandedLayers] = useState<string[]>(['layer-1'])
  const toggleExpand = (id: string) => setExpandedLayers(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])
  const handleLayerDragStart = (e: React.DragEvent, index: number) => { e.dataTransfer.setData('layerIndex', index.toString()) }
  const handleLayerDrop = (e: React.DragEvent, dropIndex: number) => { e.preventDefault(); const dragIndex = Number(e.dataTransfer.getData('layerIndex')); if (!isNaN(dragIndex) && dragIndex !== dropIndex) reorderLayer(dragIndex, dropIndex) }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center justify-between mb-2"><span className="text-[10px] text-neutral-400 uppercase font-semibold tracking-wider">{t("stack")}</span><Button variant="ghost" size="sm" onClick={() => addLayer(t("newLayer") + " " + (layers.length + 1))} className="h-6 px-2 text-xs gap-1"><Plus className="size-3" /> {t("newLayer")}</Button></div>
      {layers.map((layer, index) => (
        <div key={layer.id} draggable onDragStart={(e) => handleLayerDragStart(e, index)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleLayerDrop(e, index)} className={cn("rounded-lg border transition-all", activeLayerId === layer.id ? "bg-accent/50" : "border-neutral-100 bg-white/50 dark:border-neutral-800 dark:bg-neutral-800/30")} style={activeLayerId === layer.id ? { borderColor: highlightColor, backgroundColor: `${highlightColor}10` } : {}}>
          <div className="flex items-center gap-2 p-2 cursor-pointer" onClick={() => setActiveLayer(layer.id)}>
            <div className="cursor-grab active:cursor-grabbing text-neutral-400"><GripVertical className="size-3" /></div>
            <button onClick={(e) => { e.stopPropagation(); toggleExpand(layer.id) }} className="p-0.5 rounded hover:bg-black/5">{expandedLayers.includes(layer.id) ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}</button>
            <input
              type="text"
              value={layer.name}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
              className="bg-transparent text-sm font-medium text-neutral-800 outline-none dark:text-neutral-200 w-full focus:bg-white dark:focus:bg-neutral-700 px-1 rounded focus:ring-1"
              style={{ "--ring": highlightColor } as React.CSSProperties}
            />
            <div className="flex items-center gap-0.5"><button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }) }} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/5">{layer.visible ? <Eye className="size-3.5 text-neutral-600 dark:text-neutral-400" /> : <EyeOff className="size-3.5 text-neutral-400" />}</button><button onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }) }} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/5">{layer.locked ? <Lock className="size-3.5 text-neutral-600 dark:text-neutral-400" /> : <LockOpen className="size-3.5 text-neutral-400" />}</button>{layers.length > 1 && (<button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id) }} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="size-3.5" /></button>)}</div>
          </div>
          {expandedLayers.includes(layer.id) && (<div className="px-2 pb-2 space-y-1 border-t border-neutral-200/50 dark:border-neutral-700/50 mt-1 pt-1">{layer.objectIds.length === 0 ? (<div className="text-[10px] text-neutral-400 pl-6 italic">{t("emptyLayer")}</div>) : (layer.objectIds.map((objId, idx) => { const obj = objects.find(o => o.id === objId); if (!obj) return null; return (<div key={objId} draggable onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData('objId', objId); e.dataTransfer.setData('sourceLayer', layer.id) }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const droppedId = e.dataTransfer.getData('objId'); if (droppedId) reorderObjectInLayer(droppedId, layer.id, idx) }} className="flex items-center justify-between group pl-2 pr-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-xs cursor-grab active:cursor-grabbing"><div className="flex items-center gap-2 flex-1 min-w-0"><GripVertical className="size-3 text-neutral-400 flex-shrink-0" /><span className="text-[10px] text-neutral-400 uppercase w-8 flex-shrink-0">{obj.type}</span><input type="text" value={obj.name} onClick={(e) => e.stopPropagation()} onChange={(e) => updateObject(obj.id, { name: e.target.value })} className="bg-transparent text-xs text-neutral-600 dark:text-neutral-300 outline-none w-full focus:bg-white dark:focus:bg-neutral-700 px-1 rounded focus:ring-1 min-w-0" style={{ "--ring": highlightColor } as React.CSSProperties} /></div><button onClick={() => deleteObject(objId)} className="p-0.5 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="size-3" /></button></div>) }))}</div>)}
        </div>
      ))}
    </div>
  )
}

function HistorySection() {
  const { history, historyIndex, setHistoryIndex, undo, redo } = useHaloboardStore()
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2 pt-2"><div className="flex gap-2 mb-2"><Button variant="outline" size="sm" onClick={() => undo()} disabled={historyIndex <= 0} className="flex-1 gap-1 h-8"><RotateCcw className="size-3" /> {t("undo")}</Button><Button variant="outline" size="sm" onClick={() => redo()} disabled={historyIndex >= history.length - 1} className="flex-1 gap-1 h-8"><Clock className="size-3" /> {t("redo")}</Button></div><ScrollArea className="h-32 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50"><div className="p-2 space-y-1">{history.map((step, i) => {
      const actionText = i === 0 ? t("initialState") : (step.action || `${t("action")} ${i}`)
      const displayText = i === historyIndex ? `${actionText} (${t("current")})` : actionText
      const textColor = step.userColor || "#666666"
      return (
        <button
          key={i}
          onClick={() => setHistoryIndex(i)}
          className={cn(
            "w-full text-left px-2 py-1 text-xs rounded transition-colors truncate",
            i === historyIndex ? "bg-[#0A84FF]/10 text-[#0A84FF] font-medium" : "text-neutral-600 hover:bg-black/5 dark:text-neutral-400 dark:hover:bg-white/5"
          )}
          style={i === historyIndex ? {} : { color: textColor }}
        >
          {displayText}
        </button>
      )
    })}</div></ScrollArea></div>
  )
}
function ChatSection() {
  const [message, setMessage] = useState("")
  const chatRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  const { chatMessages, addChatMessage, users, currentUserId, highlightColor } = useHaloboardStore()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [chatMessages])

  const handleSendMessage = () => {
    if (!message.trim()) return

    addChatMessage(message.trim())

    setMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getUserById = (userId: string) => {
    return users.find((u) => u.id === userId)
  }

  return (
    <div className="flex flex-col h-64 pt-2">
      {/* Messages */}
      <div ref={chatRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
        {chatMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t("noMessages")}
            </p>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const user = getUserById(msg.userId)
            const isCurrentUser = msg.userId === currentUserId

            return (
              <div key={msg.id} className={`flex gap-2 ${isCurrentUser ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div
                  className="size-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: user?.color || "#999999" }}
                >
                  {user?.name?.charAt(0).toUpperCase() || "?"}
                </div>

                {/* Message Content */}
                <div className={`flex flex-col gap-1 max-w-[calc(100%-2rem)] ${isCurrentUser ? "items-end" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      {isCurrentUser ? t("you") : user?.name || t("unknown")}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    className={`max-w-xs rounded-lg px-2 py-1 text-sm break-words ${isCurrentUser
                      ? "text-white"
                      : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                      }`}
                    style={isCurrentUser ? { backgroundColor: highlightColor } : {}}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t border-neutral-200 pt-2 dark:border-neutral-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t("typeMessage")}
            className="flex-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm outline-none focus:ring-2 dark:border-neutral-700 dark:bg-neutral-800"
            style={{ "--ring": highlightColor } as React.CSSProperties}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            size="sm"
            className="hover:opacity-90"
            style={{ backgroundColor: highlightColor }}
          >
            <Send className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function RightPanel() {
  const { t } = useTranslation()
  const { highlightColor } = useHaloboardStore()

  return (
    <aside
      className="fixed right-4 top-20 bottom-4 w-72 z-30 flex flex-col gap-3 pointer-events-none"
      style={{ "--primary": highlightColor, "--ring": highlightColor } as React.CSSProperties}
    >
      <div className="flex-1 overflow-y-auto pr-1 pb-1 pointer-events-auto flex flex-col gap-3">
        <PanelSection title={t("properties")}><PropertiesSection /></PanelSection>
        <PanelSection title={t("layers")}><LayersSection /></PanelSection>
        <PanelSection title={t("history")} defaultOpen={false}><HistorySection /></PanelSection>
        <PanelSection title={t("chat")} defaultOpen={false}><ChatSection /></PanelSection>
      </div>
    </aside>
  )
}