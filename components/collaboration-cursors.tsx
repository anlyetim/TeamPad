"use client"

import { useHaloboardStore } from "@/lib/store"
import { MousePointer2 } from "lucide-react"

export function CollaborationCursors() {
  const { users, currentUserId, zoom, panX, panY } = useHaloboardStore()

  // Filter out current user and users without cursor position
  // Also filter out users inactive for > 5 minutes (cleanup visually)
  const now = Date.now()
  const otherUsers = users.filter((user) => 
    user.id !== currentUserId && 
    user.cursor &&
    (now - (user.lastActive || 0) < 300000) // 5 min timeout
  )

  return (
    <>
      {otherUsers.map((user) => (
        <div
          key={user.id}
          className="pointer-events-none absolute z-50 transition-transform duration-100 ease-linear"
          style={{
            left: `${user.cursor!.x * zoom + panX}px`,
            top: `${user.cursor!.y * zoom + panY}px`,
            transform: "translate(-2px, -2px)",
          }}
        >
          {/* Cursor Icon */}
          <MousePointer2 className="size-5 drop-shadow-md" style={{ color: user.color, fill: user.color }} />

          {/* User Name Label */}
          <div
            className="mt-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium text-white shadow-sm"
            style={{ backgroundColor: user.color }}
          >
            {user.name}
          </div>
        </div>
      ))}
    </>
  )
}