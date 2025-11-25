"use client"

import { useHaloboardStore } from "@/lib/store"
import { Slider } from "@/components/ui/slider"

export function BrushControl() {
  const { brushSettings, setBrushSettings, activeTool } = useHaloboardStore()

  if (activeTool !== "brush" && activeTool !== "eraser") {
    return null
  }

  return (
    <div className="fixed right-4 top-20 z-30 w-64 rounded-xl border border-white/20 bg-white/60 p-4 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60">
      <h3 className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
        {activeTool === "brush" ? "Brush" : "Eraser"} Settings
      </h3>

      <div className="space-y-4">
        {/* Size */}
        <div>
          <label className="mb-2 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
            <span>Size</span>
            <span className="font-medium">{brushSettings.size}px</span>
          </label>
          <Slider
            value={[brushSettings.size]}
            onValueChange={([value]) => setBrushSettings({ size: value })}
            min={1}
            max={50}
            step={1}
            className="w-full"
          />
        </div>

        {/* Opacity */}
        <div>
          <label className="mb-2 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
            <span>Opacity</span>
            <span className="font-medium">{Math.round(brushSettings.opacity * 100)}%</span>
          </label>
          <Slider
            value={[brushSettings.opacity * 100]}
            onValueChange={([value]) => setBrushSettings({ opacity: value / 100 })}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Color */}
        {activeTool === "brush" && (
          <div>
            <label className="mb-2 block text-xs text-neutral-600 dark:text-neutral-400">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brushSettings.color}
                onChange={(e) => setBrushSettings({ color: e.target.value })}
                className="h-10 w-10 cursor-pointer rounded-lg border-2 border-neutral-200 dark:border-neutral-700"
              />
              <input
                type="text"
                value={brushSettings.color}
                onChange={(e) => setBrushSettings({ color: e.target.value })}
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-mono dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
          </div>
        )}

        {/* Color Palette */}
        {activeTool === "brush" && (
          <div>
            <label className="mb-2 block text-xs text-neutral-600 dark:text-neutral-400">Quick Colors</label>
            <div className="grid grid-cols-6 gap-2">
              {[
                "#000000",
                "#EF4444",
                "#F97316",
                "#EAB308",
                "#22C55E",
                "#0A84FF",
                "#8B5CF6",
                "#EC4899",
                "#FFFFFF",
                "#9CA3AF",
                "#64748B",
                "#475569",
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => setBrushSettings({ color })}
                  className={`aspect-square rounded-lg border-2 transition-transform hover:scale-110 ${
                    brushSettings.color === color
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
    </div>
  )
}
