// components/TextEditorOverlay.tsx - Modal text editing overlay for Photoshop-like text tool.

import React, { useState, useRef, useEffect } from 'react'
import { useHaloboardStore } from '@/lib/store'

interface TextEditorOverlayProps {
  position: { x: number; y: number }
  initialContent: string
  isAreaText?: boolean
  onCommit: (content: string, properties: any) => void
  onCancel: () => void
  onLiveUpdate: (content: string) => void
}

export function TextEditorOverlay({ position, initialContent, isAreaText = false, onCommit, onCancel, onLiveUpdate }: TextEditorOverlayProps) {
  const [content, setContent] = useState(initialContent)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { textProperties, setTextProperties } = useHaloboardStore()

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    } else if (e.key === 'Enter' && !e.shiftKey && !isAreaText) {
      e.preventDefault()
      onCommit(content, textProperties)
    }
  }

  const handleBlur = () => {
    // Only commit on blur for area text
    if (isAreaText) {
      onCommit(content, textProperties)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    onLiveUpdate(e.target.value)
  }

  const handleOutsideClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCommit(content, textProperties)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleOutsideClick}
    >
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{
            fontFamily: textProperties.fontFamily,
            fontSize: `${textProperties.fontSize}px`,
            fontWeight: textProperties.fontWeight,
            color: textProperties.color,
            textAlign: textProperties.alignment,
            width: '100%',
            minHeight: isAreaText ? '120px' : '40px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            resize: 'none',
          }}
          placeholder={isAreaText ? "Type your text here..." : "Click and type..."}
          autoFocus
        />
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onCommit(content, textProperties)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
