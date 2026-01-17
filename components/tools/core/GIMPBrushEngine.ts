// components/tools/core/GIMPBrushEngine.ts
// Core GIMP-style brush rendering engine

import type { Point } from '@/lib/types'

export interface BrushStampSettings {
    size: number
    hardness: number // 0-1 (0 = soft, 1 = hard)
    opacity: number // 0-1
    spacing: number // 0.01-2.0 (fraction of brush size)
    angle: number // 0-360 degrees
    aspectRatio: number // 0.1-1.0 (1 = circle, <1 = ellipse)
    color: string
}

export interface BrushDynamics {
    pressureOpacity?: boolean
    pressureSize?: boolean
    jitter?: number // 0-1
    fade?: number // 0-1000 (distance to fade)
}

/**
 * GIMP-style Brush Engine
 * Implements brush stamp rendering with hardness, anti-aliasing, and dynamics
 */
export class GIMPBrushEngine {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private stampCache: Map<string, ImageData> = new Map()

    constructor() {
        // Create off-screen canvas for brush stamp rendering
        this.canvas = document.createElement('canvas')
        const ctx = this.canvas.getContext('2d')
        if (!ctx) throw new Error('Failed to create brush canvas context')
        this.ctx = ctx
    }

    /**
     * Generate a brush stamp with the given settings
     * Uses canvas caching to avoid regenerating identical stamps
     */
    private generateStamp(settings: BrushStampSettings): ImageData {
        const cacheKey = this.getStampCacheKey(settings)

        // Check cache
        const cached = this.stampCache.get(cacheKey)
        if (cached) return cached

        const size = Math.ceil(settings.size)
        const radius = size / 2

        // Resize canvas if needed
        if (this.canvas.width !== size || this.canvas.height !== size) {
            this.canvas.width = size
            this.canvas.height = size
        }

        this.ctx.clearRect(0, 0, size, size)

        // Parse color
        const { r, g, b } = this.parseColor(settings.color)

        // Create radial gradient for soft brush
        const imageData = this.ctx.createImageData(size, size)
        const data = imageData.data

        const centerX = radius
        const centerY = radius

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - centerX
                const dy = y - centerY

                // Account for aspect ratio and angle
                const angleRad = (settings.angle * Math.PI) / 180
                const rotX = dx * Math.cos(angleRad) + dy * Math.sin(angleRad)
                const rotY = -dx * Math.sin(angleRad) + dy * Math.cos(angleRad)

                const dist = Math.sqrt(
                    (rotX / settings.aspectRatio) ** 2 + rotY ** 2
                ) / radius

                // Calculate alpha based on hardness
                let alpha = 0
                if (dist <= 1) {
                    if (settings.hardness >= 0.99) {
                        // Hard brush: sharp edge with anti-aliasing
                        alpha = Math.max(0, Math.min(1, 1 - (dist - 0.95) / 0.05))
                    } else {
                        // Soft brush: smooth falloff
                        const falloff = 1 - settings.hardness
                        if (dist < 1 - falloff) {
                            alpha = 1
                        } else {
                            // Smooth transition using cubic ease
                            const t = (dist - (1 - falloff)) / falloff
                            alpha = 1 - (3 * t ** 2 - 2 * t ** 3)
                        }
                    }

                    alpha *= settings.opacity
                }

                const idx = (y * size + x) * 4
                data[idx] = r
                data[idx + 1] = g
                data[idx + 2] = b
                data[idx + 3] = Math.round(alpha * 255)
            }
        }

        // Cache the stamp
        this.stampCache.set(cacheKey, imageData)

        // Limit cache size
        if (this.stampCache.size > 50) {
            const firstKey = this.stampCache.keys().next().value as string | undefined
            if (firstKey) this.stampCache.delete(firstKey)
        }

        return imageData
    }

    /**
     * Render brush strokes on a target canvas
     */
    renderStroke(
        targetCtx: CanvasRenderingContext2D,
        points: Point[],
        settings: BrushStampSettings,
        dynamics?: BrushDynamics
    ): void {
        if (points.length === 0) return

        const stamp = this.generateStamp(settings)
        const spacing = Math.max(0.1, settings.spacing * settings.size)

        // Render stamps along the stroke with spacing
        let distanceAccum = 0
        let lastPoint = points[0]

        for (let i = 0; i < points.length; i++) {
            const point = points[i]

            if (i === 0) {
                // Always render first point
                this.renderStampAt(targetCtx, stamp, point, settings)
                continue
            }

            const dx = point.x - lastPoint.x
            const dy = point.y - lastPoint.y
            const segmentDist = Math.sqrt(dx * dx + dy * dy)

            distanceAccum += segmentDist

            // Render stamps based on spacing
            while (distanceAccum >= spacing) {
                const ratio = (distanceAccum - spacing) / segmentDist
                const interpolatedPos = {
                    x: point.x - dx * ratio,
                    y: point.y - dy * ratio
                }

                // Apply dynamics
                let stampSettings = { ...settings }
                if (dynamics) {
                    stampSettings = this.applyDynamics(stampSettings, i, points.length, dynamics)
                }

                const dynamicStamp = dynamics ? this.generateStamp(stampSettings) : stamp
                this.renderStampAt(targetCtx, dynamicStamp, interpolatedPos, stampSettings)

                distanceAccum -= spacing
            }

            lastPoint = point
        }

        // Render final point
        const endSettings = dynamics
            ? this.applyDynamics(settings, points.length - 1, points.length, dynamics)
            : settings
        const endStamp = dynamics ? this.generateStamp(endSettings) : stamp
        this.renderStampAt(targetCtx, endStamp, points[points.length - 1], endSettings)
    }

    /**
     * Render a single brush stamp at a position
     */
    private renderStampAt(
        targetCtx: CanvasRenderingContext2D,
        stamp: ImageData,
        position: Point,
        settings: BrushStampSettings
    ): void {
        const halfSize = settings.size / 2

        // Put image data on our offscreen canvas
        this.ctx.putImageData(stamp, 0, 0)

        // Draw to target canvas
        targetCtx.drawImage(
            this.canvas,
            position.x - halfSize,
            position.y - halfSize,
            settings.size,
            settings.size
        )
    }

    /**
     * Apply brush dynamics to settings
     */
    private applyDynamics(
        settings: BrushStampSettings,
        index: number,
        total: number,
        dynamics: BrushDynamics
    ): BrushStampSettings {
        const result = { ...settings }
        const progress = index / Math.max(1, total - 1)

        // Fade
        if (dynamics.fade && dynamics.fade > 0) {
            const fadeAmount = Math.min(1, index / dynamics.fade)
            result.opacity *= (1 - fadeAmount)
        }

        // Jitter
        if (dynamics.jitter && dynamics.jitter > 0) {
            const jitterAmount = dynamics.jitter * settings.size * 0.5
            // Apply random jitter (in real implementation, use a seeded random for consistency)
            result.angle += (Math.random() - 0.5) * 90 * dynamics.jitter
        }

        return result
    }

    /**
     * Generate cache key for brush stamp
     */
    private getStampCacheKey(settings: BrushStampSettings): string {
        return `${settings.size.toFixed(1)}-${settings.hardness.toFixed(2)}-${settings.opacity.toFixed(2)}-${settings.angle.toFixed(0)}-${settings.aspectRatio.toFixed(2)}-${settings.color}`
    }

    /**
     * Parse CSS color to RGB
     */
    private parseColor(color: string): { r: number; g: number; b: number } {
        // Simple hex parser (extend for rgb(), rgba(), etc.)
        if (color.startsWith('#')) {
            const hex = color.substring(1)
            if (hex.length === 6) {
                return {
                    r: parseInt(hex.substring(0, 2), 16),
                    g: parseInt(hex.substring(2, 4), 16),
                    b: parseInt(hex.substring(4, 6), 16)
                }
            }
        }

        // Default to black
        return { r: 0, g: 0, b: 0 }
    }

    /**
     * Clear the stamp cache
     */
    clearCache(): void {
        this.stampCache.clear()
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.stampCache.clear()
        this.canvas.width = 1
        this.canvas.height = 1
    }
}

// Singleton instance
let brushEngineInstance: GIMPBrushEngine | null = null

export function getBrushEngine(): GIMPBrushEngine {
    if (!brushEngineInstance) {
        brushEngineInstance = new GIMPBrushEngine()
    }
    return brushEngineInstance
}

export function disposeBrushEngine(): void {
    if (brushEngineInstance) {
        brushEngineInstance.dispose()
        brushEngineInstance = null
    }
}
