"use client"

import { useHaloboardStore } from "@/lib/store"
import { Slider } from "@/components/ui/slider"
import { Eye, EyeOff, Lock, LockOpen, ChevronDown, Plus, Trash2 } from "lucide-react"
import { useState } from "react"

export function PropertiesPanel() {
  const { layers, selectedIds, objects, showPropertiesPanel, addLayer, updateLayer, deleteLayer, updateObject } =
    useHaloboardStore()

  const [expandedSections, setExpandedSections] = useState({
    layers: true,
    properties: true,
  })

  if (!showPropertiesPanel) {
    return null
  }

  const selectedObject = selectedIds.length === 1 ? objects.find((obj) => obj.id === selectedIds[0]) : null

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev],
    }))
  }

  return (
    <aside className="fixed right-4 top-20 z-30 w-80 max-h-[calc(100vh-160px)] overflow-y-auto rounded-xl border border-white/20 bg-white/70 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/70">
      <div className="flex flex-col gap-3 p-3">
        {/* Layers Section */}
        <details open={expandedSections.layers} className="rounded-lg bg-black/5 dark:bg-white/5">
          <summary
            onClick={(e) => {
              e.preventDefault()
              toggleSection("layers")
            }}
            className="flex cursor-pointer list-none items-center justify-between p-3"
          >
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Layers</p>
            <ChevronDown
              className={`size-4 text-neutral-600 transition-transform dark:text-neutral-400 ${
                expandedSections.layers ? "rotate-180" : ""
              }`}
            />
          </summary>

          {expandedSections.layers && (
            <div className="flex flex-col gap-2 px-3 pb-3">
              {/* Layer List */}
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  className="flex items-center gap-2 rounded-lg bg-white/50 p-2 dark:bg-neutral-800/50"
                >
                  <div className="flex flex-1 flex-col">
                    <input
                      type="text"
                      value={layer.name}
                      onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                      className="bg-transparent text-sm font-medium text-neutral-800 outline-none dark:text-neutral-200"
                    />
                    <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                      <span>{layer.objectIds.length} objects</span>
                      <span>·</span>
                      <span>{Math.round(layer.opacity * 100)}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
                    className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    {layer.visible ? (
                      <Eye className="size-4 text-neutral-600 dark:text-neutral-400" />
                    ) : (
                      <EyeOff className="size-4 text-neutral-400 dark:text-neutral-600" />
                    )}
                  </button>

                  <button
                    onClick={() => updateLayer(layer.id, { locked: !layer.locked })}
                    className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    {layer.locked ? (
                      <Lock className="size-4 text-neutral-600 dark:text-neutral-400" />
                    ) : (
                      <LockOpen className="size-4 text-neutral-400 dark:text-neutral-600" />
                    )}
                  </button>

                  {layers.length > 1 && (
                    <button
                      onClick={() => deleteLayer(layer.id)}
                      className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}

              {/* Add Layer Button */}
              <button
                onClick={addLayer}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 p-2 text-sm font-medium text-neutral-600 transition-colors hover:border-[#0A84FF] hover:text-[#0A84FF] dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-[#0A84FF]"
              >
                <Plus className="size-4" />
                Add Layer
              </button>
            </div>
          )}
        </details>

        {/* Properties Section */}
        {selectedObject && (
          <details open={expandedSections.properties} className="rounded-lg bg-black/5 dark:bg-white/5">
            <summary
              onClick={(e) => {
                e.preventDefault()
                toggleSection("properties")
              }}
              className="flex cursor-pointer list-none items-center justify-between p-3"
            >
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Properties</p>
              <ChevronDown
                className={`size-4 text-neutral-600 transition-transform dark:text-neutral-400 ${
                  expandedSections.properties ? "rotate-180" : ""
                }`}
              />
            </summary>

            {expandedSections.properties && (
              <div className="flex flex-col gap-3 px-3 pb-3">
                {/* Transform */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Position
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-500">X</label>
                      <input
                        type="number"
                        value={Math.round(selectedObject.transform.x)}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            transform: {
                              ...selectedObject.transform,
                              x: Number.parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-neutral-500 dark:text-neutral-500">Y</label>
                      <input
                        type="number"
                        value={Math.round(selectedObject.transform.y)}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            transform: {
                              ...selectedObject.transform,
                              y: Number.parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Rotation */}
                <div>
                  <label className="mb-2 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                    <span>Rotation</span>
                    <span className="font-medium">{Math.round(selectedObject.transform.rotation)}°</span>
                  </label>
                  <Slider
                    value={[selectedObject.transform.rotation]}
                    onValueChange={([value]) =>
                      updateObject(selectedObject.id, {
                        transform: {
                          ...selectedObject.transform,
                          rotation: value,
                        },
                      })
                    }
                    min={-180}
                    max={180}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Object-specific properties */}
                {selectedObject.type === "path" && (
                  <div>
                    <label className="mb-2 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Stroke Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={(selectedObject.data as any).strokeColor}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            data: {
                              ...(selectedObject.data as any),
                              strokeColor: e.target.value,
                            },
                          })
                        }
                        className="h-10 w-10 cursor-pointer rounded-lg border-2 border-neutral-200 dark:border-neutral-700"
                      />
                      <input
                        type="text"
                        value={(selectedObject.data as any).strokeColor}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            data: {
                              ...(selectedObject.data as any),
                              strokeColor: e.target.value,
                            },
                          })
                        }
                        className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-mono dark:border-neutral-700 dark:bg-neutral-800"
                      />
                    </div>
                  </div>
                )}

                {selectedObject.type === "shape" && (
                  <>
                    <div>
                      <label className="mb-2 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        Fill Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={(selectedObject.data as any).fillColor}
                          onChange={(e) =>
                            updateObject(selectedObject.id, {
                              data: {
                                ...(selectedObject.data as any),
                                fillColor: e.target.value,
                              },
                            })
                          }
                          className="h-10 w-10 cursor-pointer rounded-lg border-2 border-neutral-200 dark:border-neutral-700"
                        />
                        <input
                          type="text"
                          value={(selectedObject.data as any).fillColor}
                          onChange={(e) =>
                            updateObject(selectedObject.id, {
                              data: {
                                ...(selectedObject.data as any),
                                fillColor: e.target.value,
                              },
                            })
                          }
                          className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-mono dark:border-neutral-700 dark:bg-neutral-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        Stroke Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={(selectedObject.data as any).strokeColor}
                          onChange={(e) =>
                            updateObject(selectedObject.id, {
                              data: {
                                ...(selectedObject.data as any),
                                strokeColor: e.target.value,
                              },
                            })
                          }
                          className="h-10 w-10 cursor-pointer rounded-lg border-2 border-neutral-200 dark:border-neutral-700"
                        />
                        <input
                          type="text"
                          value={(selectedObject.data as any).strokeColor}
                          onChange={(e) =>
                            updateObject(selectedObject.id, {
                              data: {
                                ...(selectedObject.data as any),
                                strokeColor: e.target.value,
                              },
                            })
                          }
                          className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-mono dark:border-neutral-700 dark:bg-neutral-800"
                        />
                      </div>
                    </div>
                  </>
                )}

                {selectedObject.type === "note" && (
                  <div>
                    <label className="mb-2 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Note Color
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {["#FFF2CC", "#D6F1E9", "#FFD6E8", "#D6E8FF", "#E8D6FF", "#FFE8D6"].map((color) => (
                        <button
                          key={color}
                          onClick={() =>
                            updateObject(selectedObject.id, {
                              data: {
                                ...(selectedObject.data as any),
                                color,
                              },
                            })
                          }
                          className={`aspect-square rounded-lg border-2 transition-transform hover:scale-110 ${
                            (selectedObject.data as any).color === color
                              ? "border-[#0A84FF] ring-2 ring-[#0A84FF]/30"
                              : "border-neutral-200 dark:border-neutral-700"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </details>
        )}
      </div>
    </aside>
  )
}
