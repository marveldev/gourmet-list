// SharedListItems.jsx
import React, { useEffect, useState } from "react"
import {
	collection,
	query,
	where,
	getDocs,
	doc,
	getDoc,
	updateDoc,
	deleteDoc,
} from "firebase/firestore"
import { Trash2, Check } from "lucide-react"
import clsx from "clsx"
import { db } from "../firebase"
import { useAuth } from "../contexts/AuthContext"

export default function SharedListItems({
	filter,
	draggedItemId,
	handleDragStart,
	handleDragOver,
	handleDrop,
	handleDragEnd,
	toggleItem,
	deleteItem,
}) {
	const { currentUser } = useAuth()

	const [items, setItems] = useState([])
	const [userMap, setUserMap] = useState({})
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (!currentUser) return

		const fetchSharedItems = async () => {
			try {
				setLoading(true)

				// 1️⃣ Find lists shared with current user
				const sharedListsQuery = query(
					collection(db, "shoppingLists"),
					where("sharedWith", "array-contains", currentUser.uid),
				)

				const listsSnapshot = await getDocs(sharedListsQuery)

				const allItems = []
				const ownerIds = new Set()

				// 2️⃣ Fetch items for each shared list
				for (const listDoc of listsSnapshot.docs) {
					const listId = listDoc.id
					const ownerId = listDoc.data().ownerId

					ownerIds.add(ownerId)

					const itemsSnap = await getDocs(
						collection(db, "shoppingLists", listId, "items"),
					)

					itemsSnap.forEach((itemDoc) => {
						allItems.push({
							id: itemDoc.id,
							...itemDoc.data(),
							listId,
							ownerId,
						})
					})
				}

				// 3️⃣ Resolve owner emails (cached)
				const userEntries = await Promise.all(
					[...ownerIds].map(async (uid) => {
						const snap = await getDoc(doc(db, "users", uid))
						return snap.exists()
							? [uid, snap.data().email]
							: [uid, "Unknown user"]
					}),
				)

				setUserMap(Object.fromEntries(userEntries))
				setItems(allItems)
			} catch (err) {
				console.error("Failed to fetch shared items:", err)
			} finally {
				setLoading(false)
			}
		}

		fetchSharedItems()
	}, [currentUser])

	// ─────────────────────────────────────

	if (loading) {
		return (
			<div className="p-4 text-center text-gray-500 dark:text-gray-400">
				Loading shared items…
			</div>
		)
	}

	if (items.length === 0) {
		return (
			<div className="p-4 text-center text-gray-500 dark:text-gray-400">
				No items have been shared with you.
			</div>
		)
	}

	const toggleSharedItem = async (item) => {
		try {
			const itemRef = doc(db, "shoppingLists", item.ownerId, "items", item.id)

			await updateDoc(itemRef, {
				completed: !item.completed,
			})

			// update local state so UI reacts instantly
			setItems((prev) =>
				prev.map((i) =>
					i.id === item.id && i.ownerId === item.ownerId
						? { ...i, completed: !i.completed }
						: i,
				),
			)
		} catch (err) {
			console.error("Failed to toggle shared item:", err)
		}
	}

	const deleteSharedItem = async (item) => {
		try {
			const itemRef = doc(db, "shoppingLists", item.ownerId, "items", item.id)

			await deleteDoc(itemRef)

			setItems((prev) =>
				prev.filter((i) => !(i.id === item.id && i.ownerId === item.ownerId)),
			)
		} catch (err) {
			console.error("Failed to delete shared item:", err)
		}
	}

	return (
		<div className="space-y-2">
			{items.map((item) => {
				const isOwner = item.ownerId === currentUser.uid

				return (
					<div
						key={item.id}
						draggable={false}
						onDragStart={(e) => handleDragStart(e, item.id)}
						onDragOver={handleDragOver}
						onDrop={(e) => handleDrop(e, item.id)}
						onDragEnd={handleDragEnd}
						className={clsx(
							"group flex items-center gap-3 p-3 py-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all",
							filter === "all" && "cursor-move",
							item.completed && "opacity-60 bg-gray-50 dark:bg-gray-800/50",
							draggedItemId === item.id && "opacity-50",
						)}>
						<label className="relative flex items-center justify-center cursor-pointer p-1">
							<input
								type="checkbox"
								className="peer sr-only item-checkbox"
								checked={item.completed}
								onChange={() => toggleSharedItem(item)}
							/>
							<div
								className={clsx(
									"w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
									item.completed
										? "bg-accent-600 border-accent-600"
										: "border-gray-300 dark:border-gray-600 hover:border-accent-500",
								)}>
								{item.completed && (
									<Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
								)}
							</div>
						</label>
						<span
							className={clsx(
								"flex-grow font-medium transition-all",
								item.completed
									? "line-through text-gray-400"
									: "text-gray-700 dark:text-gray-200",
							)}>
							{item.name}
						</span>
						<span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
							(from{" "}
							{item.ownerId === currentUser.uid
								? "You"
								: userMap[item.ownerId] || "Loading…"}
							)
						</span>
						<button
							onClick={() => deleteSharedItem(item)}
							className={clsx(
								"p-1.5 rounded-lg transition-all",
								isOwner
									? "opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
									: "opacity-30 cursor-not-allowed",
							)}>
							<Trash2 className="w-4 h-4" />
						</button>
					</div>
				)
			})}
		</div>
	)
}
