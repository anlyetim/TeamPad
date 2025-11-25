"use client"

import { useEffect, useState } from "react"
import { useHaloboardStore } from "@/lib/store"
import type { ChatMessage } from "@/lib/types"

interface FloatingMessage extends ChatMessage {
  x: number
  y: number
  visible: boolean
}

export function FloatingChatMessages() {
  const [floatingMessages, setFloatingMessages] = useState<FloatingMessage[]>([])
  const { chatMessages, users, zoom, panX, panY } = useHaloboardStore()

  // Show new messages as floating bubbles above user cursors
  useEffect(() => {
    const latestMessage = chatMessages[chatMessages.length - 1]
    if (!latestMessage) return

    // Find user and their cursor position
    const user = users.find((u) => u.id === latestMessage.userId)
    if (!user || !user.cursor) return

    // Check if this message is already floating
    const alreadyFloating = floatingMessages.some((fm) => fm.id === latestMessage.id)
    if (alreadyFloating) return

    // Add floating message
    const newFloatingMessage: FloatingMessage = {
      ...latestMessage,
      x: user.cursor.x,
      y: user.cursor.y - 60, // Position above cursor
      visible: true,
    }

    setFloatingMessages((prev) => [...prev, newFloatingMessage])

    // Remove after 3 seconds
    setTimeout(() => {
      setFloatingMessages((prev) => prev.map((fm) => (fm.id === latestMessage.id ? { ...fm, visible: false } : fm)))

      // Clean up after fade animation
      setTimeout(() => {
        setFloatingMessages((prev) => prev.filter((fm) => fm.id !== latestMessage.id))
      }, 300)
    }, 3000)
  }, [chatMessages])

  return (
    <>
      {floatingMessages.map((msg) => {
        const user = users.find((u) => u.id === msg.userId)

        return (
          <div
            key={msg.id}
            className={`pointer-events-none absolute z-40 max-w-xs transition-opacity duration-300 ${
              msg.visible ? "opacity-100" : "opacity-0"
            }`}
            style={{
              left: `${msg.x * zoom + panX}px`,
              top: `${msg.y * zoom + panY}px`,
            }}
          >
            <div className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white shadow-lg dark:bg-neutral-700">
              <div className="mb-1 text-xs font-medium" style={{ color: user?.color }}>
                {user?.name}
              </div>
              <div>{msg.content}</div>
            </div>
            {/* Speech bubble tail */}
            <div
              className="absolute left-4 top-full h-0 w-0"
              style={{
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "6px solid rgb(38, 38, 38)",
              }}
            />
          </div>
        )
      })}
    </>
  )
}
