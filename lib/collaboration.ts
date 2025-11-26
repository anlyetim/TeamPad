import type { CanvasObject, Point, BroadcastMessage, User, ChatMessage, Layer, HistoryStep } from "./types"
import { useHaloboardStore } from "./store"
import { doc, onSnapshot, updateDoc, setDoc, type DocumentSnapshot, getDoc } from "firebase/firestore"
import { signInAnonymously } from "firebase/auth"
import { db, auth } from "./firebaseConfig" // Yeni config dosyasından import ediyoruz

// Projenin var olup olmadığını kontrol eden yardımcı fonksiyon
export async function checkProjectExists(projectId: string): Promise<boolean> {
    if (!db || !projectId) {
        console.warn("Database connection not available or Project ID missing.");
        return false;
    }
    try {
        // Kontrol etmeden önce anonim giriş yapıldığından emin ol (Firestore kuralları için)
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
        // Online mod: Firebase kullan
        if (db && auth) {
          this.initFirebase();
        } else {
            console.error("Firebase not initialized properly check firebaseConfig.ts");
        }
        // Katılım olayını yayınla
        this.broadcastUserJoin();
        this.syncInterval = setInterval(() => {
          this.requestSync();
        }, 5000); 
      } else {
        // Offline mod: Sadece BroadcastChannel
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
    // Kendi mesajlarımızı işleme
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
        this.broadcastUserJoin()
        
        // Yeni gelen kullanıcının bizi görebilmesi için konumumuzu gönderelim
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
          const currentProjectId = useHaloboardStore.getState().currentProjectId
          const setStore = useHaloboardStore.setState
          if (currentProjectId) {
            setStore((state) => ({
                kickedProjectIds: [...(state.kickedProjectIds || []), currentProjectId],
                projects: state.projects.filter(p => p.id !== currentProjectId)
            }))
          }
          useHaloboardStore.setState({ activeView: "dashboard", currentProjectId: null })
          if (currentProjectId) {
            const store = useHaloboardStore.getState()
            store.deleteProject(currentProjectId)
          }
          useHaloboardStore.getState().resetProject()
          this.disconnect()
        } else {
          store.removeUser(message.userId)
        }
        break
      case "SYNC_REQUEST":
        if (message.userId !== this.userId) {
          const { objects, layers } = useHaloboardStore.getState()
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
        if (message.userId !== this.userId) {
          const store = useHaloboardStore.getState()
          if (store.objects.length === 0 && message.objects.length > 0) {
            store.loadProject({ objects: message.objects, layers: message.layers })
          } else if (message.objects.length > store.objects.length) {
            store.loadProject({ objects: message.objects, layers: message.layers })
          }
          
          if (message.users) {
            message.users.forEach(user => {
              if (!store.users.find(u => u.id === user.id)) {
                store.addUser(user)
              }
            })
          }
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

     // Eğer projeyi oluşturan kişiysek (Owner), veritabanında kaydın oluştuğundan emin olalım.
     if (useHaloboardStore.getState().isOwner) {
         const { objects, layers, canvasSettings } = useHaloboardStore.getState();
         await setDoc(projectRef, {
             objects: objects || [],
             layers: layers || [],
             canvasSettings: canvasSettings || {},
             lastUpdated: Date.now()
         }, { merge: true });
     }

     // İlk bağlantıda mevcut veriyi çekmeyi dene
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

     // Gerçek zamanlı güncellemeleri dinle
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
                 // 30 saniye tolerans
                 if (msg.userId !== this.userId && msg.timestamp > Date.now() - 30000) { 
                     this.handleMessage(msg as BroadcastMessage);
                 }
             });
         }
     });

     // Mesaj kuyruğunu periyodik olarak gönder
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