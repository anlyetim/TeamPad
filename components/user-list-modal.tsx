"use client"

import { Button } from "@/components/ui/button"
import { useHaloboardStore } from "@/lib/store"
import { useTranslation } from "@/lib/i18n"
import { UserMinus, X } from "lucide-react"

interface UserListModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UserListModal({ isOpen, onClose }: UserListModalProps) {
  const { users, currentUserId, isOwner, highlightColor, removeUser } = useHaloboardStore()
  const { t } = useTranslation()

  if (!isOpen) return null

  const handleKick = (userId: string) => {
    removeUser(userId, true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-white/20 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/95">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5"
        >
          <X className="size-5 text-neutral-600 dark:text-neutral-400" />
        </button>

        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: highlightColor }}
          >
            <UserMinus className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{t("userList")}</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {users.length ? `${users.length} ${t("participants") || ""}` : t("noUsers")}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {users.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("noUsers")}</p>
          ) : (
            users.map((user) => {
              const statusBadge =
                user.isAdmin ? t("adminLabel") : (user.id === currentUserId ? t("youLabel") : null)
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200/70 bg-neutral-50/70 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div
                          className="size-full flex items-center justify-center text-xs font-semibold uppercase text-white"
                          style={{ backgroundColor: user.color }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {user.name}
                        {statusBadge && (
                          <span className="ml-2 rounded-full border border-neutral-300 px-2 py-0.5 text-[0.65rem] uppercase text-neutral-600 dark:border-neutral-600 dark:text-neutral-300">
                            {statusBadge}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {isOwner && user.id !== currentUserId && !user.isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleKick(user.id)}
                      className="gap-1 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400"
                    >
                      <UserMinus className="size-4" />
                      {t("kickUser")}
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

