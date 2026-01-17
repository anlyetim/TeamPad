// components/tools/index.ts - Tool exports and registration

import { getToolRegistry } from '@/lib/toolRegistry'
import { SelectionTool } from './SelectionTool'
import { BrushTool } from './BrushTool'
import { EraserTool } from './EraserTool'
import { TextTool } from './TextTool'
import { NoteTool } from './NoteTool'
import { ShapeTool } from './ShapeTool'
import { ImageTool } from './ImageTool'

export {
    SelectionTool,
    BrushTool,
    EraserTool,
    TextTool,
    NoteTool,
    ShapeTool,
    ImageTool
}

// Register all tools with the registry
export function registerAllTools() {
    const registry = getToolRegistry()

    registry.register(SelectionTool)
    registry.register(BrushTool)
    registry.register(EraserTool)
    registry.register(TextTool)
    registry.register(NoteTool)
    registry.register(ShapeTool)
    registry.register(ImageTool)
}

export default {
    SelectionTool,
    BrushTool,
    EraserTool,
    TextTool,
    NoteTool,
    ShapeTool,
    ImageTool,
    registerAllTools
}
