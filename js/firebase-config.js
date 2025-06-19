// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCp1B4T55SHNIzBCO6ogex_fswdPy-RSuo",
    authDomain: "leave-d67b7.firebaseapp.com",
    projectId: "leave-d67b7",
    storageBucket: "leave-d67b7.firebasestorage.app",
    messagingSenderId: "329360140575",
    appId: "1:329360140575:web:77f1041f70637f637f282a",
    measurementId: "G-1H0Y6B5Z2G"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();
const storage = firebase.storage();

// Enable offline persistence
try {
    db.enablePersistence({
        synchronizeTabs: true
    }).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.warn('The current browser does not support all of the features required to enable persistence');
        } else {
            console.warn('Persistence error:', err);
        }
    });
} catch (err) {
    console.warn('Persistence setup error:', err);
}

// Export for use in other modules
window.db = db;
window.storage = storage;
