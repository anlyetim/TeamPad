"use client"

import { Share2, X, Link, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useHaloboardStore } from "@/lib/store"
import { useTranslation } from "@/lib/i18n"
import { useToast } from "@/hooks/use-toast"

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const { highlightColor, currentProjectId } = useHaloboardStore()
  const { t } = useTranslation()
  const { toast } = useToast()
  
  if (!isOpen) return null

  const handleCopyLink = async () => {
    const codeToCopy = currentProjectId || ""
    
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(codeToCopy);
        } else {
            // Fallback for non-secure contexts (like HTTP local IP)
            const textArea = document.createElement("textarea");
            textArea.value = codeToCopy;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
        }
        toast({ description: "Project code copied to clipboard!", duration: 2000 })
    } catch (err) {
        console.error('Failed to copy: ', err);
        toast({ description: "Failed to copy code.", variant: "destructive" })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/95">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5"
        >
          <X className="size-5 text-neutral-600 dark:text-neutral-400" />
        </button>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div 
              className="flex size-10 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: highlightColor }}
            >
              <Share2 className="size-5" />
            </div>
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
              {t("share")}
            </h2>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Share this code with your friends to let them join your project.
            </p>
            
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Link className="absolute left-2 top-2.5 size-4 text-neutral-500" />
                    <Input 
                        readOnly 
                        value={currentProjectId || "No Project ID"} 
                        className="pl-8 bg-neutral-100 dark:bg-neutral-800 border-transparent font-mono font-medium text-center"
                    />
                </div>
                <Button 
                    onClick={handleCopyLink}
                    size="icon"
                    className="shrink-0"
                    style={{ backgroundColor: highlightColor }}
                >
                    <Copy className="size-4" />
                </Button>
            </div>
          </div>

          <Button 
            onClick={onClose}
            className="mt-2 w-full hover:opacity-90 bg-neutral-200 text-neutral-800 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            {t("done")}
          </Button>
        </div>
      </div>
    </div>
  )
}