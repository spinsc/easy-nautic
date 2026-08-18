import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
}

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string

const firebaseApp = initializeApp(firebaseConfig)

let messagingPromise: Promise<Messaging | null> | null = null

function getMessagingInstance(): Promise<Messaging | null> {
  if (!messagingPromise) {
    messagingPromise = isSupported().then((suportado) => (suportado ? getMessaging(firebaseApp) : null))
  }
  return messagingPromise
}

export async function solicitarTokenPush(): Promise<string | null> {
  const messaging = await getMessagingInstance()
  if (!messaging) {
    throw new Error('Este navegador não suporta notificações push.')
  }

  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') {
    throw new Error('Permissão de notificações negada.')
  }

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
  return token || null
}
