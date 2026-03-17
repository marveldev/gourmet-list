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
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target)
			) {
				setIsOpen(false)
			}
		}

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside)
			return () =>
				document.removeEventListener("mousedown", handleClickOutside)
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

			await updateDoc(listRef, {
				sharedWith: arrayUnion(senderUid),
			})

			await addDoc(collection(db, "users", senderUid, "notifications"), {
				type: "list_shared",
				fromUid: currentUser.uid,
				fromEmail: currentUser.email,
				listId: currentUser.uid,
				listName: "Shared List",
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

			{isOpen && notifications.length > 0 && (
				<div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-50">
					{notifications.map((notif) => (
						<div
							key={notif.id}
							className="flex flex-col gap-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
							<p className="text-sm text-gray-700 dark:text-gray-200">
								{notif.fromEmail || "Someone"} shared a list with you.
							</p>
							<div className="flex gap-2">
								<button
									className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
									onClick={() => openSharedList(notif)}>
									Open List
								</button>
								<button
									className="px-2 py-1 bg-green-500 text-white rounded text-xs"
									onClick={async () => {
										await shareBack(notif.fromUid)
										await markAsRead(notif.id)
									}}>
									Share Back
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
