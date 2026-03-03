import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import {
	initializeFirestore,
	persistentLocalCache,
	persistentMultipleTabManager,
} from "firebase/firestore"

const firebaseConfig = {
	apiKey: "AIzaSyClLVASspm4_r26aB1XLS4r5Wtd_ncHlVQ",
	authDomain: "basket-auth.firebaseapp.com",
	projectId: "basket-auth",
	storageBucket: "basket-auth.firebasestorage.app",
	messagingSenderId: "522741772466",
	appId: "1:522741772466:web:a4e0f41f779e19bd3d59ab",
}

const app = initializeApp(firebaseConfig)

// 🔥 Enable offline persistence
export const db = initializeFirestore(app, {
	localCache: persistentLocalCache({
		tabManager: persistentMultipleTabManager(),
	}),
})

const auth = getAuth(app)
export { auth }
