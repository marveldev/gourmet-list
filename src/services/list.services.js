import { collection, onSnapshot } from "firebase/firestore"
import { db } from "../firebase"
import { auth } from "../firebase"

export function listenToItems(listId, callback) {
	return onSnapshot(
		collection(db, "shoppingLists", listId, "items"),
		(snapshot) => {
			const items = snapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}))
			callback(items)
		},
	)
}

import { addDoc } from "firebase/firestore"

export async function addItem(listId, name, quantity) {
	await addDoc(collection(db, "shoppingLists", listId, "items"), {
		name,
		checked: false,
	})
}

import { doc, updateDoc } from "firebase/firestore"

export async function toggleItem(listId, itemId, checked) {
	await updateDoc(doc(db, "shoppingLists", listId, "items", itemId), {
		checked,
	})
}
