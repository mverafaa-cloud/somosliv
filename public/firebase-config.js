// Config PÚBLICA de Firebase (no es secreta — puede ir en el repo).
// Proyecto real: SOMOSLIV.
// La seguridad la dan las reglas de Firestore (firestore.rules), no esta config.
window.__FIREBASE_CONFIG__ = {
  apiKey: "AIzaSyBNEKWdYynkdvdAswyBK01LnnKGJ2cSils",
  authDomain: "somosliv.firebaseapp.com",
  projectId: "somosliv",
  storageBucket: "somosliv.firebasestorage.app",
  messagingSenderId: "523984792935",
  appId: "1:523984792935:web:2ea037b2ad6fa0569013c2",
  measurementId: "G-F3EGSCPGJF"
};

// UIDs con permiso de administrador (panel completo).
// Cualquier otra cuenta autenticada entra como PLANILLERO (solo resultados y disciplina).
window.__ADMIN_UIDS__ = [
  "QltrN298mHMeAw04K3dZb5SJ7I33"   // Max (admin)
];
