// components/NotePropertiesPanel.tsx - Properties panel for sticky note objects.

import React from 'react'
import { useHaloboardStore } from '@/lib/store'

export function NotePropertiesPanel() {
  const { noteProperties, setNoteProperties } = useHaloboardStore()

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Sticky Note Properties</h3>

      <div>
        <label className="block text-sm font-medium mb-2">Background Style</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setNoteProperties({ backgroundType: 'plain' })}
            className={`p-2 border rounded ${noteProperties.backgroundType === 'plain' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          >
            Plain
          </button>
          <button
            onClick={() => setNoteProperties({ backgroundType: 'striped' })}
            className={`p-2 border rounded ${noteProperties.backgroundType === 'striped' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          >
            Lined
          </button>
          <button
            onClick={() => setNoteProperties({ backgroundType: 'grid' })}
            className={`p-2 border rounded ${noteProperties.backgroundType === 'grid' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setNoteProperties({ backgroundType: 'none' })}
            className={`p-2 border rounded ${noteProperties.backgroundType === 'none' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
          >
            None
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Background Color</label>
        <div className="grid grid-cols-4 gap-2">
          {['#FFFF88', '#FFCCCC', '#CCFFCC', '#CCCCFF', '#FFCCFF', '#FFFFCC', '#FFE4B5', '#E6E6FA'].map(color => (
            <button
              key={color}
              onClick={() => setNoteProperties({ backgroundColor: color })}
              className={`w-8 h-8 rounded border-2 ${noteProperties.backgroundColor === color ? 'border-gray-800' : 'border-gray-300'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Font Size</label>
        <input
          type="range"
          min="10"
          max="24"
          value={noteProperties.fontSize}
          onChange={(e) => setNoteProperties({ fontSize: parseInt(e.target.value) })}
          className="w-full"
        />
        <span className="text-sm">{noteProperties.fontSize}px</span>
      </div>

      <div>
        <label className="block text-sm font-medium">Corner Radius</label>
        <input
          type="range"
          min="0"
          max="20"
          value={noteProperties.cornerRadius}
          onChange={(e) => setNoteProperties({ cornerRadius: parseInt(e.target.value) })}
          className="w-full"
        />
        <span className="text-sm">{noteProperties.cornerRadius}px</span>
      </div>
    </div>
  )
}
