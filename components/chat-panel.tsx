"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useHaloboardStore } from "@/lib/store"
import { MessageSquare, Send, X, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ChatPanel() {
  const [message, setMessage] = useState("")
  const [isMinimized, setIsMinimized] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  const { chatMessages, addChatMessage, users, currentUserId, showChat, toggleChat } = useHaloboardStore()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [chatMessages])

  const handleSendMessage = () => {
    if (!message.trim()) return

    addChatMessage({
      id: `msg-${Date.now()}`,
      userId: currentUserId,
      content: message,
      timestamp: Date.now(),
    })

    setMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getUserById = (userId: string) => {
    return users.find((u) => u.id === userId)
  }

  if (!showChat) {
    // Floating chat button when closed
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-20 right-4 z-30 flex size-12 items-center justify-center rounded-full bg-[#0A84FF] text-white shadow-lg transition-transform hover:scale-110"
      >
        <MessageSquare className="size-5" />
      </button>
    )
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-30 flex w-80 flex-col rounded-xl border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl transition-all dark:border-white/10 dark:bg-neutral-900/90 ${
        isMinimized ? "h-14" : "h-96"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 p-3 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-[#0A84FF]" />
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-200">Chat</h3>
          <span className="rounded-full bg-[#0A84FF]/10 px-2 py-0.5 text-xs font-medium text-[#0A84FF]">
            {users.length} online
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Minimize2 className="size-4 text-neutral-600 dark:text-neutral-400" />
          </button>
          <button onClick={toggleChat} className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5">
            <X className="size-4 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div ref={chatRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {chatMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const user = getUserById(msg.userId)
                const isCurrentUser = msg.userId === currentUserId

                return (
                  <div key={msg.id} className={`flex gap-2 ${isCurrentUser ? "flex-row-reverse" : ""}`}>
                    {/* Avatar */}
                    <div
                      className="size-8 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: user?.color || "#999999" }}
                    />

                    {/* Message Content */}
                    <div className={`flex flex-col gap-1 ${isCurrentUser ? "items-end" : ""}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          {isCurrentUser ? "You" : user?.name || "Unknown"}
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div
                        className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                          isCurrentUser
                            ? "bg-[#0A84FF] text-white"
                            : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Input */}
          <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0A84FF] focus:ring-2 focus:ring-[#0A84FF]/20 dark:border-neutral-700 dark:bg-neutral-800"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className="bg-[#0A84FF] hover:bg-[#0A84FF]/90"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
