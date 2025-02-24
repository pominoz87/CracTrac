// firebase.js

// Paste your Firebase configuration details below
const firebaseConfig = {
  apiKey: "AIzaSyCeZ-Fzpswh-d8lGmgPex3SvS6sSC9vH6Q",
  authDomain: "cractrac-3629a.firebaseapp.com",
  projectId: "cractrac-3629a",
  storageBucket: "cractrac-3629a.firebasestorage.app",
  messagingSenderId: "603257438362",
  appId: "1:603257438362:web:ee551d7ff493c32165df23"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get a reference to Firestore
const dbFirestore = firebase.firestore();

// Optional: Set up offline persistence for Firestore if desired
dbFirestore.enablePersistence()
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.error("Multiple tabs open, persistence can only be enabled in one tab at a a time.");
    } else if (err.code == 'unimplemented') {
      console.error("The current browser does not support all of the features required to enable persistence");
    }
  });
