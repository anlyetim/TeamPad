// components/NoteEditorOverlay.tsx - Inline note editing overlay for sticky note creation with color picker

import React, { useState, useRef, useEffect } from 'react'
import { useHaloboardStore } from '@/lib/store'

// Pastel colors for note background
const NOTE_COLORS = [
  '#FFF2CC', '#FFE6CC', '#FCE4EC', '#E8F5E9',
  '#E3F2FD', '#F3E5F5', '#ECEFF1', '#FFF8E1',
  '#FFCCBC', '#C8E6C9', '#B3E5FC', '#E1BEE7'
]

interface NoteEditorOverlayProps {
  position: { x: number; y: number }
  initialContent: string
  objectId?: string // ID of the note being edited
  initialBackgroundColor?: string
  onCommit: (content: string, backgroundColor?: string) => void
  onCancel: () => void
}

export function NoteEditorOverlay({
  position,
  initialContent,
  objectId,
  initialBackgroundColor,
  onCommit,
  onCancel
}: NoteEditorOverlayProps) {
  const [content, setContent] = useState(initialContent)
  const [backgroundColor, setBackgroundColor] = useState(initialBackgroundColor || '#FFF2CC')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { noteProperties, updateObject } = useHaloboardStore()
  const [styles, setStyles] = useState<React.CSSProperties>({
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: 'translate(0, 0) scale(0.2)',
    opacity: 0
  })

  useEffect(() => {
    // Trigger animation to center (Zoom effect)
    const timer = setTimeout(() => {
      setStyles({
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%) scale(1)', // Zoom to 100%
        opacity: 1
      })
    }, 10)

    if (textareaRef.current) {
      textareaRef.current.focus()
    }

    return () => clearTimeout(timer)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onCommit(content, backgroundColor)
    }
  }

  const handleColorChange = (color: string) => {
    setBackgroundColor(color)
    // Live update the object if editing existing note
    if (objectId && objectId !== 'new') {
      const store = useHaloboardStore.getState()
      const obj = store.objects.find(o => o.id === objectId)
      if (obj) {
        updateObject(objectId, {
          data: { ...obj.data, backgroundColor: color }
        })
      }
    }
  }

  const handleCommit = () => {
    onCommit(content, backgroundColor)
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onCancel}
      />
      <div
        className="fixed z-50 pointer-events-auto transition-all duration-500"
        style={{
          ...styles,
          transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        <div
          className="shadow-2xl"
          style={{
            backgroundColor: backgroundColor,
            borderRadius: `${noteProperties?.cornerRadius || 12}px`,
            padding: '24px',
            minWidth: '320px',
            minHeight: '280px',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              resize: 'none',
              fontFamily: noteProperties?.fontFamily || 'Inter',
              fontSize: `${Math.max(18, (noteProperties?.fontSize || 14) * 1.2)}px`,
              outline: 'none',
              color: '#333',
              lineHeight: 1.6
            }}
            placeholder="Write your note..."
          />

          {/* Color Picker */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-1.5 flex-wrap" style={{ maxWidth: '200px' }}>
              {NOTE_COLORS.map(color => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${backgroundColor === color ? 'border-gray-600 ring-2 ring-gray-400' : 'border-white/60'
                    }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                  type="button"
                />
              ))}
            </div>
            <span className="text-[10px] opacity-40 uppercase tracking-widest font-semibold">
              Sticky Note
            </span>
          </div>

          {/* Save Button */}
          <button
            onClick={handleCommit}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors self-end"
          >
            Done
          </button>
        </div>
      </div>
    </>
  )
}
