// lib/toolRegistry.ts - Central tool registry for Photoshop-like tool management
// Manages tool switching, event binding/unbinding, and prevents event duplication

import type { Point, CanvasObject, ToolType } from './types'

export interface ToolContext {
    canvasRef: React.RefObject<HTMLCanvasElement>
    containerRef: React.RefObject<HTMLDivElement>
    zoom: number
    panX: number
    panY: number
    screenToCanvas: (point: Point) => Point
    canvasToScreen: (point: Point) => Point
    getObjectAtPoint: (point: Point) => CanvasObject | null
    selectedIds: string[]
    setSelectedIds: (ids: string[]) => void
    activeTool: ToolType
    setActiveTool: (tool: ToolType) => void
    openModal: (type: 'text' | 'note', objectId: string, position: Point) => void
    closeModal: () => void
}

export interface ToolHandler {
    name: ToolType
    cursor: string

    // Lifecycle
    onActivate?: (ctx: ToolContext) => void
    onDeactivate?: (ctx: ToolContext) => void

    // Mouse events
    onMouseDown?: (e: React.MouseEvent, point: Point, ctx: ToolContext) => void
    onMouseMove?: (e: React.MouseEvent, point: Point, ctx: ToolContext) => void
    onMouseUp?: (e: React.MouseEvent, point: Point, ctx: ToolContext) => void
    onDoubleClick?: (e: React.MouseEvent, point: Point, ctx: ToolContext) => void

    // Keyboard events
    onKeyDown?: (e: KeyboardEvent, ctx: ToolContext) => void
    onKeyUp?: (e: KeyboardEvent, ctx: ToolContext) => void

    // Cursor update
    getCursor?: (point: Point, ctx: ToolContext) => string

    // Render overlay (for previews, handles, etc.)
    renderOverlay?: (ctx: CanvasRenderingContext2D, toolCtx: ToolContext) => void
}

class ToolRegistry {
    private tools: Map<ToolType, ToolHandler> = new Map()
    private activeTool: ToolType = 'select'
    private context: ToolContext | null = null

    register(handler: ToolHandler): void {
        this.tools.set(handler.name, handler)
    }

    unregister(name: ToolType): void {
        this.tools.delete(name)
    }

    setContext(ctx: ToolContext): void {
        this.context = ctx
    }

    getContext(): ToolContext | null {
        return this.context
    }

    getTool(name: ToolType): ToolHandler | undefined {
        return this.tools.get(name)
    }

    getActiveTool(): ToolHandler | undefined {
        return this.tools.get(this.activeTool)
    }

    switchTool(name: ToolType): void {
        if (!this.context) return

        // Deactivate current tool
        const currentTool = this.tools.get(this.activeTool)
        if (currentTool?.onDeactivate) {
            currentTool.onDeactivate(this.context)
        }

        // Activate new tool
        this.activeTool = name
        const newTool = this.tools.get(name)
        if (newTool?.onActivate) {
            newTool.onActivate(this.context)
        }
    }

    // Event delegation
    handleMouseDown(e: React.MouseEvent, point: Point): void {
        if (!this.context) return
        const tool = this.getActiveTool()
        tool?.onMouseDown?.(e, point, this.context)
    }

    handleMouseMove(e: React.MouseEvent, point: Point): void {
        if (!this.context) return
        const tool = this.getActiveTool()
        tool?.onMouseMove?.(e, point, this.context)
    }

    handleMouseUp(e: React.MouseEvent, point: Point): void {
        if (!this.context) return
        const tool = this.getActiveTool()
        tool?.onMouseUp?.(e, point, this.context)
    }

    handleDoubleClick(e: React.MouseEvent, point: Point): void {
        if (!this.context) return
        const tool = this.getActiveTool()
        tool?.onDoubleClick?.(e, point, this.context)
    }

    handleKeyDown(e: KeyboardEvent): void {
        if (!this.context) return
        const tool = this.getActiveTool()
        tool?.onKeyDown?.(e, this.context)
    }

    handleKeyUp(e: KeyboardEvent): void {
        if (!this.context) return
        const tool = this.getActiveTool()
        tool?.onKeyUp?.(e, this.context)
    }

    getCursor(point: Point): string {
        if (!this.context) return 'default'
        const tool = this.getActiveTool()
        return tool?.getCursor?.(point, this.context) ?? tool?.cursor ?? 'default'
    }

    renderOverlay(ctx: CanvasRenderingContext2D): void {
        if (!this.context) return
        const tool = this.getActiveTool()
        tool?.renderOverlay?.(ctx, this.context)
    }
}

// Singleton instance
let toolRegistry: ToolRegistry | null = null

export function getToolRegistry(): ToolRegistry {
    if (!toolRegistry) {
        toolRegistry = new ToolRegistry()
    }
    return toolRegistry
}

export function resetToolRegistry(): void {
    toolRegistry = null
}
