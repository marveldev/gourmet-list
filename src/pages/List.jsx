import { useEffect, useState } from "react"
import { collection, onSnapshot } from "firebase/firestore"
import { db } from "../firebase"
import { useAuth } from "../../src/contexts/AuthContext"

const LIST_ID = "26v9Eo55lrspnYACTPZt"

export default function ShoppingList() {
	const { currentUser } = useAuth()
	const [items, setItems] = useState([])

	useEffect(() => {
		if (!currentUser) return // 🔥 THIS LINE FIXES IT

		const itemsRef = collection(db, "shoppingLists", LIST_ID, "items")

		console.log("🔥 DEBUG START")
		console.log("currentUser:", currentUser)
		console.log("currentUser.uid:", currentUser?.uid)
		console.log("LIST_ID:", LIST_ID)

		const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
			setItems(
				snapshot.docs.map((doc) => ({
					id: doc.id,
					...doc.data(),
				})),
			)
		})

		return unsubscribe
	}, [currentUser]) // 👈 re-run when auth becomes ready

	return (
		<ul>
			{items.map((item) => (
				<li key={item.id}>{item.name}</li>
			))}
		</ul>
	)
}
