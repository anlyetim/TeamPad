"use client"

import { useEffect, useState } from "react"
import { useHaloboardStore } from "@/lib/store"
import { MousePointer2, Crown, Brush, Eraser, Type, Shapes, StickyNote, Image, MessageCircle } from "lucide-react"
import { getCollaborationManager } from "@/lib/collaboration"
import type { Point, ToolType } from "@/lib/types"

function getCursorIcon(tool?: ToolType) {
  switch (tool) {
    case 'brush':
      return Brush
    case 'eraser':
      return Eraser
    case 'text':
      return Type
    case 'shape':
      return Shapes
    case 'note':
      return StickyNote
    case 'image':
      return Image
    case 'comment':
      return MessageCircle
    default:
      return MousePointer2
  }
}

export function CollaborationCursors() {
  const { users, currentUserId, zoom, panX, panY, cursorChatBubbles } = useHaloboardStore()
  const [, setTick] = useState(0)

  // Smooth cursor rendering using requestAnimationFrame for 60fps updates
  useEffect(() => {
    let animationFrameId: number

    const render = () => {
      // Force re-render for smooth cursor interpolation
      setTick(t => t + 1)
      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [])

  // Show all users with cursors (including current user if they're admin)
  // Filter out users inactive for > 5 minutes (cleanup visually)
  const now = Date.now()
  const visibleUsers = users.filter((user) =>
    user.cursor &&
    (now - (user.lastActive || 0) < 300000) && // 5 min timeout
    (user.id !== currentUserId || user.isAdmin) // Show current user only if admin
  )

  return (
    <>
      {visibleUsers.map((user) => {
        const bubble = cursorChatBubbles[user.id]
        const showBubble = bubble && now < bubble.expiresAt

        return (
          <div key={user.id} className="pointer-events-none absolute z-50">
            {/* Existing cursor rendering */}
            <div
              className="transition-transform duration-100 ease-linear"
              style={{
                left: `${user.cursor!.x * zoom + panX}px`,
                top: `${user.cursor!.y * zoom + panY}px`,
                transform: "translate(-2px, -2px)",
              }}
            >
              {/* Cursor Icon */}
              <div className="relative">
                {(() => {
                  const IconComponent = getCursorIcon(user.tool)
                  const isAdmin = user.isAdmin
                  const cursorColor = isAdmin ? "#FFD700" : user.color
                  return (
                    <>
                      <IconComponent className="size-5 drop-shadow-md" style={{ color: cursorColor, fill: cursorColor }} />
                      {isAdmin && (
                        <Crown
                          className="absolute -top-1 -right-1 size-3 drop-shadow-md"
                          style={{ color: "#FFD700", fill: "#FFD700" }}
                        />
                      )}
                    </>
                  )
                })()}
              </div>

              {/* User Name Label */}
              <div
                className="mt-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium text-white shadow-sm"
                style={{ backgroundColor: user.color }}
              >
                {user.name}
              </div>

              {/* Chat Bubble */}
              {showBubble && (
                <div
                  className="absolute bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-lg text-sm max-w-xs animate-fade-in"
                  style={{
                    left: `${user.cursor!.x * zoom + panX + 20}px`,
                    top: `${user.cursor!.y * zoom + panY - 30}px`,
                  }}
                >
                  {bubble.content}
                  <div className="absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"
                       style={{ left: '10px', bottom: '-4px' }} />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}