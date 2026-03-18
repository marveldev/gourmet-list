// SharedListItems.jsx
import React, { useEffect, useState } from "react"
import {
	collection,
	query,
	where,
	getDocs,
	getDoc,
	doc,
	updateDoc,
	deleteDoc,
	writeBatch,
} from "firebase/firestore"
import { Trash2, Check, X } from "lucide-react"
import clsx from "clsx"
import { db } from "../firebase"
import { useAuth } from "../contexts/AuthContext"

export default function SharedListItems() {
	const { currentUser } = useAuth()

	const [items, setItems] = useState([])
	const [userMap, setUserMap] = useState({})
	const [loading, setLoading] = useState(true)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [deletingItem, setDeletingItem] = useState(null)
	const [isMoving, setIsMoving] = useState(false)

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
					const ownerId = listId

					if (ownerId) ownerIds.add(ownerId)

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
			const itemRef = doc(db, "shoppingLists", item.listId, "items", item.id)

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

	// copy all shared items into the current user's personal list
	const moveAllToMyList = async () => {
		if (!currentUser) return
		setIsMoving(true)
		try {
			// fetch existing item names from user's list to avoid duplicates
			const destSnap = await getDocs(
				collection(db, "shoppingLists", currentUser.uid, "items"),
			)
			const existingNames = new Set(destSnap.docs.map((d) => d.data().name))

			const batch = writeBatch(db)
			items.forEach((item) => {
				if (!existingNames.has(item.name)) {
					const newRef = doc(
						collection(db, "shoppingLists", currentUser.uid, "items"),
					)
					batch.set(newRef, {
						name: item.name,
						completed: item.completed || false,
					})
				}
			})
			await batch.commit()
		} catch (err) {
			console.error("Failed to move shared items:", err)
		} finally {
			setIsMoving(false)
		}
	}

	const openDeleteModalShared = (item) => {
		// prevent outside click toggling completion
		setDeletingItem(item)
		setIsDeleteModalOpen(true)
	}

	const deleteSharedItem = async () => {
		if (!deletingItem) return
		try {
			const itemRef = doc(
				db,
				"shoppingLists",
				deletingItem.listId,
				"items",
				deletingItem.id,
			)
			await deleteDoc(itemRef)
			setItems((prev) =>
				prev.filter(
					(i) =>
						!(i.id === deletingItem.id && i.ownerId === deletingItem.ownerId),
				),
			)
			setIsDeleteModalOpen(false)
			setDeletingItem(null)
		} catch (err) {
			console.error("Failed to delete shared item:", err)
		}
	}

	return (
		<>
			<div className="space-y-2 mb-4">
				{items.map((item) => (
					<div key={item.id} className="relative overflow-hidden">
						{/* Item */}
						<div
							onClick={() => toggleSharedItem(item)}
							className={clsx(
								"group flex items-center gap-3 p-3 py-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer",
								item.completed && "opacity-60 bg-gray-50 dark:bg-gray-800/50",
							)}>
							<div
								className={clsx(
									"w-5 h-5 border-2 rounded flex items-center justify-center transition-all",
									item.completed
										? "bg-accent-600 border-accent-600"
										: "border-gray-300",
								)}>
								{item.completed && <Check className="w-4 h-4 text-white" />}
							</div>
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
								onClick={(e) => {
									e.stopPropagation()
									openDeleteModalShared(item)
								}}
								className="p-2 text-red-500 hover:text-red-600 transition-colors">
								<Trash2 className="w-4 h-4" />
							</button>
						</div>
					</div>
				))}

				{/* Delete Confirmation Modal */}
				{isDeleteModalOpen && deletingItem && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
						<div
							className="absolute inset-0 bg-black/40 backdrop-blur-sm"
							onClick={() => {
								setIsDeleteModalOpen(false)
								setDeletingItem(null)
							}}></div>
						<div className="relative bg-[#fff] dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-600 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in-up">
							<div className="flex items-center justify-between mb-6">
								<div>
									<h2 className="text-lg font-bold text-gray-900 dark:text-white">
										Delete Item
									</h2>
									<p className="text-sm text-gray-500 dark:text-gray-400">
										Are you sure you want to delete this item?
									</p>
								</div>
								<button
									onClick={() => {
										setIsDeleteModalOpen(false)
										setDeletingItem(null)
									}}
									className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
									<X className="w-5 h-5 dark:text-white" />
								</button>
							</div>

							<div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
								<p className="text-sm font-medium text-gray-800 dark:text-gray-200">
									"{deletingItem.name}"
								</p>
							</div>

							<div className="flex justify-end gap-2">
								<button
									type="button"
									onClick={() => {
										setIsDeleteModalOpen(false)
										setDeletingItem(null)
									}}
									className="px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900">
									Cancel
								</button>
								<button
									type="button"
									onClick={deleteSharedItem}
									className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-lg transition-colors">
									Confirm Delete
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			<div className="flex justify-end">
				<button
					onClick={moveAllToMyList}
					disabled={isMoving}
					className="px-4 py-2 bg-accent-500 text-white rounded-lg disabled:opacity-50">
					{isMoving ? "Moving…" : "Move All To My List"}
				</button>
			</div>
		</>
	)
}
