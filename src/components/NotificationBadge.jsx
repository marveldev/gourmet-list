import React, { useEffect, useState, useRef } from "react"
import {
	collection,
	query,
	where,
	onSnapshot,
	doc,
	updateDoc,
	addDoc,
	arrayUnion,
	getDocs,
	getDoc,
	serverTimestamp,
	orderBy,
	arrayRemove,
} from "firebase/firestore"
import { db } from "../firebase"
import { Bell } from "lucide-react"

export default function NotificationBadge({
	currentUser,
	setFilter,
	setToast,
}) {
	const [notifications, setNotifications] = useState([])
	const [isOpen, setIsOpen] = useState(false)
	const dropdownRef = useRef(null)

	useEffect(() => {
		if (!currentUser) return

		const q = query(
			collection(db, "users", currentUser.uid, "notifications"),
			where("read", "==", false),
			orderBy("timestamp", "desc"),
		)

		const unsubscribe = onSnapshot(q, (snapshot) => {
			setNotifications(
				snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
			)
		})

		return () => unsubscribe()
	}, [currentUser])

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsOpen(false)
			}
		}

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside)
			return () => document.removeEventListener("mousedown", handleClickOutside)
		}
	}, [isOpen])

	const markAsRead = async (notifId) => {
		try {
			const notifRef = doc(
				db,
				"users",
				currentUser.uid,
				"notifications",
				notifId,
			)

			await updateDoc(notifRef, {
				read: true,
			})
		} catch (err) {
			console.error("Failed to mark notification read:", err)
		}
	}

	const openSharedList = (notif) => {
		try {
			setFilter("shared")
			setIsOpen(false)
		} catch (err) {
			console.error("Failed to open shared list:", err)
		}
	}

	const shareBack = async (senderUid) => {
		try {
			const listRef = doc(db, "shoppingLists", currentUser.uid)
			const listSnap = await getDoc(listRef)

			if (!listSnap.exists()) {
				setToast("Your list does not exist yet")
				setTimeout(() => setToast(null), 2000)
				return
			}

			// Add sender to sharedWith array
			await updateDoc(listRef, {
				sharedWith: arrayUnion(senderUid),
			})

			// Fetch sender's email
			const senderSnap = await getDoc(doc(db, "users", senderUid))
			const senderEmail = senderSnap.exists()
				? senderSnap.data().email
				: "Unknown user"

			// Notify the sender
			await addDoc(collection(db, "users", senderUid, "notifications"), {
				type: "list_shared_back",
				fromUid: currentUser.uid,
				fromEmail: currentUser.email,
				listId: currentUser.uid,
				timestamp: serverTimestamp(),
				read: false,
			})

			// Notify current user that sharing is active
			await addDoc(collection(db, "users", currentUser.uid, "notifications"), {
				type: "sharing_active",
				withUid: senderUid,
				withEmail: senderEmail, // ✅ now defined
				listId: currentUser.uid,
				timestamp: serverTimestamp(),
				read: false,
			})

			setToast("List shared back successfully")
			setTimeout(() => setToast(null), 2000)
			setIsOpen(false)
		} catch (err) {
			console.error("Failed to share back:", err)
			setTimeout(() => setToast(null), 2000)
			setToast("Failed to share back")
		}
	}

	const stopSharing = async (uid, notifId) => {
		try {
			const listRef = doc(db, "shoppingLists", currentUser.uid)

			await updateDoc(listRef, {
				sharedWith: arrayRemove(uid),
			})

			await updateDoc(
				doc(db, "users", currentUser.uid, "notifications", notifId),
				{ read: true },
			)

			// Notify the recipient that sharing has stopped
			await addDoc(collection(db, "users", uid, "notifications"), {
				type: "sharing_stopped",
				fromUid: currentUser.uid,
				fromEmail: currentUser.email,
				timestamp: serverTimestamp(),
				read: false,
			})

			setToast("Sharing stopped")
			setTimeout(() => setToast(null), 2000)
		} catch (err) {
			console.error(err)
		}
	}

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="btn-icon dark:text-gray-300 dark:hover:bg-gray-800 relative">
				<Bell className="w-6 h-6" />
				{notifications.length > 0 && (
					<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-600 text-white text-xs flex items-center justify-center">
						{notifications.length}
					</span>
				)}
			</button>

			{isOpen && (
			<div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1rem)] bg-[#fff] dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-600 rounded-lg shadow-lg p-2 z-50 max-h-[70vh] overflow-y-auto sm:w-72 max-sm:fixed max-sm:right-1 max-sm:top-16 max-sm:w-auto max-sm:max-w-xs">
					{notifications.length > 0 ? (
						notifications.map((notif) => (
							<div
								key={notif.id}
								className="flex flex-col gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
								{notif.type === "list_shared" && (
									<>
										<p className="text-sm text-gray-700 dark:text-gray-200">
											<span className="font-semibold">
												{notif.fromEmail || "Someone"}
											</span>{" "}
											shared a list with you.
										</p>
										<div className="flex flex-wrap gap-2">
											<button
												className="px-2 py-[0.35rem] bg-gray-500 text-white rounded text-xs"
												onClick={() => openSharedList(notif)}>
												Open List
											</button>
											<button
												className="px-2 py-[0.35rem] bg-gray-500 text-white rounded text-xs"
												onClick={async () => {
													await shareBack(notif.fromUid)
													await markAsRead(notif.id)
												}}>
												Share Back
											</button>
											<button
												className="px-2 py-[0.35rem] bg-gray-500 hover:bg-gray-500 text-white rounded text-xs"
												onClick={() => markAsRead(notif.id)}>
												Dismiss
											</button>
										</div>
									</>
								)}

								{notif.type === "list_shared_back" && (
									<>
										<p className="text-sm text-gray-700 dark:text-gray-200">
											<span className="font-semibold">
												{notif.fromEmail || "Someone"}
											</span>{" "}
											shared their list back with you.
										</p>
										<div className="flex flex-wrap gap-2">
											<button
												className="px-2 py-[0.35rem] bg-gray-500 text-white rounded text-xs"
												onClick={() => openSharedList(notif)}>
												Open List
											</button>
											<button
												className="px-2 py-[0.35rem] bg-gray-500 hover:bg-gray-500 text-white rounded text-xs"
												onClick={() => markAsRead(notif.id)}>
												Dismiss
											</button>
										</div>
									</>
								)}

								{notif.type === "sharing_stopped" && (
									<>
										<p className="text-sm text-gray-700 dark:text-gray-200">
											<span className="font-semibold">
												{notif.fromEmail || "Someone"}
											</span>{" "}
											has stopped sharing their list with you.
										</p>
										<div className="flex flex-wrap gap-2">
											<button
												onClick={() => markAsRead(notif.id)}
												className="px-2 py-[0.35rem] bg-gray-500 hover:bg-gray-500 text-white text-xs rounded">
												Dismiss
											</button>
										</div>
									</>
								)}

								{notif.type === "sharing_active" && (
									<div className="flex flex-col gap-1">
										<p className="text-sm text-gray-700 dark:text-gray-200">
											You are sharing your list with{" "}
											<span className="font-semibold">
												{notif.withEmail || "Someone"}
											</span>
											.
										</p>
										<div className="flex flex-wrap gap-2">
											<button
												onClick={() => stopSharing(notif.withUid, notif.id)}
												className="px-2 py-[0.35rem] bg-gray-500 text-white text-xs rounded">
												Stop Sharing
											</button>
											<button
												onClick={() => markAsRead(notif.id)}
												className="px-2 py-[0.35rem] bg-gray-500 hover:bg-gray-500 text-white text-xs rounded">
												Dismiss
											</button>
										</div>
									</div>
								)}
							</div>
						))
					) : (
						<p className="text-center text-gray-500 dark:text-gray-400 text-sm">
							No notifications
						</p>
					)}
				</div>
			)}
		</div>
	)
}
