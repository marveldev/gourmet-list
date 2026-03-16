// components/NotificationBadge.jsx
import React, { useEffect, useState } from "react"
import {
	collection,
	query,
	where,
	onSnapshot,
	doc,
	updateDoc,
} from "firebase/firestore"
import { db } from "../firebase"
import { Bell } from "lucide-react"

export default function NotificationBadge({ currentUser }) {
	const [notifications, setNotifications] = useState([])
	const unreadNotifications = notifications.filter((n) => !n.read)

	console.log(unreadNotifications)

	useEffect(() => {
		if (!currentUser) return

		const q = query(
			collection(db, "users", currentUser.uid, "notifications"),
			where("read", "==", false),
		)

		const unsubscribe = onSnapshot(q, (snapshot) => {
			setNotifications(
				snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
			)
		})

		return () => unsubscribe()
	}, [currentUser])

	const markAsRead = async (id) => {
		await updateDoc(doc(db, "users", currentUser.uid, "notifications", id), {
			read: true,
		})
	}

	return (
		<div className="relative">
			<Bell className="w-6 h-6 text-gray-700 dark:text-gray-200" />
			{notifications.length > 0 && (
				<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
					{notifications.length}
				</span>
			)}

			{notifications.length > 0 && (
				<div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2">
					{notifications.map((notif) => (
						<div
							key={notif.id}
							className="flex flex-col gap-1 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
							<p className="text-sm text-gray-700 dark:text-gray-200">
								{notif.fromEmail} shared a list:{" "}
								<strong>{notif.listName}</strong>
							</p>
							<div className="flex gap-2">
								<button
									className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
									onClick={() => {
										// navigate to shared list
										window.location.href = `/shared/${notif.listId}`
										markAsRead(notif.id)
									}}>
									Open List
								</button>
								<button
									className="px-2 py-1 bg-green-500 text-white rounded text-xs"
									onClick={() => {
										// share your personal list back
										console.log("Share back functionality here")
										markAsRead(notif.id)
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
