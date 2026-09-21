// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDSexUJoLYPFzEIJXGc0cNHmZBTfgrb8Bw",
  authDomain: "vionex-ai-e0499.firebaseapp.com",
  projectId: "vionex-ai-e0499",
  storageBucket: "vionex-ai-e0499.firebasestorage.app",
  messagingSenderId: "558647929257",
  appId: "1:558647929257:web:a6786331c32ee3a61b3cb8"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM] Background Message Received:', payload);
  const notificationTitle = payload.notification.title || 'New Message';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new notification',
    icon: '/favicon.ico', // Adjust path if needed
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

