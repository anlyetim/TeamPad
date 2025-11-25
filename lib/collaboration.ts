import type { CanvasObject, Point, BroadcastMessage, User, ChatMessage } from "./types"
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

  constructor(projectId: string, userId: string) {
    this.projectId = projectId
    this.userId = userId
    
    if (typeof window !== 'undefined') {
        // 1. Init BroadcastChannel for Local/Same-PC Sync (Instant)
        this.broadcastChannel = new BroadcastChannel(`teampad-${projectId}`)
        this.broadcastChannel.onmessage = (event) => {
            this.handleMessage(event.data as BroadcastMessage)
        }

        // 2. Init Firebase for Remote Sync (If configured)
        if (db && auth) {
            this.initFirebase()
        }
    }
  }

  private handleMessage(message: BroadcastMessage) {
    // Don't process own messages
    if ('userId' in message && message.userId === this.userId) return

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
      case "CHAT_MESSAGE":
        store.addChatMessage(message.message, true)
        break
      case "USER_JOIN":
        store.addUser(message.user)
        break
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

  public broadcastChat(message: ChatMessage) {
     const msg: BroadcastMessage = { type: "CHAT_MESSAGE", message }
     this.broadcastChannel?.postMessage(msg)
  }

  public disconnect() {
    if (this.unsubscribe) this.unsubscribe();
    this.broadcastChannel?.close();
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