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

	const openSharedList = async (notif) => {
		try {
			setFilter("shared")
			await markAsRead(notif.id)
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
				type: "list_shared",
				fromUid: currentUser.uid,
				fromEmail: currentUser.email,
				listId: currentUser.uid,
				listName: "Shared List",
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
			setIsOpen(false)
		} catch (err) {
			console.error("Failed to share back:", err)
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

			setToast("Sharing stopped")
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
				<div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-50">
					{notifications.length > 0 ? (
						notifications.map((notif) => (
							<div
								key={notif.id}
								className="flex flex-col gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
								{/* Main notification text */}
								<p className="text-sm text-gray-700 dark:text-gray-200">
									<span className="font-semibold">
										{notif.fromEmail || "Someone"}
									</span>{" "}
									shared a list with you.
								</p>

								<div className="flex gap-2">
									<button
										className="px-2 py-1 bg-accent-500 text-white rounded text-xs"
										onClick={() => openSharedList(notif)}>
										Open List
									</button>
									<button
										className="px-2 py-1 bg-accent-500 text-white rounded text-xs"
										onClick={async () => {
											await shareBack(notif.fromUid)
											await markAsRead(notif.id)
										}}>
										Share Back
									</button>
								</div>

								{/* Active sharing notification */}
								{notif.type === "sharing_active" && (
									<div className="mt-2 flex flex-col gap-1">
										<p className="text-sm text-gray-700 dark:text-gray-200">
											You are sharing your list with {notif.withEmail}.
										</p>
										<button
											onClick={() => stopSharing(notif.withUid, notif.id)}
											className="px-2 py-1 bg-red-500 text-white text-xs rounded">
											Stop Sharing
										</button>
									</div>
								)}
							</div>
						))
					) : (
						// Show this if there are no notifications
						<p className="text-center text-gray-500 dark:text-gray-400 text-sm">
							No notifications
						</p>
					)}
				</div>
			)}
		</div>
	)
}
