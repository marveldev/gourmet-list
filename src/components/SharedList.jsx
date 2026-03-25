import React, { useEffect, useState } from "react"
import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	onSnapshot,
	query,
	updateDoc,
	where,
} from "firebase/firestore"
import { Check, Plus, Trash2 } from "lucide-react"
import clsx from "clsx"
import { db } from "../firebase"
import { useAuth } from "../contexts/AuthContext"
import { leaveSharedList } from "../services/list.services"

export default function SharedList({ showToast, onInvite, onSelectList }) {
	const { currentUser } = useAuth()
	const [sharedLists, setSharedLists] = useState([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (!currentUser?.uid) {
			setSharedLists([])
			setLoading(false)
			return
		}

		const itemUnsubscribers = new Map()
		let isMounted = true

		const sharedListsQuery = query(
			collection(db, "sharedLists"),
			where("members", "array-contains", currentUser.uid),
		)

		const unsubscribe = onSnapshot(sharedListsQuery, async (snapshot) => {
			const listDocs = snapshot.docs
			const nextListIds = new Set(listDocs.map((listDoc) => listDoc.id))

			// ✅ CLEAN UP OLD LISTENERS
			itemUnsubscribers.forEach((unsubscribe, id) => {
				if (!nextListIds.has(id)) {
					unsubscribe()
					itemUnsubscribers.delete(id)
				}
			})

			const nextLists = await Promise.all(
				listDocs.map(async (listDoc) => {
					const data = listDoc.data()
					const memberIds = [...new Set(data.members || [])]
					const members = await Promise.all(
						memberIds.map(async (uid) => {
							if (uid === currentUser.uid) {
								return {
									uid,
									email: currentUser.email?.toLowerCase() || "You",
								}
							}

							const userSnapshot = await getDoc(doc(db, "users", uid))
							return {
								uid,
								email: userSnapshot.exists()
									? userSnapshot.data().email
									: "Unknown member",
							}
						}),
					)

					return {
						id: listDoc.id,
						ownerId: data.ownerId,
						ownerEmail: data.ownerEmail || "Unknown owner",
						members,
						items:
							sharedLists.find((existingList) => existingList.id === listDoc.id)
								?.items || [],
					}
				}),
			)

			if (!isMounted) return

			setSharedLists(nextLists)
			setLoading(false)

			listDocs.forEach((listDoc) => {
				if (itemUnsubscribers.has(listDoc.id)) return

				const stopListeningToItems = onSnapshot(
					collection(db, "sharedLists", listDoc.id, "items"),
					(itemsSnapshot) => {
						const items = itemsSnapshot.docs.map((itemDoc) => ({
							id: itemDoc.id,
							...itemDoc.data(),
						}))

						setSharedLists((prev) =>
							prev.map((list) =>
								list.id === listDoc.id ? { ...list, items } : list,
							),
						)
					},
				)

				itemUnsubscribers.set(listDoc.id, stopListeningToItems)
			})
		})

		return () => {
			isMounted = false
			unsubscribe()
			itemUnsubscribers.forEach((stopListening) => stopListening())
		}
	}, [currentUser])

	const toggleSharedItem = async (listId, item) => {
		try {
			await updateDoc(doc(db, "sharedLists", listId, "items", item.id), {
				completed: !item.completed,
			})
		} catch (err) {
			console.error("Failed to toggle shared item:", err)
			showToast?.("Unable to update shared item")
		}
	}

	const deleteSharedItem = async (listId, itemId) => {
		try {
			await deleteDoc(doc(db, "shoppingLists", listId, "items", itemId))
		} catch (err) {
			console.error("Failed to delete shared item:", err)
			showToast?.("Unable to delete shared item")
		}
	}

	const handleLeaveList = async (listId) => {
		try {
			await leaveSharedList(listId, currentUser)
			showToast?.("You left the list")
		} catch (err) {
			console.error(err)
			showToast?.("Unable to leave list")
		}
	}

	if (loading) {
		return (
			<div className="space-y-6 py-12 text-center">
				<div>
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
						<Plus className="h-6 w-6 text-gray-400" />
					</div>
					<h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
						Shared with you
					</h2>
					<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
						Loading shared lists…
					</p>
				</div>
			</div>
		)
	}

	if (sharedLists.length === 0) {
		return (
			<div className="space-y-6 py-12 text-center">
				<div>
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
						<Plus className="h-6 w-6 text-gray-400" />
					</div>
					<h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
						Shared with you
					</h2>
					<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
						You have no shared lists yet.
					</p>
				</div>

				<div className="flex justify-center">
					<button
						type="button"
						onClick={onInvite}
						className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700">
						Invite someone
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-lg font-bold text-gray-900 dark:text-white">
					Shared with you
				</h2>
				<p className="text-sm text-gray-500 dark:text-gray-400">
					Collaborate on lists in real time.
				</p>
			</div>

			{sharedLists.map((list) => (
				<div
					key={list.id}
					onClick={() => onSelectList?.(list.id)}
					className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
					<div className="mb-4">
						<h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
							Collaborators
						</h3>
						<ul className="space-y-1">
							{list.members.map((member) => (
								<li
									key={member.uid}
									className="text-sm text-gray-700 dark:text-gray-200">
									{member.email}
									{member.uid === currentUser.uid &&
										list.ownerId === currentUser.uid && (
											<span className="ml-2 text-xs text-accent-600 font-medium">
												(you · owner)
											</span>
										)}
								</li>
							))}
						</ul>
						{list.ownerId !== currentUser.uid && (
							<button
								onClick={(e) => {
									e.stopPropagation()
									handleLeaveList(list.id)
								}}
								className="mt-2 text-sm text-red-500 hover:text-red-600 font-medium">
								Leave List
							</button>
						)}
					</div>

					<div className="space-y-2">
						{list.items.length === 0 ? (
							<p className="rounded-xl bg-gray-50 px-4 py-4 text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
								No items in this shared list yet.
							</p>
						) : (
							list.items.map((item) => (
								<div
									key={item.id}
									onClick={() => toggleSharedItem(list.id, item)}
									className={clsx(
										"flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 transition-all hover:shadow-sm dark:border-gray-700 dark:bg-gray-900",
										item.completed && "opacity-60",
									)}>
									<div
										className={clsx(
											"flex h-5 w-5 items-center justify-center rounded border-2",
											item.completed
												? "border-accent-600 bg-accent-600"
												: "border-gray-300",
										)}>
										{item.completed && <Check className="h-4 w-4 text-white" />}
									</div>
									<div className="flex-1">
										<p
											className={clsx(
												"font-medium text-gray-800 dark:text-gray-100",
												item.completed && "line-through text-gray-400",
											)}>
											{item.name}
										</p>
										{item.createdByEmail && (
											<p className="text-xs text-gray-500 dark:text-gray-400">
												Added by {item.createdByEmail}
											</p>
										)}
									</div>
									<button
										onClick={(e) => {
											e.stopPropagation()
											deleteSharedItem(list.id, item.id)
										}}
										className="p-2 text-red-500 hover:text-red-600">
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
							))
						)}
					</div>
				</div>
			))}

			<div className="flex justify-center">
				<button
					type="button"
					onClick={onInvite}
					className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700">
					Invite someone
				</button>
			</div>
		</div>
	)
}
