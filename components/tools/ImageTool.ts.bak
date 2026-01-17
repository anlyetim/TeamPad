// components/tools/ImageTool.ts - Image import and placement tool

import type { ToolHandler, ToolContext } from '@/lib/toolRegistry'
import type { Point, CanvasObject, ImageData } from '@/lib/types'
import { useHaloboardStore } from '@/lib/store'

export const ImageTool: ToolHandler = {
    name: 'image',
    cursor: 'crosshair',

    onActivate: (ctx: ToolContext) => {
        // Nothing to initialize
    },

    onDeactivate: (ctx: ToolContext) => {
        // Nothing to clean up
    },

    onMouseDown: (e: React.MouseEvent, point: Point, ctx: ToolContext) => {
        // Check if clicking existing image
        const clickedObject = ctx.getObjectAtPoint(point)
        if (clickedObject && clickedObject.type === 'image') {
            ctx.setSelectedIds([clickedObject.id])
            return
        }

        // Trigger file picker
        openFilePicker(point, ctx)
    },

    getCursor: (point: Point, ctx: ToolContext) => {
        const clickedObject = ctx.getObjectAtPoint(point)
        if (clickedObject && clickedObject.type === 'image') {
            return 'pointer'
        }
        return 'crosshair'
    },

    renderOverlay: (ctx: CanvasRenderingContext2D, toolCtx: ToolContext) => {
        // No overlay needed
    }
}

function openFilePicker(point: Point, ctx: ToolContext) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'

    input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        try {
            const src = await readFileAsDataURL(file)
            const dimensions = await getImageDimensions(src)

            createImageObject(point, src, dimensions, ctx)
        } catch (error) {
            console.error('Failed to load image:', error)
        }
    }

    input.click()
}

function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = reject
        img.src = src
    })
}

function createImageObject(
    point: Point,
    src: string,
    dimensions: { width: number; height: number },
    ctx: ToolContext
) {
    const store = useHaloboardStore.getState()
    const { activeLayerId, addObject, setSelectedIds, setActiveTool } = store

    // Scale down if too large
    const maxSize = 400
    let width = dimensions.width
    let height = dimensions.height

    if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height)
        width *= scale
        height *= scale
    }

    const imageData: ImageData = {
        src,
        width,
        height,
        opacity: 1,
        blendMode: 'normal'
    }

    const imageObj: CanvasObject = {
        id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: 'Image',
        type: 'image',
        layerId: activeLayerId,
        transform: {
            x: point.x,
            y: point.y,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            anchor: 'top-left'
        },
        data: imageData
    }

    addObject(imageObj)
    setSelectedIds([imageObj.id])
    setActiveTool('select')
}

export default ImageTool
