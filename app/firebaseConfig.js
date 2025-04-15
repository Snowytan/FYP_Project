import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: "API KEY",
  authDomain: "a3194-241.firebaseapp.com",
  projectId: "a3194-241",
  storageBucket: "a3194-241.appspot.com",
  messagingSenderId: "36217556061",
  appId: "1:36217556061:web:e191fd87d697d46a7551b4",
  measurementId: "G-X18N5KYMTY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export { app };
