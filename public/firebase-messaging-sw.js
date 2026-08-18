importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyA9PkzG9y5t67rW9KCbPD3fil_oZLVCMDk',
  authDomain: 'easy-nautic.firebaseapp.com',
  projectId: 'easy-nautic',
  storageBucket: 'easy-nautic.firebasestorage.app',
  messagingSenderId: '1078844087004',
  appId: '1:1078844087004:web:6e632361f77eb5462c7219',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}
  self.registration.showNotification(title || 'Easy Nautic', {
    body: body || '',
    icon: '/favicon.svg',
  })
})
