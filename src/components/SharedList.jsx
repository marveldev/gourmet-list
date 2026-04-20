import React, { useEffect, useRef, useState } from "react"
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
import { Check, Edit, MoreHorizontal, Plus, Trash2 } from "lucide-react"
import clsx from "clsx"
import { db } from "../firebase"
import { useAuth } from "../contexts/AuthContext"
import { deleteSharedList, leaveSharedList } from "../services/list.services"

export default function SharedList({
	showToast,
	onInvite,
	onSelectList,
	onDeleteList,
	selectedListId,
}) {
	const { currentUser } = useAuth()
	const [sharedLists, setSharedLists] = useState([])
	const [loading, setLoading] = useState(true)
	const [confirmDeleteId, setConfirmDeleteId] = useState(null)
	const [actionMenuListId, setActionMenuListId] = useState(null)
	const [swipedItemKey, setSwipedItemKey] = useState(null)
	const itemUnsubscribersRef = useRef(new Map())

	useEffect(() => {
		if (!currentUser?.uid) {
			setSharedLists([])
			setLoading(false)
			return
		}

		const itemUnsubscribers = itemUnsubscribersRef.current
		let isMounted = true

		const sharedListsQuery = query(
			collection(db, "sharedLists"),
			where("members", "array-contains", currentUser.uid),
		)

		const unsubscribe = onSnapshot(
			sharedListsQuery,
			async (snapshot) => {
				const listDocs = snapshot.docs
				const nextListIds = new Set(listDocs.map((listDoc) => listDoc.id))

				// ✅ CLEAN UP OLD LISTENERS
				itemUnsubscribers.forEach((unsub, id) => {
					if (!nextListIds.has(id)) {
						unsub()
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
								sharedLists.find(
									(existingList) => existingList.id === listDoc.id,
								)?.items || [],
						}
					}),
				)

				if (!isMounted) return

				setSharedLists(nextLists)
				setLoading(false)

				listDocs.forEach((listDoc) => {
					if (itemUnsubscribers.has(listDoc.id)) return

					if (!listDoc.exists()) return

					const data = listDoc.data()

					if (!data.members?.includes(currentUser.uid)) return

					// 🔥 DEFER listener (avoids race condition)
					setTimeout(() => {
						try {
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
								(err) => {
									if (itemUnsubscribers.has(listDoc.id)) {
										itemUnsubscribers.get(listDoc.id)()
										itemUnsubscribers.delete(listDoc.id)
									}
								},
							)

							itemUnsubscribers.set(listDoc.id, stopListeningToItems)
						} catch (err) {
							console.error("Listener setup failed:", err)
						}
					}, 0)
				})
			},
			(err) => {
				console.error("Shared lists listener error:", err)
				if (isMounted) {
					setSharedLists([])
					setLoading(false)
				}
			},
		)

		return () => {
			isMounted = false
			unsubscribe()
			itemUnsubscribersRef.current.forEach((stopListening) => stopListening())
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
			setSwipedItemKey(null)
		} catch (err) {
			console.error("Failed to delete shared item:", err)
			showToast?.("Unable to delete shared item")
		}
	}

	const editSharedItem = async (listId, item) => {
		const nextName = window.prompt("Edit item", item.name)
		if (!nextName) return

		const value = nextName.trim()
		if (!value || value === item.name) {
			setSwipedItemKey(null)
			return
		}

		try {
			await updateDoc(doc(db, "sharedLists", listId, "items", item.id), {
				name: value,
			})
			setSwipedItemKey(null)
			showToast?.("Item updated")
		} catch (err) {
			console.error("Failed to edit shared item:", err)
			showToast?.("Unable to update shared item")
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

	const handleDeleteList = async (e, listId) => {
		e.stopPropagation()
		// Unsubscribe from this list's items listener BEFORE deleting
		const unsubItems = itemUnsubscribersRef.current.get(listId)
		if (unsubItems) {
			unsubItems()
			itemUnsubscribersRef.current.delete(listId)
		}
		// Tell parent to reset active state (detaches ShoppingList items listener)
		onDeleteList?.(listId)
		try {
			await deleteSharedList(listId, currentUser)
			showToast?.("List deleted")
		} catch (err) {
			console.error("Failed to delete list:", err)
			showToast?.("Unable to delete list")
		} finally {
			setConfirmDeleteId(null)
			setActionMenuListId(null)
		}
	}

	const getInitials = (value) => {
		if (!value) return "?"

		const clean = value
			.replace(/@.*$/, "")
			.replace(/[^a-zA-Z0-9\s]/g, " ")
			.trim()

		if (!clean) return "?"

		const parts = clean.split(/\s+/).filter(Boolean)
		if (parts.length === 1) {
			return parts[0].slice(0, 2).toUpperCase()
		}

		return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase()
	}

	const getMemberLabel = (member) => {
		if (member.uid === currentUser?.uid) return "You"
		if (!member.email) return "Member"
		return member.email.split("@")[0]
	}

	const getItemCreatorLabel = (item) => {
		const currentEmail = currentUser?.email?.toLowerCase()
		const creatorEmail = item.createdByEmail?.toLowerCase()

		if (item.createdBy === currentUser?.uid || creatorEmail === currentEmail) {
			return "You"
		}

		if (!item.createdByEmail) return "Someone"
		return item.createdByEmail.split("@")[0]
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
			{sharedLists.map((list) => {
				const isSelected = selectedListId === list.id

				return (
					<div
						key={list.id}
						onClick={() => onSelectList?.(list.id)}
						className={clsx(
							"rounded-2xl border bg-white p-4 shadow-sm transition-all dark:bg-gray-800",
							isSelected
								? "border-accent-300 dark:border-accent-500"
								: "border-gray-200 dark:border-gray-700",
						)}>
						<div className="mb-4">
							<div className="mb-3 flex items-start justify-between">
								{isSelected ? (
									<span className="inline-flex items-center rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
										Selected
									</span>
								) : (
									<span className="h-6" />
								)}
								<div className="relative">
									<button
										onClick={(e) => {
											e.stopPropagation()
											setConfirmDeleteId(null)
											setActionMenuListId((current) =>
												current === list.id ? null : list.id,
											)
										}}
										className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
										aria-label="Open list actions">
										<MoreHorizontal className="h-4 w-4" />
									</button>

									{actionMenuListId === list.id && (
										<div
											onClick={(e) => e.stopPropagation()}
											className="absolute right-0 z-10 mt-1 w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
											{list.ownerId !== currentUser.uid ? (
												<button
													onClick={() => {
														handleLeaveList(list.id)
														setActionMenuListId(null)
													}}
													className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
													Leave list
												</button>
											) : confirmDeleteId === list.id ? (
												<div className="space-y-2 px-2 py-2">
													<p className="text-xs text-gray-500 dark:text-gray-400">
														Delete this shared list?
													</p>
													<div className="flex items-center gap-2">
														<button
															onClick={(e) => handleDeleteList(e, list.id)}
															className="rounded-md px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30">
															Delete
														</button>
														<button
															onClick={() => setConfirmDeleteId(null)}
															className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
															Cancel
														</button>
													</div>
												</div>
											) : (
												<button
													onClick={() => setConfirmDeleteId(list.id)}
													className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
													Delete list
												</button>
											)}
										</div>
									)}
								</div>
							</div>

							<h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
								Collaborators
							</h3>
							<ul className="flex flex-wrap gap-2">
								{list.members.map((member) => (
									<li
										key={member.uid}
										className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 dark:border-gray-700 dark:bg-gray-900">
										<span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-100 text-[11px] font-semibold text-accent-700 dark:bg-accent-900/40 dark:text-accent-200">
											{getInitials(getMemberLabel(member))}
										</span>
										<span className="text-xs font-medium text-gray-700 dark:text-gray-200">
											{getMemberLabel(member)}
										</span>
										{member.uid === list.ownerId && (
											<span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
												Owner
											</span>
										)}
									</li>
								))}
							</ul>
						</div>

						<div className="space-y-2">
							{list.items.length === 0 ? (
								<p className="rounded-xl bg-gray-50 px-4 py-4 text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
									No items in this shared list yet.
								</p>
							) : (
								list.items.map((item) => {
									const itemKey = `${list.id}:${item.id}`
									const isSwiped = swipedItemKey === itemKey

									return (
										<div key={item.id} className="relative overflow-hidden">
											<div
												className={clsx(
													"absolute right-0 top-0 bottom-0 flex items-center bg-accent-500 rounded-tr-lg rounded-br-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-transform duration-300 ease-out z-10",
													isSwiped ? "translate-x-0" : "translate-x-full",
												)}>
												<button
													onClick={(e) => {
														e.stopPropagation()
														editSharedItem(list.id, item)
													}}
													className="p-3 text-white hover:bg-red-600 transition-colors">
													<Edit className="w-5 h-5" />
												</button>
												<button
													onClick={(e) => {
														e.stopPropagation()
														deleteSharedItem(list.id, item.id)
													}}
													className="p-3 text-white hover:bg-red-600 transition-colors">
													<Trash2 className="w-5 h-5" />
												</button>
											</div>

											<div
												onClick={(e) => {
													if (!e.currentTarget.wasDragged) {
														toggleSharedItem(list.id, item)
													}
												}}
												onMouseDown={(e) => {
													e.currentTarget.mouseStartX = e.clientX
													e.currentTarget.isMouseDown = true
													e.currentTarget.wasDragged = false
												}}
												onMouseMove={(e) => {
													if (
														!e.currentTarget.isMouseDown ||
														!e.currentTarget.mouseStartX
													)
														return

													const deltaX = e.currentTarget.mouseStartX - e.clientX

													if (Math.abs(deltaX) > 20) {
														e.currentTarget.wasDragged = true
													}

													if (deltaX > 20) {
														e.currentTarget.style.transform = `translateX(-${Math.min(deltaX, 120)}px)`
													}
												}}
												onMouseUp={(e) => {
													if (!e.currentTarget.isMouseDown) return
													const deltaX = e.currentTarget.mouseStartX - e.clientX

													if (deltaX > 80) {
														setSwipedItemKey(itemKey)
													} else {
														setSwipedItemKey(null)
													}

													e.currentTarget.style.transform = ""
													e.currentTarget.isMouseDown = false
												}}
												onMouseLeave={(e) => {
													if (e.currentTarget.isMouseDown) {
														e.currentTarget.style.transform = ""
														e.currentTarget.isMouseDown = false
														e.currentTarget.wasDragged = false
													}
												}}
												onTouchStart={(e) => {
													e.currentTarget.touchStartX = e.touches[0].clientX
													e.currentTarget.wasDragged = false
												}}
												onTouchMove={(e) => {
													if (!e.currentTarget.touchStartX) return

													const deltaX =
														e.currentTarget.touchStartX - e.touches[0].clientX

													if (Math.abs(deltaX) > 20) {
														e.currentTarget.wasDragged = true
													}

													if (deltaX > 20) {
														e.currentTarget.style.transform = `translateX(-${Math.min(deltaX, 120)}px)`
													}
												}}
												onTouchEnd={(e) => {
													const deltaX =
														e.currentTarget.touchStartX -
														e.changedTouches[0].clientX

													if (deltaX > 80) {
														setSwipedItemKey(itemKey)
													} else {
														setSwipedItemKey(null)
													}

													e.currentTarget.style.transform = ""
												}}
												className={clsx(
													"group flex items-center gap-3 p-3 py-4 bg-[#fff] dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer",
													item.completed &&
														"opacity-60 bg-[#F9FAFB] dark:bg-gray-800/50",
												)}>
												<div
													className={clsx(
														"w-5 h-5 border-2 rounded flex items-center justify-center transition-all",
														item.completed
															? "border-accent-600 bg-accent-600"
															: "border-gray-300",
													)}>
													{item.completed && (
														<Check className="h-4 w-4 text-white" />
													)}
												</div>
												<div className="flex-1">
													<p
														className={clsx(
															"flex-grow font-medium transition-all text-gray-700 dark:text-gray-200",
															item.completed && "line-through text-gray-400",
														)}>
														{item.name}
													</p>
												</div>
											</div>
										</div>
									)
								})
							)}
						</div>
					</div>
				)
			})}

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
