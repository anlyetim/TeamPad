// components/editor/EditorModal.tsx - Central modal for text/note editing
// Features fly-to-center and zoom animations matching the reference designs

"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useHaloboardStore } from '@/lib/store'
import { useTheme } from 'next-themes'
import { X, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from 'lucide-react'

interface EditorModalProps {
    type: 'text' | 'note'
    objectId: string
    initialPosition: { x: number; y: number }
    onClose: () => void
}

// Pastel colors for note style picker
const NOTE_COLORS = [
    '#FFF2CC', '#FFE6CC', '#FCE4EC', '#E8F5E9',
    '#E3F2FD', '#F3E5F5', '#ECEFF1', '#FFF8E1',
    '#FFCCBC', '#C8E6C9', '#B3E5FC', '#E1BEE7'
]

export function EditorModal({ type, objectId, initialPosition, onClose }: EditorModalProps) {
    const { theme } = useTheme()
    const store = useHaloboardStore()
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Get the object being edited
    const object = store.objects.find(o => o.id === objectId)
    const data = object?.data as any

    const [content, setContent] = useState(data?.content || '')
    const [isAnimatingIn, setIsAnimatingIn] = useState(true)
    const [isAnimatingOut, setIsAnimatingOut] = useState(false)

    // Animation states
    const [modalStyle, setModalStyle] = useState<React.CSSProperties>({
        position: 'fixed',
        left: initialPosition.x,
        top: initialPosition.y,
        transform: 'translate(0, 0) scale(0.3)',
        opacity: 0,
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
    })

    // Animate in on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setModalStyle({
                position: 'fixed',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%) scale(1)',
                opacity: 1,
                transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
            })
            setIsAnimatingIn(false)
        }, 10)

        return () => clearTimeout(timer)
    }, [])

    // Focus textarea
    useEffect(() => {
        if (!isAnimatingIn && textareaRef.current) {
            textareaRef.current.focus()
            textareaRef.current.select()
        }
    }, [isAnimatingIn])

    const handleCommit = useCallback(() => {
        // Update the object
        store.updateObject(objectId, {
            data: { ...data, content }
        })

        // Animate out
        setIsAnimatingOut(true)
        setModalStyle({
            position: 'fixed',
            left: initialPosition.x,
            top: initialPosition.y,
            transform: 'translate(0, 0) scale(0.3)',
            opacity: 0,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        })

        setTimeout(() => {
            onClose()
        }, 300)
    }, [objectId, content, data, store, initialPosition, onClose])

    const handleCancel = useCallback(() => {
        // Animate out without saving
        setIsAnimatingOut(true)
        setModalStyle({
            position: 'fixed',
            left: initialPosition.x,
            top: initialPosition.y,
            transform: 'translate(0, 0) scale(0.3)',
            opacity: 0,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        })

        setTimeout(() => {
            onClose()
        }, 300)
    }, [initialPosition, onClose])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault()
            handleCancel()
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleCommit()
        }
    }

    // Note color change
    const handleColorChange = (color: string) => {
        store.updateObject(objectId, {
            data: { ...data, backgroundColor: color }
        })
    }

    // Text formatting
    const handleFormatChange = (format: 'bold' | 'italic' | 'underline') => {
        // For now, just update font weight for bold
        if (format === 'bold') {
            const newWeight = data?.fontWeight === 'bold' ? 'normal' : 'bold'
            store.updateObject(objectId, {
                data: { ...data, fontWeight: newWeight }
            })
        }
    }

    // Alignment change
    const handleAlignChange = (align: 'left' | 'center' | 'right') => {
        store.updateObject(objectId, {
            data: { ...data, align }
        })
    }

    if (!object) return null

    const isDark = theme === 'dark'
    const isNote = type === 'note'

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
                style={{ opacity: isAnimatingOut ? 0 : 1 }}
                onClick={handleCancel}
            />

            {/* Modal */}
            <div
                className="z-50 pointer-events-auto"
                style={modalStyle}
            >
                {isNote ? (
                    // Note Editor
                    <div
                        className="shadow-2xl"
                        style={{
                            backgroundColor: data?.backgroundColor || '#FFF2CC',
                            borderRadius: '16px',
                            padding: '24px',
                            minWidth: '320px',
                            minHeight: '280px',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Write your note..."
                            style={{
                                flex: 1,
                                border: 'none',
                                background: 'transparent',
                                resize: 'none',
                                fontFamily: data?.fontFamily || 'Inter',
                                fontSize: `${Math.max(18, (data?.fontSize || 14) * 1.2)}px`,
                                outline: 'none',
                                color: '#333',
                                lineHeight: 1.6
                            }}
                        />
                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex gap-1">
                                {NOTE_COLORS.slice(0, 8).map(color => (
                                    <button
                                        key={color}
                                        className="w-6 h-6 rounded-full border-2 border-white/50 hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color }}
                                        onClick={() => handleColorChange(color)}
                                    />
                                ))}
                            </div>
                            <span className="text-[10px] opacity-40 uppercase tracking-widest font-semibold">
                                Sticky Note
                            </span>
                        </div>
                    </div>
                ) : (
                    // Text Editor
                    <div
                        className={`shadow-2xl rounded-2xl overflow-hidden ${isDark ? 'bg-neutral-800 border border-neutral-700' : 'bg-white border border-neutral-200'
                            }`}
                        style={{
                            minWidth: '380px',
                            minHeight: '220px'
                        }}
                    >
                        {/* Header */}
                        <div className={`px-4 py-3 border-b ${isDark ? 'border-neutral-700' : 'border-neutral-100'} flex items-center justify-between`}>
                            <span className={`text-sm font-semibold ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
                                Text Editor
                            </span>
                            <button
                                onClick={handleCancel}
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
                                onChange={(e) => setContent(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type something..."
                                className={`w-full bg-transparent outline-none resize-none ${isDark ? 'text-white placeholder-neutral-500' : 'text-neutral-900 placeholder-neutral-400'
                                    }`}
                                style={{
                                    minHeight: '120px',
                                    fontFamily: data?.fontFamily || 'Inter',
                                    fontSize: `${data?.fontSize || 16}px`,
                                    textAlign: data?.align || 'left'
                                }}
                            />
                        </div>

                        {/* Toolbar */}
                        <div className={`px-4 py-3 border-t ${isDark ? 'border-neutral-700 bg-neutral-800/50' : 'border-neutral-100 bg-neutral-50'} flex items-center gap-4`}>
                            {/* Font Family */}
                            <select
                                className={`text-sm px-2 py-1 rounded ${isDark ? 'bg-neutral-700 text-white' : 'bg-white text-neutral-900'} border ${isDark ? 'border-neutral-600' : 'border-neutral-300'}`}
                                value={data?.fontFamily || 'Inter'}
                                onChange={(e) => store.updateObject(objectId, { data: { ...data, fontFamily: e.target.value } })}
                            >
                                <option value="Inter">Inter</option>
                                <option value="Arial">Arial</option>
                                <option value="Georgia">Georgia</option>
                                <option value="Courier New">Courier New</option>
                            </select>

                            {/* Font Size */}
                            <input
                                type="number"
                                min="8"
                                max="72"
                                value={data?.fontSize || 16}
                                onChange={(e) => store.updateObject(objectId, { data: { ...data, fontSize: parseInt(e.target.value) || 16 } })}
                                className={`w-14 text-sm px-2 py-1 rounded ${isDark ? 'bg-neutral-700 text-white' : 'bg-white text-neutral-900'} border ${isDark ? 'border-neutral-600' : 'border-neutral-300'}`}
                            />

                            {/* Divider */}
                            <div className={`w-px h-5 ${isDark ? 'bg-neutral-600' : 'bg-neutral-300'}`} />

                            {/* Format Buttons */}
                            <div className="flex gap-1">
                                <button
                                    className={`p-1.5 rounded ${data?.fontWeight === 'bold' ? 'bg-blue-500 text-white' : isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}
                                    onClick={() => handleFormatChange('bold')}
                                >
                                    <Bold className="w-4 h-4" />
                                </button>
                                <button
                                    className={`p-1.5 rounded ${isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}
                                    onClick={() => handleFormatChange('italic')}
                                >
                                    <Italic className="w-4 h-4" />
                                </button>
                                <button
                                    className={`p-1.5 rounded ${isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}
                                    onClick={() => handleFormatChange('underline')}
                                >
                                    <Underline className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Divider */}
                            <div className={`w-px h-5 ${isDark ? 'bg-neutral-600' : 'bg-neutral-300'}`} />

                            {/* Alignment */}
                            <div className="flex gap-1">
                                <button
                                    className={`p-1.5 rounded ${data?.align === 'left' ? 'bg-blue-500 text-white' : isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}
                                    onClick={() => handleAlignChange('left')}
                                >
                                    <AlignLeft className="w-4 h-4" />
                                </button>
                                <button
                                    className={`p-1.5 rounded ${data?.align === 'center' ? 'bg-blue-500 text-white' : isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}
                                    onClick={() => handleAlignChange('center')}
                                >
                                    <AlignCenter className="w-4 h-4" />
                                </button>
                                <button
                                    className={`p-1.5 rounded ${data?.align === 'right' ? 'bg-blue-500 text-white' : isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-200'}`}
                                    onClick={() => handleAlignChange('right')}
                                >
                                    <AlignRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

export default EditorModal
