import type { CanvasObject, Point, BroadcastMessage, User, ChatMessage, Layer, HistoryStep } from "./types"
import { useHaloboardStore } from "./store"
import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore, doc, onSnapshot, type DocumentSnapshot } from "firebase/firestore"
import { getAuth, signInAnonymously } from "firebase/auth"

// Initialize Firebase - Handle missing config gracefully
const firebaseConfigString = typeof window !== 'undefined' ? (window as any).__firebase_config : null;
const firebaseConfig = firebaseConfigString ? JSON.parse(firebaseConfigString) : null;

let db: any;
let auth: any;

if (typeof window !== 'undefined' && firebaseConfig && firebaseConfig.apiKey) {
    try {
        const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
    } catch (e) {
        console.warn("Firebase initialization failed:", e);
    }
}

export class CollaborationManager {
  private projectId: string
  private userId: string
  private unsubscribe: (() => void) | null = null
  private lastCursorBroadcast = 0
  private broadcastChannel: BroadcastChannel | null = null
  private syncInterval: NodeJS.Timeout | null = null

  constructor(projectId: string, userId: string) {
    this.projectId = projectId
    this.userId = userId

    if (typeof window !== 'undefined') {
        // 1. Init BroadcastChannel for Local/Same-PC Sync (Instant)
        this.broadcastChannel = new BroadcastChannel(`teampad-${projectId}`)
        this.broadcastChannel.onmessage = (event) => {
            this.handleMessage(event.data as BroadcastMessage)
        }

        // Broadcast user join
        this.broadcastUserJoin()

        // 3. Init periodic sync every 2 seconds
        this.syncInterval = setInterval(() => {
            this.requestSync()
        }, 2000)

        // 2. Init Firebase for Remote Sync (If configured)
        if (db && auth) {
            this.initFirebase()
        }
    }
  }

  private handleMessage(message: BroadcastMessage) {
    // Don't process own messages
    if ('userId' in message && message.userId === this.userId) return
    if (message.type === 'USER_JOIN' && message.user.id === this.userId) return

    const store = useHaloboardStore.getState()
    
    switch (message.type) {
      case "CURSOR_MOVE":
        store.updateUserCursor(message.userId, message.position, message.userName, message.userColor)
        break
      case "OBJECT_UPDATE":
        store.updateObject(message.object.id, message.object, true)
        break
      case "OBJECT_DELETE":
        store.deleteObject(message.objectId, true)
        break
      case "LAYER_UPDATE":
        store.updateLayer(message.layer.id, message.layer, true)
        break
      case "LAYER_DELETE":
        store.deleteLayer(message.layerId, true)
        break
      case "HISTORY_UPDATE":
        store.addHistoryStep(message.historyStep, true)
        break
      case "HISTORY_NAVIGATION":
        if (message.action === "undo") {
          store.undo(true)
        } else if (message.action === "redo") {
          store.redo(true)
        } else if (message.action === "setIndex" && message.index !== undefined) {
          store.setHistoryIndex(message.index, true)
        }
        break
      case "CHAT_MESSAGE":
        store.addChatMessage(message.message, true)
        break
      case "USER_JOIN":
        store.addUser(message.user)
        // Broadcast our own user info back to the newly joined user
        this.broadcastUserJoin()
        // Broadcast all current cursor positions to ensure visibility
        const allUsers = useHaloboardStore.getState().users
        allUsers.forEach(user => {
          if (user.cursor && user.id !== message.user.id) {
            this.broadcastCursor(user.cursor)
          }
        })
        break
      case "USER_LEAVE":
        store.removeUser(message.userId)
        break
      case "USER_KICK":
        if (message.userId === this.userId) {
          // Current user is being kicked - leave the project
          const currentProjectId = useHaloboardStore.getState().currentProjectId
          store.setActiveView("dashboard")
          useHaloboardStore.setState({ currentProjectId: null })
          if (currentProjectId) {
            store.deleteProject(currentProjectId)
          }
          // Clear project state
          store.resetProject()
          // Disconnect collaboration
          this.disconnect()
        } else {
          // Remove the kicked user from our user list
          store.removeUser(message.userId)
        }
        break
      case "SYNC_REQUEST":
        // Send current objects and layers to the requesting user
        if (message.userId !== this.userId) {
          const { objects, layers } = useHaloboardStore.getState()
          const { users, history } = useHaloboardStore.getState()
          const response: BroadcastMessage = {
            type: "SYNC_RESPONSE",
            userId: this.userId,
            objects,
            layers,
            users,
            history
          }
          this.broadcastChannel?.postMessage(response)
        }
        break;
      case "SYNC_RESPONSE":
        // Update local state with synced objects and layers
        if (message.userId !== this.userId) {
          const store = useHaloboardStore.getState()
          // Only sync if we have fewer objects (indicating we're behind)
          if (message.objects.length > store.objects.length) {
            store.loadProject({ objects: message.objects, layers: message.layers })
          }
          // Update users list to include all known users
          if (message.users) {
            message.users.forEach(user => {
              if (!store.users.find(u => u.id === user.id)) {
                store.addUser(user)
              }
            })
          }
          // Sync history if we have fewer history steps
          if (message.history && message.history.length > store.history.length) {
            store.loadProject({ history: message.history, historyIndex: message.history.length - 1 })
          }
        }
        break;
    }
  }

  private async initFirebase() {
     if (!auth) return;
     
     if (!auth.currentUser) {
         try { await signInAnonymously(auth); } catch (e) { console.error("Auth failed", e); return; }
     }
     
     // Simple document listener
     const projectRef = doc(db, "projects", this.projectId);
     this.unsubscribe = onSnapshot(projectRef, (docSnapshot: DocumentSnapshot) => {
         // Real sync logic would go here
     });
  }

  public broadcastCursor(position: Point) {
    const now = Date.now();
    if (now - this.lastCursorBroadcast < 30) return; // Throttle 30ms
    this.lastCursorBroadcast = now;

    const { users, currentUserId } = useHaloboardStore.getState()
    const me = users.find(u => u.id === currentUserId)
    if (!me) return

    // Update our own cursor position locally
    useHaloboardStore.getState().updateUserCursor(this.userId, position, me.name, me.color)

    const msg: BroadcastMessage = {
        type: "CURSOR_MOVE",
        userId: this.userId,
        userName: me.name,
        userColor: me.color,
        position
    }

    this.broadcastChannel?.postMessage(msg)
  }

  public broadcastObject(object: CanvasObject) {
     const msg: BroadcastMessage = { type: "OBJECT_UPDATE", object }
     this.broadcastChannel?.postMessage(msg)
  }

  public broadcastDelete(objectId: string) {
     const msg: BroadcastMessage = { type: "OBJECT_DELETE", objectId }
     this.broadcastChannel?.postMessage(msg)
  }

  public broadcastLayer(layer: Layer) {
     const msg: BroadcastMessage = { type: "LAYER_UPDATE", layer }
     this.broadcastChannel?.postMessage(msg)
  }

  public broadcastLayerDelete(layerId: string) {
     const msg: BroadcastMessage = { type: "LAYER_DELETE", layerId }
     this.broadcastChannel?.postMessage(msg)
  }

  public broadcastHistory(historyStep: HistoryStep) {
     const msg: BroadcastMessage = { type: "HISTORY_UPDATE", historyStep }
     this.broadcastChannel?.postMessage(msg)
  }

  public broadcastHistoryNavigation(action: "undo" | "redo" | "setIndex", index?: number) {
     const msg: BroadcastMessage = { type: "HISTORY_NAVIGATION", action, index }
     this.broadcastChannel?.postMessage(msg)
  }

  public broadcastKick(userId: string) {
     const msg: BroadcastMessage = { type: "USER_KICK", userId }
     this.broadcastChannel?.postMessage(msg)
  }

  public broadcastChat(message: ChatMessage) {
     const msg: BroadcastMessage = { type: "CHAT_MESSAGE", message }
     this.broadcastChannel?.postMessage(msg)
  }

  public broadcastUserJoin() {
    const { users, currentUserId } = useHaloboardStore.getState()
    const me = users.find(u => u.id === currentUserId)
    if (!me) return

    const msg: BroadcastMessage = {
      type: "USER_JOIN",
      user: me
    }

    this.broadcastChannel?.postMessage(msg)
  }

  public requestSync() {
    const msg: BroadcastMessage = { type: "SYNC_REQUEST", userId: this.userId }
    this.broadcastChannel?.postMessage(msg)
  }

  public disconnect() {
    if (this.unsubscribe) this.unsubscribe();
    this.broadcastChannel?.close();
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

let manager: CollaborationManager | null = null;

export function useCollaboration(projectId?: string | null, userId?: string) {
  if (!projectId || !userId) return null;
  
  // Reset if project changes
  if (manager && (manager as any).projectId !== projectId) {
      manager.disconnect();
      manager = null;
  }

  if (!manager && typeof window !== 'undefined') {
      manager = new CollaborationManager(projectId, userId);
  }
  return manager;
}

export function getCollaborationManager() {
  return manager;
}