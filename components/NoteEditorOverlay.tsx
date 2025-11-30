// components/NoteEditorOverlay.tsx - Inline note editing overlay for sticky note creation.

import React, { useState, useRef, useEffect } from 'react'
import { useHaloboardStore } from '@/lib/store'

interface NoteEditorOverlayProps {
  position: { x: number; y: number }
  initialContent: string
  onCommit: (content: string) => void
  onCancel: () => void
}

export function NoteEditorOverlay({ position, initialContent, onCommit, onCancel }: NoteEditorOverlayProps) {
  const [content, setContent] = useState(initialContent)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { noteProperties } = useHaloboardStore()

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onCommit(content)
    }
  }

  const handleBlur = () => {
    onCommit(content)
  }

  return (
    <div
      className="absolute z-50 pointer-events-auto"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-2px, -2px)',
      }}
    >
      <div
        style={{
          backgroundColor: noteProperties.backgroundColor,
          borderRadius: `${noteProperties.cornerRadius}px`,
          padding: '12px',
          minWidth: '200px',
          minHeight: '100px',
          border: '1px solid #ccc',
        }}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'transparent',
            resize: 'none',
            fontFamily: noteProperties.fontFamily,
            fontSize: `${noteProperties.fontSize}px`,
          }}
          placeholder="Type your note..."
        />
      </div>
    </div>
  )
}
