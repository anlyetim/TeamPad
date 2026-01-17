// Core types for Haloboard

export type ToolType = "select" | "select-rect" | "select-ellipse" | "select-lasso" | "brush" | "eraser" | "text" | "shape" | "note" | "image" | "comment"

export type ShapeType = "rectangle" | "ellipse" | "line" | "triangle" | "circle" | "rounded_rectangle" | "cloud" | "star" | "arrow" | "speech_bubble"

export type BorderType = "solid" | "dashed" | "dotted" | "bold" | "none"

// GIMP-style blending modes
export type BlendMode =
  // Normal group
  | "normal"
  | "dissolve"
  // Lighten group
  | "lighten"
  | "screen"
  | "dodge"
  | "addition"
  // Darken group
  | "darken"
  | "multiply"
  | "burn"
  // Contrast group
  | "overlay"
  | "soft-light"
  | "hard-light"
  // Inversion group
  | "difference"
  | "exclusion"
  // Component group
  | "hue"
  | "saturation"
  | "color"
  | "luminosity"

export type LayerColorTag = "none" | "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink"

export type AnchorPosition =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right"

export type Language = "en" | "tr" | "ru" | "es"

export type GridType = "dots" | "lines" | "cross" | "grid"

export type PhotoshopTool =
  | "select" | "directSelect" | "magicWand" | "lasso" | "polygonLasso"
  | "crop" | "slice" | "eyedropper" | "colorSampler"
  | "brush" | "pencil" | "cloneStamp" | "patternStamp" | "eraser" | "backgroundEraser" | "magicEraser"
  | "gradient" | "paintBucket" | "blur" | "sharpen" | "smudge" | "dodge" | "burn" | "sponge"
  | "pen" | "text" | "notes" | "shape" | "rectangle" | "roundedRectangle" | "ellipse" | "polygon" | "line"
  | "customShape" | "hand" | "zoom" | "rotateView"

export type SelectionMode = "new" | "add" | "subtract" | "intersect"

export type TransformHandle = "nw" | "ne" | "se" | "sw" | "n" | "e" | "s" | "w" | "rotate" | "body"

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
  spacing: number
  hardness: number
}

export interface ToolProperties {
  opacity: number
  blendMode: BlendMode
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
  // GIMP-style enhancements
  thumbnail?: string // Base64 data URL for 64x64 preview
  colorTag?: LayerColorTag // Visual color coding
  parentId?: string // For layer groups
  isGroup?: boolean // True if this is a layer group/folder
  collapsed?: boolean // For group UI state
}

export interface CanvasObject {
  id: string
  name: string
  type: "path" | "text" | "shape" | "note" | "image"
  layerId: string
  transform: Transform
  data: PathData | TextData | ShapeData | NoteData | ImageData
  properties?: ToolProperties
}

export interface PathData {
  points: Point[]
  strokeColor: string
  strokeWidth: number
  opacity: number
  erasePaths?: { points: Point[], width: number }[]
}

export interface TextData {
  content: string
  fontFamily: string
  fontSize: number
  color: string
  align: "left" | "center" | "right"
  width: number
  height: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  textDecoration?: 'none' | 'underline'
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
  backgroundColor: string // Background Color
  backgroundType: 'plain' | 'lined' | 'grid' | 'striped' | 'none' // Background pattern
  cornerRadius: number // Corner radius for rounded notes
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
  avatar?: string
  cursor?: Point
  lastActive?: number
  isAdmin?: boolean
  tool?: ToolType
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
  userId?: string
  userName?: string
  userColor?: string
  action?: string
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
  | { type: "CURSOR_UPDATE"; userId: string; name: string; color: string; x: number; y: number; tool?: ToolType; timestamp: number }
  | { type: "CURSOR_CHAT"; userId: string; message: string; timestamp: number }
  | { type: "OBJECT_COMMIT"; object: CanvasObject }
  | { type: "OBJECT_DELETE"; objectId: string }
  | { type: "OBJECT_TRANSFORM"; objectId: string; delta: Partial<Transform>; timestamp: number }
  | { type: "TEXT_LIVE"; objectId: string; content: string; timestamp: number }
  | { type: "TEXT_COMMIT"; object: CanvasObject }
  | { type: "NOTE_CREATE"; object: CanvasObject }
  | { type: "CLIPBOARD_COPY"; objectIds: string[] }
  | { type: "CLIPBOARD_PASTE"; objects: CanvasObject[] }
  | { type: "SNAPSHOT_REQUEST"; userId: string }
  | { type: "SNAPSHOT_RESPONSE"; objects: CanvasObject[]; layers: Layer[]; timestamp: number }
  | { type: "USER_JOIN"; user: User }
  | { type: "USER_LEAVE"; userId: string }
  | { type: "USER_KICK"; userId: string }
  | { type: "SYNC_REQUEST"; userId: string }
  | { type: "SYNC_RESPONSE"; userId: string; objects: CanvasObject[]; layers: Layer[]; users?: User[]; history?: HistoryStep[] }
  | { type: "LAYER_UPDATE"; layer: Layer }
  | { type: "LAYER_DELETE"; layerId: string }
  | { type: "HISTORY_UPDATE"; historyStep: HistoryStep }
  | { type: "HISTORY_NAVIGATION"; action: 'undo' | 'redo' | 'setIndex'; index?: number }