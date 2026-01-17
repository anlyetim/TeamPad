// lib/LayerManager.ts - GIMP-style layer management utilities

import type { Layer, CanvasObject, BlendMode, LayerColorTag } from './types'

/**
 * LayerManager - Centralized layer operations for GIMP-style features
 */
export class LayerManager {
    /**
     * Generate a 64x64px thumbnail for a layer
     * @param layer - Layer to generate thumbnail for
     * @param objects - All canvas objects
     * @param canvasWidth - Canvas width for scaling
     * @param canvasHeight - Canvas height for scaling
     * @returns Base64 data URL of thumbnail
     */
    generateThumbnail(
        layer: Layer,
        objects: CanvasObject[],
        canvasWidth: number = 800,
        canvasHeight: number = 600
    ): string {
        const THUMB_SIZE = 64
        const canvas = document.createElement('canvas')
        canvas.width = THUMB_SIZE
        canvas.height = THUMB_SIZE
        const ctx = canvas.getContext('2d')

        if (!ctx) return ''

        // Clear with transparent background
        ctx.clearRect(0, 0, THUMB_SIZE, THUMB_SIZE)

        // Get layer objects
        const layerObjects = objects.filter(obj => layer.objectIds.includes(obj.id))

        if (layerObjects.length === 0) {
            // Empty layer - return transparent thumbnail with layer name initial
            ctx.fillStyle = '#888'
            ctx.font = '32px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(layer.name.charAt(0).toUpperCase(), THUMB_SIZE / 2, THUMB_SIZE / 2)
            return canvas.toDataURL()
        }

        // Calculate bounds of all objects in layer
        const bounds = this.calculateLayerBounds(layerObjects)
        if (!bounds) return canvas.toDataURL()

        // Calculate scale to fit in thumbnail
        const scaleX = THUMB_SIZE / bounds.width
        const scaleY = THUMB_SIZE / bounds.height
        const scale = Math.min(scaleX, scaleY, 1) * 0.9 // 90% to add padding

        // Center the content
        const offsetX = (THUMB_SIZE - bounds.width * scale) / 2
        const offsetY = (THUMB_SIZE - bounds.height * scale) / 2

        ctx.save()
        ctx.translate(offsetX, offsetY)
        ctx.scale(scale, scale)
        ctx.translate(-bounds.minX, -bounds.minY)

        // Render objects (simplified)
        layerObjects.forEach(obj => {
            this.renderObjectToThumbnail(ctx, obj)
        })

        ctx.restore()

        return canvas.toDataURL()
    }

    /**
     * Calculate bounding box for layer objects
     */
    private calculateLayerBounds(objects: CanvasObject[]): {
        minX: number
        minY: number
        maxX: number
        maxY: number
        width: number
        height: number
    } | null {
        if (objects.length === 0) return null

        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        objects.forEach(obj => {
            const objBounds = this.getObjectBounds(obj)
            minX = Math.min(minX, objBounds.minX)
            minY = Math.min(minY, objBounds.minY)
            maxX = Math.max(maxX, objBounds.maxX)
            maxY = Math.max(maxY, objBounds.maxY)
        })

        return {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY
        }
    }

    /**
     * Get object bounding box
     */
    private getObjectBounds(obj: CanvasObject): {
        minX: number
        minY: number
        maxX: number
        maxY: number
    } {
        const { transform } = obj
        let width = 0
        let height = 0

        switch (obj.type) {
            case 'path':
                const pathData = obj.data as any
                if (pathData.points && pathData.points.length > 0) {
                    const xs = pathData.points.map((p: any) => p.x)
                    const ys = pathData.points.map((p: any) => p.y)
                    width = Math.max(...xs) - Math.min(...xs)
                    height = Math.max(...ys) - Math.min(...ys)
                }
                break
            default:
                width = (obj.data as any).width || 0
                height = (obj.data as any).height || 0
        }

        return {
            minX: transform.x,
            minY: transform.y,
            maxX: transform.x + width * transform.scaleX,
            maxY: transform.y + height * transform.scaleY
        }
    }

    /**
     * Simplified object rendering for thumbnails
     */
    private renderObjectToThumbnail(ctx: CanvasRenderingContext2D, obj: CanvasObject): void {
        const { transform } = obj

        ctx.save()
        ctx.translate(transform.x, transform.y)
        ctx.rotate((transform.rotation * Math.PI) / 180)
        ctx.scale(transform.scaleX, transform.scaleY)

        switch (obj.type) {
            case 'path':
                const pathData = obj.data as any
                if (pathData.points && pathData.points.length > 0) {
                    ctx.strokeStyle = pathData.strokeColor || '#000'
                    ctx.lineWidth = pathData.strokeWidth || 2
                    ctx.lineCap = 'round'
                    ctx.lineJoin = 'round'
                    ctx.globalAlpha = pathData.opacity || 1
                    ctx.beginPath()
                    ctx.moveTo(pathData.points[0].x, pathData.points[0].y)
                    for (let i = 1; i < pathData.points.length; i++) {
                        ctx.lineTo(pathData.points[i].x, pathData.points[i].y)
                    }
                    ctx.stroke()
                }
                break

            case 'shape':
                const shapeData = obj.data as any
                ctx.fillStyle = shapeData.fillColor || '#4F46E5'
                ctx.strokeStyle = shapeData.strokeColor || '#000'
                ctx.lineWidth = shapeData.strokeWidth || 0
                ctx.globalAlpha = shapeData.opacity || 1

                const w = shapeData.width
                const h = shapeData.height

                switch (shapeData.shapeType) {
                    case 'rectangle':
                        ctx.fillRect(0, 0, w, h)
                        if (shapeData.strokeWidth > 0) ctx.strokeRect(0, 0, w, h)
                        break
                    case 'ellipse':
                    case 'circle':
                        ctx.beginPath()
                        ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
                        ctx.fill()
                        if (shapeData.strokeWidth > 0) ctx.stroke()
                        break
                }
                break

            case 'text':
                const textData = obj.data as any
                ctx.fillStyle = textData.color || '#000'
                ctx.font = `${textData.fontSize || 16}px ${textData.fontFamily || 'sans-serif'}`
                ctx.textBaseline = 'top'
                ctx.fillText(textData.content?.substring(0, 20) || '', 0, 0)
                break

            case 'note':
                const noteData = obj.data as any
                ctx.fillStyle = noteData.backgroundColor || '#FFF2CC'
                ctx.fillRect(0, 0, noteData.width, noteData.height)
                ctx.strokeStyle = '#000'
                ctx.strokeRect(0, 0, noteData.width, noteData.height)
                break

            case 'image':
                const imageData = obj.data as any
                ctx.fillStyle = '#e0e0e0'
                ctx.fillRect(0, 0, imageData.width, imageData.height)
                break
        }

        ctx.restore()
    }

    /**
     * Calculate z-index for a layer based on its position in array
     */
    getLayerZIndex(layerId: string, layers: Layer[]): number {
        const index = layers.findIndex(l => l.id === layerId)
        return index >= 0 ? layers.length - index : 0
    }

    /**
     * Reorder layers by moving a layer to a new position
     */
    reorderLayers(layers: Layer[], fromIndex: number, toIndex: number): Layer[] {
        const newLayers = [...layers]
        const [movedLayer] = newLayers.splice(fromIndex, 1)
        newLayers.splice(toIndex, 0, movedLayer)
        return newLayers
    }

    /**
     * Get layer tree structure (for groups)
     */
    getLayerTree(layers: Layer[]): Layer[] {
        // For now, return flat structure
        // TODO: Implement tree structure when groups are fully supported
        return layers
    }

    /**
     * Get all child layers of a group
     */
    getChildLayers(parentId: string, layers: Layer[]): Layer[] {
        return layers.filter(l => l.parentId === parentId)
    }

    /**
     * Flatten selected layers into one
     */
    flattenLayers(layerIds: string[], layers: Layer[], objects: CanvasObject[]): {
        newLayer: Layer
        objectsToRemove: string[]
    } {
        const selectedLayers = layers.filter(l => layerIds.includes(l.id))
        if (selectedLayers.length === 0) {
            throw new Error('No layers to flatten')
        }

        // Collect all objects from selected layers
        const allObjectIds: string[] = []
        selectedLayers.forEach(layer => {
            allObjectIds.push(...layer.objectIds)
        })

        // Create new flattened layer
        const newLayer: Layer = {
            id: `layer-${Date.now()}`,
            name: 'Flattened Layer',
            opacity: 1,
            blendMode: 'normal',
            visible: true,
            locked: false,
            objectIds: allObjectIds,
            colorTag: 'none'
        }

        return {
            newLayer,
            objectsToRemove: layerIds
        }
    }

    /**
     * Get color for color tag
     */
    getColorTagColor(tag: LayerColorTag): string {
        const colors: Record<LayerColorTag, string> = {
            none: 'transparent',
            red: '#EF4444',
            orange: '#F97316',
            yellow: '#EAB308',
            green: '#22C55E',
            blue: '#0A84FF',
            purple: '#8B5CF6',
            pink: '#EC4899'
        }
        return colors[tag] || 'transparent'
    }
}

// Singleton instance
let layerManagerInstance: LayerManager | null = null

export function getLayerManager(): LayerManager {
    if (!layerManagerInstance) {
        layerManagerInstance = new LayerManager()
    }
    return layerManagerInstance
}
