import type { CanvasObject, Point, BroadcastMessage, User } from "./types"
import { useHaloboardStore } from "./store"

export class CollaborationManager {
  private channel: BroadcastChannel | null = null
  private userId: string
  private lastBroadcastTime: number = 0
  private readonly BROADCAST_INTERVAL = 30 // Limit broadcasts to ~30ms (approx 30fps) to save RAM/CPU

  constructor(userId: string) {
    this.userId = userId
    
    if (typeof window !== 'undefined') {
      this.channel = new BroadcastChannel("teampad-collaboration")
      
      this.channel.onmessage = (event) => {
        this.handleMessage(event.data as BroadcastMessage)
      }

      // Announce join
      const { users, currentUserId } = useHaloboardStore.getState()
      const me = users.find(u => u.id === currentUserId)
      
      if (me) {
          this.channel.postMessage({ type: "USER_JOIN", user: me })
      }

      window.addEventListener('beforeunload', () => {
          this.disconnect()
      })
    }
  }

  private handleMessage(message: BroadcastMessage) {
    const store = useHaloboardStore.getState()
    
    switch (message.type) {
      case "CURSOR_MOVE":
        // Update user cursor in store efficiently
        store.updateUserCursor(message.userId, message.position, message.userName, message.userColor)
        break
        
      case "OBJECT_UPDATE":
        // Update object from remote source, set isRemote=true to prevent echo
        store.updateObject(message.object.id, message.object, true)
        break
        
      case "OBJECT_DELETE":
        store.deleteObject(message.objectId, true)
        break
        
      case "USER_JOIN":
        store.addUser(message.user)
        break
        
      case "USER_LEAVE":
        store.removeUser(message.userId)
        break
    }
  }

  public broadcastCursor(position: Point) {
    const now = Date.now()
    if (now - this.lastBroadcastTime < this.BROADCAST_INTERVAL) return // Throttle

    this.lastBroadcastTime = now
    const { users, currentUserId } = useHaloboardStore.getState()
    const me = users.find(u => u.id === currentUserId)
    
    if (!me || !this.channel) return

    this.channel.postMessage({
      type: "CURSOR_MOVE",
      userId: this.userId,
      userName: me.name,
      userColor: me.color,
      position
    })
  }

  public broadcastObject(object: CanvasObject) {
    if (!this.channel) return
    this.channel.postMessage({
      type: "OBJECT_UPDATE",
      object
    })
  }

  public broadcastDelete(objectId: string) {
    if (!this.channel) return
    this.channel.postMessage({
      type: "OBJECT_DELETE",
      objectId
    })
  }

  public disconnect() {
    if (!this.channel) return
    this.channel.postMessage({ type: "USER_LEAVE", userId: this.userId })
    this.channel.close()
  }
}

// Singleton instance management
let manager: CollaborationManager | null = null

export function useCollaboration(userId?: string) {
  if (!userId) return null
  
  if (!manager && typeof window !== 'undefined') {
    manager = new CollaborationManager(userId)
  }
  return manager
}

export function getCollaborationManager() {
  return manager
}