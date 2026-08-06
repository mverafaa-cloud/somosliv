// Config PÚBLICA de Firebase (no es secreta — puede ir en el repo).
// Reemplazar estos valores por los del proyecto real:
//   Firebase Console → Project settings → General → Your apps → SDK setup and configuration
//
// Mientras estos valores sean los placeholder ("REEMPLAZAR"), la web funciona
// en modo demo (usa datos de ejemplo locales) y NO intenta conectarse a Firebase.
window.__FIREBASE_CONFIG__ = {
  apiKey: "REEMPLAZAR",
  authDomain: "REEMPLAZAR.firebaseapp.com",
  projectId: "REEMPLAZAR",
  storageBucket: "REEMPLAZAR.appspot.com",
  messagingSenderId: "REEMPLAZAR",
  appId: "REEMPLAZAR"
};

// UIDs con permiso de administrador. Se completan después de crear los usuarios
// admin en Firebase Auth (Console → Authentication → Users → copiar el UID).
// También se valida en firestore.rules; esto es solo para mostrar/ocultar UI.
window.__ADMIN_UIDS__ = [
  // "pega-aqui-el-uid-de-max",
];
