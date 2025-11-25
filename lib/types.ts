// Core types for Haloboard

export type ToolType = "select" | "brush" | "eraser" | "text" | "shape" | "note" | "image" | "comment"

export type ShapeType = "rectangle" | "ellipse" | "line" | "triangle" | "circle" | "rounded_rectangle" | "cloud" | "star" | "arrow" | "speech_bubble"

export type BorderType = "solid" | "dashed" | "dotted" | "bold" | "none"

export type BlendMode = "normal" | "multiply" | "screen" | "overlay"

export type AnchorPosition = 
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right"

export type Language = "en" | "tr" | "ru" | "es"

export type GridType = "dots" | "lines" | "cross" | "grid"

export interface Point {
  x: number
  y: number
}

export interface BrushSettings {
  size: number
  opacity: number
  softness: number
  color: string
  eraserMode: "object" | "partial"
}

export interface ShapeSettings {
  shapeType: ShapeType
  fillColor: string
  strokeColor: string
  strokeWidth: number
  borderType: BorderType
  opacity: number
}

export interface CanvasSettings {
  projectName: string
  infinite: boolean
  width: number
  height: number
  backgroundColor: string
}

export interface Project {
  id: string
  name: string
  lastEdited: number
  thumbnail?: string
  data: {
    objects: CanvasObject[]
    layers: Layer[]
    canvasSettings: CanvasSettings
  }
}

export interface Transform {
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
  anchor: AnchorPosition
}

export interface Layer {
  id: string
  name: string
  opacity: number
  blendMode: BlendMode
  visible: boolean
  locked: boolean
  objectIds: string[]
}

export interface CanvasObject {
  id: string
  name: string
  type: "path" | "text" | "shape" | "note" | "image"
  layerId: string
  transform: Transform
  data: PathData | TextData | ShapeData | NoteData | ImageData
}

export interface PathData {
  points: Point[]
  strokeColor: string
  strokeWidth: number
  opacity: number
}

export interface TextData {
  content: string
  fontFamily: string
  fontSize: number
  color: string
  align: "left" | "center" | "right"
  width: number
  height: number
}

export interface ShapeData {
  shapeType: ShapeType
  width: number
  height: number
  fillColor: string
  strokeColor: string
  strokeWidth: number
  borderType: BorderType
  opacity: number
}

export interface NoteData {
  content: string
  width: number
  height: number
  color: string // Background Color
  textColor?: string // New: Text Color
  fontFamily?: string
  fontSize?: number
  align?: "left" | "center" | "right"
  verticalAlign?: "top" | "center" | "bottom"
}

export interface ImageData {
  src: string
  width: number
  height: number
  opacity: number
  blendMode?: BlendMode
}

export interface User {
  id: string
  name: string
  color: string
  cursor?: Point
  lastActive?: number
}

export interface ChatMessage {
  id: string
  userId: string
  content: string
  timestamp: number
}

export interface HistoryStep {
  objects: CanvasObject[]
  layers: Layer[]
}

export type Keybindings = {
  select: string
  brush: string
  eraser: string
  shape: string
  text: string
  note: string
  image: string
}

export interface CanvasState {
  objects: CanvasObject[]
  layers: Layer[]
  selectedIds: string[]
  history: HistoryStep[]
  historyIndex: number
}

// Collaboration Types
export type BroadcastMessage =
  | { type: "CURSOR_MOVE"; userId: string; userName: string; userColor: string; position: Point }
  | { type: "OBJECT_UPDATE"; object: CanvasObject }
  | { type: "OBJECT_DELETE"; objectId: string }
  | { type: "USER_JOIN"; user: User }
  | { type: "USER_LEAVE"; userId: string }
  | { type: "CHAT_MESSAGE"; message: ChatMessage }