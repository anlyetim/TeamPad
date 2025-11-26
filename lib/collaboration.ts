import type { CanvasObject, Point, BroadcastMessage, User, ChatMessage, Layer, HistoryStep } from "./types"
import { useHaloboardStore } from "./store"
import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore, doc, onSnapshot, updateDoc, setDoc, type DocumentSnapshot, getDoc } from "firebase/firestore"
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

// Helper to validate project existence before joining
export async function checkProjectExists(projectId: string): Promise<boolean> {
    if (!db || !projectId) return false;
    try {
        const docRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists();
    } catch (e) {
        console.error("Error checking project existence:", e);
        return false;
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
  private isOnline: boolean;
  private saveTimeout: NodeJS.Timeout | null = null;
  private initialLoadDone = false;

  constructor(projectId: string, userId: string) {
    this.projectId = projectId
    this.userId = userId
    this.isOnline = false;

    if (typeof window !== 'undefined') {
      const { isOnline: sOnline } = useHaloboardStore.getState();
      this.isOnline = !!sOnline;
      if (this.isOnline) {
        // Online mode: Only setup Firebase
        if (db && auth) {
          this.initFirebase();
        }
        // Broadcast own join event
        this.broadcastUserJoin();
        this.syncInterval = setInterval(() => {
          this.requestSync();
        }, 5000); // Relaxed interval
      } else {
        // Offline mode: Only BroadcastChannel
        this.broadcastChannel = new BroadcastChannel(`teampad-${projectId}`);
        this.broadcastChannel.onmessage = (event) => {
          this.handleMessage(event.data as BroadcastMessage);
        };
        this.broadcastUserJoin();
        this.syncInterval = setInterval(() => {
          this.requestSync();
        }, 2000);
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
        if (hostUser && hostUser.cursor) {
          this.broadcastCursor(hostUser.cursor)
        }
        break
      case "USER_LEAVE":
        store.removeUser(message.userId)
        break
      case "USER_KICK":
        if (message.userId === this.userId) {
          // Current user is being kicked - leave the project
          const currentProjectId = useHaloboardStore.getState().currentProjectId
          const setStore = useHaloboardStore.setState
          if (currentProjectId) {
            // Add to kickedProjectIds
            setStore((state) => ({
                kickedProjectIds: [...(state.kickedProjectIds || []), currentProjectId],
                projects: state.projects.filter(p => p.id !== currentProjectId)
            }))
          }
          // Always update view/detach
          useHaloboardStore.setState({ activeView: "dashboard", currentProjectId: null })
          if (currentProjectId) {
            const store = useHaloboardStore.getState()
            store.deleteProject(currentProjectId) // just in case
          }
          // Clear project state
          useHaloboardStore.getState().resetProject()
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
          // Only sync if we have objects to share
          if (objects.length > 0) {
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
        }
        break;
      case "SYNC_RESPONSE":
        // Update local state with synced objects and layers
        if (message.userId !== this.userId) {
          const store = useHaloboardStore.getState()
          // Sync if we are empty OR if they have more objects (simple conflict resolution)
          if (store.objects.length === 0 && message.objects.length > 0) {
            store.loadProject({ objects: message.objects, layers: message.layers })
          } else if (message.objects.length > store.objects.length) {
            store.loadProject({ objects: message.objects, layers: message.layers })
          }
          
          // Update users list
          if (message.users) {
            message.users.forEach(user => {
              if (!store.users.find(u => u.id === user.id)) {
                store.addUser(user)
              }
            })
          }
          // Sync history
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

     const projectRef = doc(db, "projects", this.projectId);

     // FIX: If I am the owner (creator), ensure the project exists in DB immediately.
     // This prevents "Project not found" for others trying to join.
     if (useHaloboardStore.getState().isOwner) {
         const { objects, layers, canvasSettings } = useHaloboardStore.getState();
         // Use setDoc with merge to ensure existence without overwriting if it somehow exists
         setDoc(projectRef, {
             objects: objects || [],
             layers: layers || [],
             canvasSettings: canvasSettings || {},
             lastUpdated: Date.now()
         }, { merge: true }).catch(e => console.error("Failed to init project in DB:", e));
     }

     // Attempt initial fetch to sync state
     try {
        const docSnap = await getDoc(projectRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const store = useHaloboardStore.getState();
            if (data.objects && Array.isArray(data.objects)) {
                // Only overwrite if we are fresh (empty)
                if (store.objects.length === 0) {
                    store.loadProject({
                        objects: data.objects,
                        layers: data.layers || [],
                    });
                    this.initialLoadDone = true;
                }
            }
        }
     } catch (e) {
         console.error("Failed to fetch initial project state:", e);
     }

     // Listen for real-time updates
     this.unsubscribe = onSnapshot(projectRef, (docSnapshot: DocumentSnapshot) => {
         if (!docSnapshot.exists()) return;

         const data = docSnapshot.data();
         if (!data) return;

         // Redundant check: if we missed the initial load
         if (!this.initialLoadDone && data.objects && data.objects.length > 0) {
             const store = useHaloboardStore.getState();
             if (store.objects.length === 0) {
                 store.loadProject({ objects: data.objects, layers: data.layers || [] });
                 this.initialLoadDone = true;
             }
         }

         // Process remote messages from Firebase
         if (data.messages && Array.isArray(data.messages)) {
             data.messages.forEach((msg: any) => {
                 if (msg.userId !== this.userId && msg.timestamp > Date.now() - 30000) { 
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
                 this.messageQueue.unshift(...messages);
             }
         }
     }, 100); 
  }

  public saveProject(state: any) {
    if (!this.isOnline || !db || !auth?.currentUser) return;

    // Debounce saves
    if (this.saveTimeout) clearTimeout(this.saveTimeout);

    this.saveTimeout = setTimeout(async () => {
        const projectRef = doc(db, "projects", this.projectId);
        try {
            await updateDoc(projectRef, {
                objects: state.objects,
                layers: state.layers,
                lastUpdated: Date.now()
            });
        } catch (e) {
            console.error("Failed to save project state to Cloud:", e);
        }
    }, 2000); 
  }

  private broadcastMessage(message: BroadcastMessage) {
    if (this.isOnline) {
      if (db && auth?.currentUser) {
        this.messageQueue.push(message)
      }
    } else {
      this.broadcastChannel?.postMessage(message)
    }
  }

  public broadcastCursor(position: Point) {
    const now = Date.now();
    if (now - this.lastCursorBroadcast < 30) return; 
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
    if (this.isOnline) {
      this.broadcastMessage(msg)
    } else {
      this.broadcastChannel?.postMessage(msg)
    }
  }

  public disconnect() {
    if (this.unsubscribe) this.unsubscribe();
    this.broadcastChannel?.close();
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
  }
}

let manager: CollaborationManager | null = null;

export function useCollaboration(projectId?: string | null, userId?: string) {
  if (!projectId || !userId) return null;
  
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