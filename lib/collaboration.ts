import type { CanvasObject, Point, BroadcastMessage, User, ChatMessage, Layer, HistoryStep } from "./types"
import { useHaloboardStore } from "./store"
import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore, doc, onSnapshot, updateDoc, type DocumentSnapshot } from "firebase/firestore"
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
  private messageQueue: BroadcastMessage[] = []

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
        // Ensure our own user object has a cursor
        const boardState = useHaloboardStore.getState()
        const hostUser = boardState.users.find(u => u.id === this.userId)
        if (hostUser && !hostUser.cursor) {
          // Set to center or last position (fallback)
          const container = document.querySelector('.absolute.inset-0.w-full.h-full.overflow-hidden') as HTMLDivElement | null
          let pos = { x: 100, y: 100 }
          if (container) {
            const rect = container.getBoundingClientRect()
            pos = { x: rect.width/2, y: rect.height/2 }
          }
          useHaloboardStore.getState().updateUserCursor(this.userId, pos, hostUser.name, hostUser.color)
        }
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
          this.broadcastMessage(response)
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
     if (!auth || !db) return;

     if (!auth.currentUser) {
         try { await signInAnonymously(auth); } catch (e) { console.error("Auth failed", e); return; }
     }

     // Listen for real-time updates from Firebase
     const projectRef = doc(db, "projects", this.projectId);
     this.unsubscribe = onSnapshot(projectRef, (docSnapshot: DocumentSnapshot) => {
         if (!docSnapshot.exists()) return;

         const data = docSnapshot.data();
         if (!data) return;

         // Process remote messages from Firebase
         if (data.messages && Array.isArray(data.messages)) {
             data.messages.forEach((msg: any) => {
                 // Only process messages that aren't from us and haven't been processed
                 if (msg.userId !== this.userId && msg.timestamp > Date.now() - 5000) { // Within last 5 seconds
                     this.handleMessage(msg as BroadcastMessage);
                 }
             });
         }
     });

     // Set up periodic sending of messages to Firebase
     setInterval(async () => {
         if (this.messageQueue.length > 0) {
             const messages = [...this.messageQueue];
             this.messageQueue = [];

             try {
                 // Add timestamp to messages for filtering
                 const messagesWithTimestamp = messages.map(msg => ({
                     ...msg,
                     timestamp: Date.now()
                 }));

                 await updateDoc(projectRef, {
                     messages: messagesWithTimestamp,
                     lastUpdated: Date.now()
                 });
             } catch (error) {
                 console.error("Failed to send messages to Firebase:", error);
                 // Put messages back in queue
                 this.messageQueue.unshift(...messages);
             }
         }
     }, 100); // Send every 100ms
  }

  private broadcastMessage(message: BroadcastMessage) {
    // Send via BroadcastChannel for local communication
    this.broadcastChannel?.postMessage(message)

    // Queue for Firebase if available
    if (db && auth?.currentUser) {
      this.messageQueue.push(message)
    }
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

    this.broadcastMessage(msg)
  }

  public broadcastObject(object: CanvasObject) {
     const msg: BroadcastMessage = { type: "OBJECT_UPDATE", object }
     this.broadcastMessage(msg)
  }

  public broadcastDelete(objectId: string) {
     const msg: BroadcastMessage = { type: "OBJECT_DELETE", objectId }
     this.broadcastMessage(msg)
  }

  public broadcastLayer(layer: Layer) {
     const msg: BroadcastMessage = { type: "LAYER_UPDATE", layer }
     this.broadcastMessage(msg)
  }

  public broadcastLayerDelete(layerId: string) {
     const msg: BroadcastMessage = { type: "LAYER_DELETE", layerId }
     this.broadcastMessage(msg)
  }

  public broadcastHistory(historyStep: HistoryStep) {
     const msg: BroadcastMessage = { type: "HISTORY_UPDATE", historyStep }
     this.broadcastMessage(msg)
  }

  public broadcastHistoryNavigation(action: "undo" | "redo" | "setIndex", index?: number) {
     const msg: BroadcastMessage = { type: "HISTORY_NAVIGATION", action, index }
     this.broadcastMessage(msg)
  }

  public broadcastKick(userId: string) {
     const msg: BroadcastMessage = { type: "USER_KICK", userId }
     this.broadcastMessage(msg)
  }

  public broadcastChat(message: ChatMessage) {
     const msg: BroadcastMessage = { type: "CHAT_MESSAGE", message }
     this.broadcastMessage(msg)
  }

  public broadcastUserJoin() {
    const { users, currentUserId } = useHaloboardStore.getState()
    const me = users.find(u => u.id === currentUserId)
    if (!me) return

    const msg: BroadcastMessage = {
      type: "USER_JOIN",
      user: me
    }

    this.broadcastMessage(msg)
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