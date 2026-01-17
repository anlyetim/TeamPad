import type { CanvasObject, Point, BroadcastMessage, User, ChatMessage, Layer, HistoryStep } from "./types"
import { useHaloboardStore } from "./store"
import { getEditorRuntime } from "./editorRuntime"
import { doc, onSnapshot, updateDoc, setDoc, type DocumentSnapshot, getDoc } from "firebase/firestore"
import { signInAnonymously } from "firebase/auth"
import { db, auth } from "./firebaseConfig" // YENİ: Config dosyasından import ediyoruz

// Proje var mı kontrolü
export async function checkProjectExists(projectId: string): Promise<boolean> {
  if (!db || !projectId) {
    console.warn("Database check failed: DB or ProjectID missing");
    return false;
  }
  try {
    // Veritabanını okumadan önce giriş yapıldığından emin ol
    if (auth && !auth.currentUser) {
      await signInAnonymously(auth);
    }

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
        // Online mod: Config'den gelen db ve auth'u kullan
        if (db && auth) {
          this.initFirebase();
        } else {
          console.error("Firebase not initialized. Check firebaseConfig.ts and env variables.");
        }

        this.broadcastUserJoin();
        // Request sync on join to get full state
        this.requestSync();
        this.syncInterval = setInterval(() => {
          this.requestSync();
        }, 5000);
      } else {
        // Offline mod
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

  private handleMessage(message: any) {
    if ('userId' in message && message.userId === this.userId) return
    if (message.type === 'USER_JOIN' && message.user.id === this.userId) return

    const store = useHaloboardStore.getState()

    try {
      // Handle all message types with type assertions for backward compatibility
      switch (message.type) {
        case "CURSOR_MOVE":
        case "CURSOR_UPDATE":
          const cursorPos = message.position || { x: message.x, y: message.y }
          const cursorName = message.userName || message.name
          const cursorColor = message.userColor || message.color
          store.updateUserCursor(message.userId, cursorPos, cursorName, cursorColor, message.tool)
          break
        case "OBJECT_UPDATE":
        case "OBJECT_COMMIT":
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
          if (message.action === "undo") { store.undo(true) }
          else if (message.action === "redo") { store.redo(true) }
          else if (message.action === "setIndex" && message.index !== undefined) { store.setHistoryIndex(message.index, true) }
          break
        case "CHAT_MESSAGE":
        case "CURSOR_CHAT":
          const chatContent = message.message?.content || message.message
          store.addChatMessage(chatContent, true)
          // Trigger chat bubble for 3 seconds
          const chatUserId = message.message?.userId || message.userId
          store.showCursorChatBubble(chatUserId, chatContent, 3000)
          break
        case "TEXT_LIVE":
          // Update live text content for remote users
          if (message.objectId && message.content !== undefined) {
            getEditorRuntime().updateTextLive(message.objectId, message.content, true)
          }
          break
        case "TEXT_COMMIT":
          // Commit final text object
          if (message.object) {
            getEditorRuntime().updateObject(message.object.id, message.object, true)
          }
          break
        case "NOTE_CREATE":
          // Create note object
          if (message.object) {
            getEditorRuntime().addObject(message.object, true)
          }
          break
        case "OBJECT_TRANSFORM":
          // Apply transform delta
          if (message.objectId && message.delta) {
            getEditorRuntime().applyTransformDelta(message.objectId, message.delta, true)
          }
          break
        case "CLIPBOARD_COPY":
          // Handle clipboard copy broadcast
          break
        case "CLIPBOARD_PASTE":
          // Handle clipboard paste broadcast
          if (message.objects) {
            message.objects.forEach((obj: any) => {
              getEditorRuntime().addObject(obj, true)
            })
          }
          break
        case "SNAPSHOT_REQUEST":
          // Send snapshot to requesting user
          if (message.userId) {
            this.sendSnapshot(message.userId)
          }
          break
        case "SNAPSHOT_RESPONSE":
          // Apply received snapshot
          if (message.objects && message.layers) {
            getEditorRuntime().applySnapshot({
              objects: message.objects,
              layers: message.layers,
              timestamp: message.timestamp
            }, true)
          }
          break
        case "USER_JOIN":
          store.addUser(message.user)
          this.broadcastUserJoin()
          // Broadcast cursor for all existing users (even without cursor positions)
          const boardState = useHaloboardStore.getState()
          boardState.users.forEach(user => {
            if (user.id !== message.user.id) {
              // Use current cursor position, or center of canvas as default
              const cursorPosition = user.cursor || { x: 960, y: 540 } // Default center position
              const msg: any = {
                type: "CURSOR_UPDATE",
                userId: user.id,
                name: user.name,
                color: user.color,
                x: cursorPosition.x,
                y: cursorPosition.y,
                tool: user.tool,
                timestamp: Date.now()
              }
              this.broadcastMessage(msg)
            }
          })
          break
        case "USER_LEAVE":
          store.removeUser(message.userId)
          break
        case "USER_KICK":
          if (message.userId === this.userId) {
            const currentProjectId = useHaloboardStore.getState().currentProjectId
            if (currentProjectId) {
              useHaloboardStore.setState((state) => ({
                kickedProjectIds: [...(state.kickedProjectIds || []), currentProjectId],
                projects: state.projects.filter(p => p.id !== currentProjectId)
              }))
            }
            useHaloboardStore.setState({ activeView: "dashboard", currentProjectId: null })
            useHaloboardStore.getState().resetProject()
            this.disconnect()
          } else {
            store.removeUser(message.userId)
          }
          break
        case "SYNC_REQUEST":
          // Send full project state to requesting user (for join/rejoin)
          if ((message as any).userId !== this.userId) {
            const store = useHaloboardStore.getState()
            const { objects, layers, users, history } = store
            // Always send response with full state when requested
            const response: BroadcastMessage = {
              type: "SYNC_RESPONSE" as any,
              userId: this.userId,
              objects: objects || [],
              layers: layers || [],
              users: users || [],
              history: history || []
            }
            this.broadcastMessage(response as any)
          }
          break;
        case "SYNC_RESPONSE":
          // Apply full project state on join/rejoin
          if ((message as any).userId !== this.userId) {
            const store = useHaloboardStore.getState()
            // For new users: apply full state if canvas is empty
            if (store.objects.length === 0 && (message as any).objects && (message as any).objects.length > 0) {
              store.loadProject({ 
                objects: (message as any).objects, 
                layers: (message as any).layers || store.layers 
              })
              this.initialLoadDone = true
            }
            // Update users list from sync response
            if ((message as any).users && Array.isArray((message as any).users)) {
              (message as any).users.forEach((user: any) => {
                if (!store.users.find(u => u.id === user.id)) {
                  store.addUser(user)
                }
              })
            }
            // Merge history if provided and newer
            if ((message as any).history && Array.isArray((message as any).history)) {
              if ((message as any).history.length > store.history.length) {
                store.loadProject({ 
                  history: (message as any).history, 
                  historyIndex: (message as any).history.length - 1 
                })
              }
            }
          }
          break;
      }
    } catch (e) {
      console.error("Error handling message:", e, message)
      // If error might be due to missing object state, request full snapshot
      this.requestSnapshot()
    }
  }

  private async initFirebase() {
    if (!auth || !db) return;

    if (!auth.currentUser) {
      try { await signInAnonymously(auth); } catch (e) { console.error("Auth failed", e); return; }
    }

    const projectRef = doc(db, "projects", this.projectId);

    // Eğer proje sahibiysek, projeyi veritabanına kaydet.
    if (useHaloboardStore.getState().isOwner) {
      const { objects, layers, canvasSettings } = useHaloboardStore.getState();
      // Proje yoksa oluştur, varsa güncelleme (merge: true)
      await setDoc(projectRef, {
        objects: objects || [],
        layers: layers || [],
        canvasSettings: canvasSettings || {},
        lastUpdated: Date.now()
      }, { merge: true });
    }

    // İlk yükleme
    try {
      const docSnap = await getDoc(projectRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const store = useHaloboardStore.getState();
        if (data.objects && Array.isArray(data.objects)) {
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

    // Dinlemeye başla
    this.unsubscribe = onSnapshot(projectRef, (docSnapshot: DocumentSnapshot) => {
      if (!docSnapshot.exists()) return;

      const data = docSnapshot.data();
      if (!data) return;

      if (!this.initialLoadDone && data.objects && data.objects.length > 0) {
        const store = useHaloboardStore.getState();
        if (store.objects.length === 0) {
          store.loadProject({ objects: data.objects, layers: data.layers || [] });
          this.initialLoadDone = true;
        }
      }

      if (data.messages && Array.isArray(data.messages)) {
        data.messages.forEach((msg: any) => {
          if (msg.userId !== this.userId && msg.timestamp > Date.now() - 30000) {
            this.handleMessage(msg as BroadcastMessage);
          }
        });
      }
    });

    // Mesaj gönderme döngüsü
    setInterval(async () => {
      if (this.messageQueue.length > 0) {
        const messages = [...this.messageQueue];
        this.messageQueue = [];

        try {
          const messagesWithTimestamp = messages.map(msg => ({
            ...msg,
            timestamp: Date.now()
          }));

          const updateData: any = {
            lastUpdated: Date.now()
          };
          if (messagesWithTimestamp && messagesWithTimestamp.length > 0) {
            updateData.messages = messagesWithTimestamp;
          }
          await updateDoc(projectRef, updateData);
        } catch (error) {
          console.error("Failed to send messages to Firebase:", error);
          this.messageQueue.unshift(...messages);
        }
      }
    }, 100);
  }

  public saveProject(state: any) {
    if (!this.isOnline || !db || !auth?.currentUser) return;

    if (this.saveTimeout) clearTimeout(this.saveTimeout);

    // Debounce object sync to ~1s after commit (pointer up)
    this.saveTimeout = setTimeout(async () => {
      const projectRef = doc(db, "projects", this.projectId);
      try {
        const updateData: any = {
          lastUpdated: Date.now()
        };
        if (state.objects !== undefined) {
          updateData.objects = state.objects;
        }
        if (state.layers !== undefined) {
          updateData.layers = state.layers;
        }
        await updateDoc(projectRef, updateData);
      } catch (e) {
        console.error("Failed to save project state to Cloud:", e);
      }
    }, 1000); // Changed from 2000ms to 1000ms (~1s debounce)
  }

  private broadcastMessage(message: BroadcastMessage) {
    try {
      if (this.isOnline) {
        if (db && auth?.currentUser) {
          this.messageQueue.push(message)
        }
      } else {
        this.broadcastChannel?.postMessage(message)
      }
    } catch (e) {
      console.warn("Broadcast failed:", e)
    }
  }

  public broadcastCursor(position: Point) {
    const now = Date.now();
    // Throttle to exactly 30fps (~33ms) for real-time cursor sync
    if (now - this.lastCursorBroadcast < 33) return;
    this.lastCursorBroadcast = now;

    const { users, currentUserId, activeTool } = useHaloboardStore.getState()
    const me = users.find(u => u.id === currentUserId)
    if (!me) return

    useHaloboardStore.getState().updateUserCursor(this.userId, position, me.name, me.color)

    const msg: BroadcastMessage = {
      type: "CURSOR_UPDATE",
      userId: this.userId,
      name: me.name,
      color: me.color,
      x: position.x,
      y: position.y,
      tool: activeTool,
      timestamp: now
    }

    this.broadcastMessage(msg)
  }

  public broadcastObjectCommit(object: CanvasObject) {
    const msg: BroadcastMessage = { type: "OBJECT_COMMIT", object }
    this.broadcastMessage(msg)
  }

  public broadcastObjectDelete(objectId: string) {
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

  public broadcastHistoryNavigation(action: 'undo' | 'redo' | 'setIndex', index?: number) {
    const msg: BroadcastMessage = { type: "HISTORY_NAVIGATION", action, index }
    this.broadcastMessage(msg)
  }


  public broadcastKick(userId: string) {
    const msg: BroadcastMessage = { type: "USER_KICK", userId }
    this.broadcastMessage(msg)
  }

  public broadcastChat(content: string) {
    const msg: BroadcastMessage = { type: "CURSOR_CHAT", userId: this.userId, message: content, timestamp: Date.now() }
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

  public broadcastTextLive(objectId: string, content: string) {
    const msg: BroadcastMessage = { type: "TEXT_LIVE", objectId, content, timestamp: Date.now() }
    this.broadcastMessage(msg)
  }

  public broadcastTextCommit(object: CanvasObject) {
    const msg: BroadcastMessage = { type: "TEXT_COMMIT", object }
    this.broadcastMessage(msg)
  }

  public broadcastNoteCreate(object: CanvasObject) {
    const msg: BroadcastMessage = { type: "NOTE_CREATE", object }
    this.broadcastMessage(msg)
  }

  public broadcastTransformDelta(objectId: string, delta: any) {
    const msg: BroadcastMessage = { type: "OBJECT_TRANSFORM", objectId, delta, timestamp: Date.now() }
    this.broadcastMessage(msg)
  }

  public broadcastClipboardCopy(objectIds: string[]) {
    const msg: BroadcastMessage = { type: "CLIPBOARD_COPY", objectIds }
    this.broadcastMessage(msg)
  }

  public broadcastClipboardPaste(objects: CanvasObject[]) {
    const msg: BroadcastMessage = { type: "CLIPBOARD_PASTE", objects }
    this.broadcastMessage(msg)
  }

  public requestSnapshot() {
    const msg: BroadcastMessage = { type: "SNAPSHOT_REQUEST", userId: this.userId }
    this.broadcastMessage(msg)
  }

  private sendSnapshot(targetUserId: string) {
    const snapshot = getEditorRuntime().createSnapshot()
    const store = useHaloboardStore.getState()
    const { users, history } = store
    
    // Send full project state including users and history
    const msg: BroadcastMessage = {
      type: "SNAPSHOT_RESPONSE",
      objects: snapshot.objects,
      layers: snapshot.layers,
      timestamp: snapshot.timestamp,
      users: users, // Include users list
      history: history // Include history
    } as any
    this.broadcastMessage(msg)
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