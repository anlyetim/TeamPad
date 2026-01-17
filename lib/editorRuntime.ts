// lib/editorRuntime.ts - Central Photoshop-like editor runtime manager
// Handles object store, undo/redo, live deltas, snapshot management, and throttling

import type { CanvasObject, Layer, Point, Transform } from './types'

// Debug flag for network message logging
const DEBUG_EDITOR = false

export interface EditorSnapshot {
  objects: CanvasObject[]
  layers: Layer[]
  timestamp: number
}

export interface TransformDelta {
  objectId: string
  delta: Partial<Transform>
  timestamp: number
}

export interface LiveTextUpdate {
  objectId: string
  content: string
  timestamp: number
}

export class EditorRuntime {
  private objects: Map<string, CanvasObject> = new Map()
  private layers: Map<string, Layer> = new Map()
  private history: EditorSnapshot[] = []
  private historyIndex: number = -1
  private maxHistorySize = 50

  // Live operation throttling
  private lastTransformBroadcast = 0
  private lastTextBroadcast = 0
  private readonly THROTTLE_MS = 40 // ~25fps for live operations

  // Callbacks for external integration
  private onObjectUpdate?: (object: CanvasObject) => void
  private onObjectDelete?: (objectId: string) => void
  private onTransformDelta?: (delta: TransformDelta) => void
  private onTextLiveUpdate?: (update: LiveTextUpdate) => void
  private onSnapshotRequest?: () => void

  constructor() {
    if (DEBUG_EDITOR) console.log('[EditorRuntime] Initialized')
  }

  // Object Management
  addObject(object: CanvasObject, isRemote = false): void {
    this.objects.set(object.id, object)

    // Add to layer if layer exists
    const layer = this.layers.get(object.layerId)
    if (layer && !layer.objectIds.includes(object.id)) {
      layer.objectIds.push(object.id)
    }

    if (!isRemote) {
      this.saveToHistory()
      this.onObjectUpdate?.(object)
    }

    if (DEBUG_EDITOR) console.log('[EditorRuntime] Object added:', object.id)
  }

  updateObject(objectId: string, updates: Partial<CanvasObject>, isRemote = false): void {
    const object = this.objects.get(objectId)
    if (!object) return

    const updatedObject = { ...object, ...updates }
    this.objects.set(objectId, updatedObject)

    if (!isRemote) {
      this.saveToHistory()
      this.onObjectUpdate?.(updatedObject)
    }

    if (DEBUG_EDITOR) console.log('[EditorRuntime] Object updated:', objectId)
  }

  deleteObject(objectId: string, isRemote = false): void {
    const object = this.objects.get(objectId)
    if (!object) return

    // Remove from layer
    const layer = this.layers.get(object.layerId)
    if (layer) {
      layer.objectIds = layer.objectIds.filter(id => id !== objectId)
    }

    this.objects.delete(objectId)

    if (!isRemote) {
      this.saveToHistory()
      this.onObjectDelete?.(objectId)
    }

    if (DEBUG_EDITOR) console.log('[EditorRuntime] Object deleted:', objectId)
  }

  getObject(objectId: string): CanvasObject | undefined {
    return this.objects.get(objectId)
  }

  getAllObjects(): CanvasObject[] {
    return Array.from(this.objects.values())
  }

  // Layer Management
  addLayer(layer: Layer, isRemote = false): void {
    this.layers.set(layer.id, layer)
    if (DEBUG_EDITOR) console.log('[EditorRuntime] Layer added:', layer.id)
  }

  updateLayer(layerId: string, updates: Partial<Layer>, isRemote = false): void {
    const layer = this.layers.get(layerId)
    if (!layer) return

    const updatedLayer = { ...layer, ...updates }
    this.layers.set(layerId, updatedLayer)
    if (DEBUG_EDITOR) console.log('[EditorRuntime] Layer updated:', layerId)
  }

  getAllLayers(): Layer[] {
    return Array.from(this.layers.values())
  }

  // Transform Operations (Photoshop-style)
  applyTransformDelta(objectId: string, delta: Partial<Transform>, isRemote = false): void {
    const object = this.objects.get(objectId)
    if (!object) return

    const newTransform = { ...object.transform, ...delta }
    const updatedObject = { ...object, transform: newTransform }
    this.objects.set(objectId, updatedObject)

    if (!isRemote) {
      const now = Date.now()
      // Throttle transform broadcasts to reduce network load
      if (now - this.lastTransformBroadcast >= this.THROTTLE_MS) {
        this.lastTransformBroadcast = now
        this.onTransformDelta?.({
          objectId,
          delta,
          timestamp: now
        })
      }
    }

    if (DEBUG_EDITOR) console.log('[EditorRuntime] Transform applied:', objectId, delta)
  }

  // Text Operations
  updateTextLive(objectId: string, content: string, isRemote = false): void {
    const object = this.objects.get(objectId)
    if (!object) return

    const updatedObject = {
      ...object,
      data: { ...object.data, content }
    }
    this.objects.set(objectId, updatedObject)

    if (!isRemote) {
      const now = Date.now()
      // Throttle text broadcasts
      if (now - this.lastTextBroadcast >= this.THROTTLE_MS) {
        this.lastTextBroadcast = now
        this.onTextLiveUpdate?.({
          objectId,
          content,
          timestamp: now
        })
      }
    }

    if (DEBUG_EDITOR) console.log('[EditorRuntime] Text updated live:', objectId)
  }

  // History Management
  saveToHistory(): void {
    const snapshot: EditorSnapshot = {
      objects: this.getAllObjects(),
      layers: this.getAllLayers(),
      timestamp: Date.now()
    }

    // Remove any history after current index (for undo/redo)
    this.history = this.history.slice(0, this.historyIndex + 1)

    // Add new snapshot
    this.history.push(snapshot)
    this.historyIndex++

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
      this.historyIndex--
    }

    if (DEBUG_EDITOR) console.log('[EditorRuntime] History saved, index:', this.historyIndex)
  }

  undo(): EditorSnapshot | null {
    if (this.historyIndex > 0) {
      this.historyIndex--
      const snapshot = this.history[this.historyIndex]

      // Restore state
      this.objects.clear()
      this.layers.clear()
      snapshot.objects.forEach(obj => this.objects.set(obj.id, obj))
      snapshot.layers.forEach(layer => this.layers.set(layer.id, layer))

      if (DEBUG_EDITOR) console.log('[EditorRuntime] Undo to index:', this.historyIndex)
      return snapshot
    }
    return null
  }

  redo(): EditorSnapshot | null {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++
      const snapshot = this.history[this.historyIndex]

      // Restore state
      this.objects.clear()
      this.layers.clear()
      snapshot.objects.forEach(obj => this.objects.set(obj.id, obj))
      snapshot.layers.forEach(layer => this.layers.set(layer.id, layer))

      if (DEBUG_EDITOR) console.log('[EditorRuntime] Redo to index:', this.historyIndex)
      return snapshot
    }
    return null
  }

  // Snapshot Management for Multiplayer
  createSnapshot(): EditorSnapshot {
    return {
      objects: this.getAllObjects(),
      layers: this.getAllLayers(),
      timestamp: Date.now()
    }
  }

  applySnapshot(snapshot: EditorSnapshot, isRemote = false): void {
    this.objects.clear()
    this.layers.clear()
    snapshot.objects.forEach(obj => this.objects.set(obj.id, obj))
    snapshot.layers.forEach(layer => this.layers.set(layer.id, layer))

    if (!isRemote) {
      this.saveToHistory()
    }

    if (DEBUG_EDITOR) console.log('[EditorRuntime] Snapshot applied')
  }

  requestSnapshot(): void {
    this.onSnapshotRequest?.()
    if (DEBUG_EDITOR) console.log('[EditorRuntime] Snapshot requested')
  }

  // Callback Registration
  setCallbacks(callbacks: {
    onObjectUpdate?: (object: CanvasObject) => void
    onObjectDelete?: (objectId: string) => void
    onTransformDelta?: (delta: TransformDelta) => void
    onTextLiveUpdate?: (update: LiveTextUpdate) => void
    onSnapshotRequest?: () => void
  }): void {
    this.onObjectUpdate = callbacks.onObjectUpdate
    this.onObjectDelete = callbacks.onObjectDelete
    this.onTransformDelta = callbacks.onTransformDelta
    this.onTextLiveUpdate = callbacks.onTextLiveUpdate
    this.onSnapshotRequest = callbacks.onSnapshotRequest
  }

  // Utility Methods
  getObjectAtPoint(point: Point, zoom: number, panX: number, panY: number): CanvasObject | null {
    // Convert screen point to canvas point
    const canvasX = (point.x - panX) / zoom
    const canvasY = (point.y - panY) / zoom

    // Check objects in reverse order (top to bottom)
    for (const layer of this.getAllLayers().reverse()) {
      if (!layer.visible) continue

      for (const objectId of layer.objectIds.slice().reverse()) {
        const object = this.objects.get(objectId)
        if (!object) continue

        // Simple bounding box check (can be enhanced for better hit testing)
        const bounds = this.getObjectBounds(object)
        if (canvasX >= bounds.left && canvasX <= bounds.right &&
            canvasY >= bounds.top && canvasY <= bounds.bottom) {
          return object
        }
      }
    }

    return null
  }

  private getObjectBounds(object: CanvasObject): { left: number, top: number, right: number, bottom: number } {
    // Calculate transformed bounds
    const { width, height } = this.getObjectSize(object)
    const anchor = this.getAnchorOffset(object, width, height)

    const left = object.transform.x - anchor.x * object.transform.scaleX
    const top = object.transform.y - anchor.y * object.transform.scaleY
    const right = left + width * object.transform.scaleX
    const bottom = top + height * object.transform.scaleY

    return { left, top, right, bottom }
  }

  private getObjectSize(object: CanvasObject): { width: number, height: number } {
    switch (object.type) {
      case 'path':
        const pathData = object.data as any
        if (pathData.points?.length < 2) return { width: 0, height: 0 }
        const xs = pathData.points.map((p: Point) => p.x)
        const ys = pathData.points.map((p: Point) => p.y)
        return {
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys)
        }
      case 'shape':
        return { width: (object.data as any).width, height: (object.data as any).height }
      case 'text':
        return { width: (object.data as any).width, height: (object.data as any).height }
      case 'note':
        return { width: (object.data as any).width, height: (object.data as any).height }
      case 'image':
        return { width: (object.data as any).width, height: (object.data as any).height }
      default:
        return { width: 0, height: 0 }
    }
  }

  private getAnchorOffset(object: CanvasObject, width: number, height: number): Point {
    const anchor = object.transform.anchor || 'center'
    let x = 0, y = 0
    if (anchor.includes('center')) x = width / 2
    if (anchor.includes('right')) x = width
    if (anchor.includes('bottom')) y = height
    if (anchor === 'center-left') y = height / 2
    if (anchor === 'center-right') y = height / 2
    if (anchor === 'center') { x = width / 2; y = height / 2 }
    return { x, y }
  }

  // Clipboard Operations
  copyObjects(objectIds: string[]): CanvasObject[] {
    return objectIds
      .map(id => this.objects.get(id))
      .filter(obj => obj !== undefined)
      .map(obj => ({
        ...obj,
        id: `${obj.id}-copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }))
  }

  duplicateObjects(objectIds: string[], offset: Point = { x: 10, y: 10 }): CanvasObject[] {
    const copies = this.copyObjects(objectIds)
    copies.forEach(copy => {
      copy.transform.x += offset.x
      copy.transform.y += offset.y
      this.addObject(copy)
    })
    return copies
  }
}

// Singleton instance
let editorRuntime: EditorRuntime | null = null

export function getEditorRuntime(): EditorRuntime {
  if (!editorRuntime) {
    editorRuntime = new EditorRuntime()
  }
  return editorRuntime
}

export function resetEditorRuntime(): void {
  editorRuntime = null
}
