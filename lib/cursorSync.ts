// lib/cursorSync.ts - Throttled cursor broadcasting with interpolation for smooth real-time sync.

import { getCollaborationManager } from './collaboration'
import type { Point } from './types'

let lastBroadcast = 0
const THROTTLE_MS = 20 // ~50fps max

export function broadcastCursorThrottled(position: Point) {
  const now = Date.now()
  if (now - lastBroadcast >= THROTTLE_MS) {
    lastBroadcast = now
    const manager = getCollaborationManager()
    if (manager) {
      manager.broadcastCursor(position)
    }
  }
}

// Optional: Add interpolation for smoother cursor movement on clients
export function interpolateCursor(from: Point, to: Point, progress: number): Point {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress
  }
}
