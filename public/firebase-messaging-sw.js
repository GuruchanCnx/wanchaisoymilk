// Firebase Messaging Service Worker for WanJai Soy Milk
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: 'seismic-shell-6f6jr',
  appId: '1:491688574409:web:872c246cd6755a7397fc18',
  apiKey: 'AIzaSyAw8rXEYUygVT0jQV7zr6cbcjjbpJBSwL4',
  authDomain: 'seismic-shell-6f6jr.firebaseapp.com',
  messagingSenderId: '491688574409',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  const notificationTitle = payload.notification?.title || 'น้ำเต้าหู้ของคุณพร้อมรับแล้ว! 🌿';
  const notificationOptions = {
    body: payload.notification?.body || 'ออเดอร์ต้มสดร้อนๆ พร้อมส่งมอบแล้วที่ร้านวันใจ Soy ถนนวัวลาย',
    icon: '/images/soy-milk.jpg',
    badge: '/images/soy-milk.jpg',
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
