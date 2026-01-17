// components/TextEditorOverlay.tsx - Text editing panel with formatting toolbar

import React, { useState, useRef, useEffect } from 'react'
import { useHaloboardStore } from '@/lib/store'
import { useTheme } from 'next-themes'
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, X } from 'lucide-react'

interface TextEditorOverlayProps {
  position: { x: number; y: number }
  initialContent: string
  initialStyles?: {
    fontFamily?: string
    fontSize?: number
    fontWeight?: 'normal' | 'bold'
    fontStyle?: 'normal' | 'italic'
    textDecoration?: 'none' | 'underline'
    align?: 'left' | 'center' | 'right'
    color?: string
  }
  isAreaText?: boolean
  onCommit: (content: string, properties: any) => void
  onCancel: () => void
  onLiveUpdate: (content: string) => void
}

export function TextEditorOverlay({
  position,
  initialContent,
  initialStyles,
  isAreaText = false,
  onCommit,
  onCancel,
  onLiveUpdate
}: TextEditorOverlayProps) {
  const [content, setContent] = useState(initialContent)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { textProperties } = useHaloboardStore()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Local formatting state - prefer initialStyles from object, fall back to textProperties
  const [fontFamily, setFontFamily] = useState(initialStyles?.fontFamily || textProperties.fontFamily || 'Inter')
  const [fontSize, setFontSize] = useState(initialStyles?.fontSize || textProperties.fontSize || 16)
  const [isBold, setIsBold] = useState(initialStyles?.fontWeight === 'bold')
  const [isItalic, setIsItalic] = useState(initialStyles?.fontStyle === 'italic')
  const [isUnderline, setIsUnderline] = useState(initialStyles?.textDecoration === 'underline')
  const [align, setAlign] = useState<'left' | 'center' | 'right'>(initialStyles?.align || textProperties.alignment as any || 'left')

  const [styles, setStyles] = useState<React.CSSProperties>({
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: 'translate(0, 0) scale(0.8)',
    opacity: 0
  })

  useEffect(() => {
    // Trigger animation to center
    const timer = setTimeout(() => {
      setStyles({
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%) scale(1)',
        opacity: 1
      })
    }, 10)

    if (textareaRef.current) {
      textareaRef.current.focus()
      if (initialContent) textareaRef.current.select()
    }

    return () => clearTimeout(timer)
  }, [initialContent])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    } else if (e.key === 'Enter' && !e.shiftKey && !isAreaText) {
      e.preventDefault()
      handleCommit()
    }
  }

  const handleCommit = () => {
    const properties = {
      fontFamily,
      fontSize,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      textDecoration: isUnderline ? 'underline' : 'none',
      alignment: align,
      color: textProperties.color
    }
    onCommit(content, properties)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    onLiveUpdate(e.target.value)
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onCancel}
      />
      <div
        className="fixed z-50 pointer-events-auto transition-all duration-300 ease-out"
        style={styles}
      >
        <div className={`shadow-2xl rounded-2xl overflow-hidden ${isDark ? 'bg-neutral-800 border border-neutral-700' : 'bg-white border border-neutral-200'
          }`}>
          {/* Header */}
          <div className={`px-4 py-3 border-b ${isDark ? 'border-neutral-700' : 'border-neutral-100'} flex items-center justify-between`}>
            <span className={`text-sm font-semibold ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
              Text Editor
            </span>
            <button
              onClick={onCancel}
              className={`p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors`}
            >
              <X className="w-4 h-4 opacity-50" />
            </button>
          </div>

          {/* Text Area */}
          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Type something..."
              className={`w-full bg-neutral-50 dark:bg-neutral-900 rounded-lg p-3 outline-none resize-none ${isDark ? 'text-white placeholder-neutral-500' : 'text-neutral-900 placeholder-neutral-400'
                }`}
              style={{
                minWidth: '340px',
                minHeight: '120px',
                fontFamily,
                fontSize: `${fontSize}px`,
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                textDecoration: isUnderline ? 'underline' : 'none',
                textAlign: align
              }}
            />
          </div>

          {/* Toolbar */}
          <div className={`px-4 py-3 border-t ${isDark ? 'border-neutral-700 bg-neutral-800/50' : 'border-neutral-100 bg-neutral-50'} flex items-center gap-3 flex-wrap`}>
            {/* Font Family */}
            <select
              className={`text-sm px-2 py-1.5 rounded min-w-[140px] ${isDark ? 'bg-neutral-700 text-white' : 'bg-white text-neutral-900'} border ${isDark ? 'border-neutral-600' : 'border-neutral-300'}`}
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              style={{ fontFamily }}
            >
              <option value="Inter" style={{ fontFamily: 'Inter, sans-serif' }}>Inter</option>
              <option value="Arial" style={{ fontFamily: 'Arial, sans-serif' }}>Arial</option>
              <option value="Georgia" style={{ fontFamily: 'Georgia, serif' }}>Georgia</option>
              <option value="Times New Roman" style={{ fontFamily: '"Times New Roman", serif' }}>Times New Roman</option>
              <option value="Courier New" style={{ fontFamily: '"Courier New", monospace' }}>Courier New</option>
              <option value="Verdana" style={{ fontFamily: 'Verdana, sans-serif' }}>Verdana</option>
              <option value="Trebuchet MS" style={{ fontFamily: '"Trebuchet MS", sans-serif' }}>Trebuchet MS</option>
              <option value="Palatino Linotype" style={{ fontFamily: '"Palatino Linotype", serif' }}>Palatino</option>
              <option value="Lucida Console" style={{ fontFamily: '"Lucida Console", monospace' }}>Lucida Console</option>
              <option value="Impact" style={{ fontFamily: 'Impact, sans-serif' }}>Impact</option>
              <option value="Comic Sans MS" style={{ fontFamily: '"Comic Sans MS", cursive' }}>Comic Sans</option>
            </select>

            {/* Font Size */}
            <input
              type="number"
              min="8"
              max="72"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value) || 16)}
              className={`w-16 text-sm px-2 py-1.5 rounded text-center ${isDark ? 'bg-neutral-700 text-white' : 'bg-white text-neutral-900'} border ${isDark ? 'border-neutral-600' : 'border-neutral-300'}`}
            />

            {/* Divider */}
            <div className={`w-px h-6 ${isDark ? 'bg-neutral-600' : 'bg-neutral-300'}`} />

            {/* Format Buttons */}
            <div className="flex gap-1">
              <button
                className={`p-2 rounded ${isBold ? 'bg-blue-500 text-white' : isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}
                onClick={() => setIsBold(!isBold)}
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                className={`p-2 rounded ${isItalic ? 'bg-blue-500 text-white' : isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}
                onClick={() => setIsItalic(!isItalic)}
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                className={`p-2 rounded ${isUnderline ? 'bg-blue-500 text-white' : isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}
                onClick={() => setIsUnderline(!isUnderline)}
              >
                <Underline className="w-4 h-4" />
              </button>
            </div>

            {/* Divider */}
            <div className={`w-px h-6 ${isDark ? 'bg-neutral-600' : 'bg-neutral-300'}`} />

            {/* Alignment */}
            <div className="flex gap-1">
              <button
                className={`p-2 rounded ${align === 'left' ? 'bg-blue-500 text-white' : isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}
                onClick={() => setAlign('left')}
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                className={`p-2 rounded ${align === 'center' ? 'bg-blue-500 text-white' : isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}
                onClick={() => setAlign('center')}
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                className={`p-2 rounded ${align === 'right' ? 'bg-blue-500 text-white' : isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}
                onClick={() => setAlign('right')}
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Done Button */}
            <button
              onClick={handleCommit}
              className="px-4 py-1.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors text-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
