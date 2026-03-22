import React, { useEffect, useState, useRef } from "react"
import {
	collection,
	query,
	where,
	onSnapshot,
	doc,
	updateDoc,
	orderBy,
} from "firebase/firestore"
import { db } from "../firebase"
import { Bell } from "lucide-react"

export default function NotificationBadge({ currentUser }) {
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
								<p className="text-sm text-gray-700 dark:text-gray-200">
									{notif.message || notif.title || "Notification"}
								</p>
								<div className="flex flex-wrap gap-2">
									<button
										className="px-2 py-[0.35rem] bg-gray-500 hover:bg-gray-500 text-white rounded text-xs"
										onClick={() => markAsRead(notif.id)}>
										Dismiss
									</button>
								</div>
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
