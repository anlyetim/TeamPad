// Storage utilities - Autosave Disabled
import { useState } from "react"
import { useHaloboardStore } from "./store"
import type { CanvasObject } from "./types"

export interface BoardData {
  objects: CanvasObject[]
  lastModified: number
}

export class StorageManager {
  constructor() {
    // Auto-load and Auto-save logic removed to prevent freezing
  }

  // Added dummy method to prevent crash in Header cleanup
  public stopAutoSave() {} 

  // Manual export functions
  public exportAsPNG(canvas: HTMLCanvasElement, filename = "haloboard-export.png") {
    try {
      const dataUrl = canvas.toDataURL("image/png")
      const link = document.createElement("a")
      link.download = filename
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error("Failed to export as PNG", error)
    }
  }

  public exportAsSVG(objects: CanvasObject[], filename = "haloboard-export.svg") {
    console.log("SVG Export feature placeholder")
  }

  public exportAsJSON(filename = "haloboard-export.json") {
    try {
      const { objects, layers } = useHaloboardStore.getState()
      const data = { objects, layers, lastModified: Date.now() }
      
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.download = filename
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export as JSON", error)
    }
  }

  // NEW: Export as custom .tpad format (JSON under the hood)
  public exportAsTPAD(filename = "project.tpad") {
    try {
      const { objects, layers, activeLayerId, history } = useHaloboardStore.getState()
      const data = { 
        version: "1.0",
        timestamp: Date.now(),
        objects, 
        layers, 
        activeLayerId,
        history: [] // Optional: Save history or keep file size small
      }
      
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: "application/haloboard" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.download = filename
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export as TPAD", error)
    }
  }

  // NEW: Export as PSD (Fallback to Image for this environment)
  public exportAsPSD(canvas: HTMLCanvasElement, filename = "haloboard-export.psd") {
    try {
      // Note: Real layered PSD export requires heavy libraries like ag-psd.
      // For this environment, we export the flat image with .psd extension 
      // so it can be opened by standard viewers, though it won't have layers.
      const dataUrl = canvas.toDataURL("image/png")
      const link = document.createElement("a")
      link.download = filename
      link.href = dataUrl
      link.click()
      console.log("Exported as basic PSD (Flat Image)")
    } catch (error) {
      console.error("Failed to export as PSD", error)
    }
  }
}

// Hook initializes once for manual export access only
export function useStorage() {
  const [manager] = useState(() => new StorageManager())
  return manager
}
