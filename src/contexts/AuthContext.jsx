import React, { createContext, useContext, useEffect, useState } from "react"
import { auth, db } from "../firebase"
import {
	onAuthStateChanged,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signOut,
	GoogleAuthProvider,
	signInWithPopup,
	sendPasswordResetEmail,
} from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

const AuthContext = createContext()

export function useAuth() {
	return useContext(AuthContext)
}

export function AuthProvider({ children }) {
	const [currentUser, setCurrentUser] = useState(null)
	const [loading, setLoading] = useState(true)

	// Create / update Firestore user profile
	useEffect(() => {
		if (!currentUser?.email) return

		const createUserProfile = async () => {
			try {
				await setDoc(
					doc(db, "users", currentUser.uid),
					{
						uid: currentUser.uid,
						email: currentUser.email.toLowerCase(),
						provider: currentUser.providerData?.[0]?.providerId || "password",
						updatedAt: serverTimestamp(),
					},
					{ merge: true },
				)
			} catch (err) {
				console.error("Failed to create user profile:", err)
			}
		}

		createUserProfile()
	}, [currentUser])

	function signup(email, password) {
		return createUserWithEmailAndPassword(auth, email, password)
	}

	function login(email, password) {
		return signInWithEmailAndPassword(auth, email, password)
	}

	function logout() {
		return signOut(auth)
	}

	function resetPassword(email) {
		return sendPasswordResetEmail(auth, email)
	}

	function googleSignIn() {
		const provider = new GoogleAuthProvider()
		return signInWithPopup(auth, provider)
	}

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			setCurrentUser(user)
			setLoading(false)
		})

		return unsubscribe
	}, [])

	const value = {
		currentUser,
		signup,
		login,
		logout,
		resetPassword,
		googleSignIn,
	}

	return (
		<AuthContext.Provider value={value}>
			{!loading && children}
		</AuthContext.Provider>
	)
}
