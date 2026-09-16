/* Substitua os valores abaixo pelos dados do seu projeto Firebase.
   O firebaseConfig não é um segredo; as regras do Firestore e Authentication protegem os dados. */
const firebaseConfig = {
  apiKey: 'COLOQUE_SUA_API_KEY',
  authDomain: 'SEU-PROJETO.firebaseapp.com',
  projectId: 'SEU-PROJETO',
  storageBucket: 'SEU-PROJETO.firebasestorage.app',
  messagingSenderId: 'COLOQUE_SEU_SENDER_ID',
  appId: 'COLOQUE_SEU_APP_ID'
};

window.clyptoFirebaseReady = false;
try {
  if (!firebaseConfig.apiKey.startsWith('COLOQUE_')) {
    firebase.initializeApp(firebaseConfig);
    window.clyptoFirebaseReady = true;
  }
} catch (e) { console.warn('Firebase não configurado', e); }

window.clyptoGetToken = async function () {
  if (!window.clyptoFirebaseReady) return null;
  const auth = firebase.auth();
  if (!auth.currentUser) await auth.signInAnonymously();
  return auth.currentUser.getIdToken();
};

const analyticsScript = document.createElement('script');
analyticsScript.src = 'js/analytics.js';
analyticsScript.defer = true;
document.head.appendChild(analyticsScript);
