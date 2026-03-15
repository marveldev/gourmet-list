import React, { useEffect, useState, useRef } from "react"
import {
	collection,
	query,
	where,
	getDocs,
	doc,
	updateDoc,
	getDoc,
} from "firebase/firestore"
import { Bell } from "lucide-react"
import { db } from "../firebase"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import clsx from "clsx"

export default function NotificationBadge({ openShareWithEmail }) {
	const { currentUser } = useAuth()
	const [notifications, setNotifications] = useState([])
	const [unreadCount, setUnreadCount] = useState(0)
	const [userMap, setUserMap] = useState({})
	const [showDropdown, setShowDropdown] = useState(false)
	const dropdownRef = useRef(null)
	const navigate = useNavigate()

	useEffect(() => {
		if (!currentUser) return

		const fetchNotifications = async () => {
			try {
				const q = query(
					collection(db, "users", currentUser.uid, "notifications"),
					where("read", "==", false)
				)
				const snapshot = await getDocs(q)
				const notifs = snapshot.docs.map((doc) => ({
					id: doc.id,
					...doc.data(),
				}))
				setNotifications(notifs)
				setUnreadCount(notifs.length)

				// Fetch user emails for fromUser
				const fromUsers = new Set(notifs.map((n) => n.fromUser))
				const userEntries = await Promise.all(
					[...fromUsers].map(async (uid) => {
						const snap = await getDoc(doc(db, "users", uid))
						return snap.exists()
							? [uid, snap.data().email]
							: [uid, "Unknown user"]
					})
				)
				setUserMap(Object.fromEntries(userEntries))
			} catch (err) {
				console.error("Failed to fetch notifications:", err)
			}
		}

		fetchNotifications()
	}, [currentUser])

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setShowDropdown(false)
			}
		}
		document.addEventListener("mousedown", handleClickOutside)
		return () => document.removeEventListener("mousedown", handleClickOutside)
	}, [])

	const markAsRead = async () => {
		if (notifications.length === 0) return
		try {
			const updates = notifications.map((notif) =>
				updateDoc(doc(db, "users", currentUser.uid, "notifications", notif.id), {
					read: true,
				})
			)
			await Promise.all(updates)
			setUnreadCount(0)
		} catch (err) {
			console.error("Failed to mark notifications as read:", err)
		}
	}

	const handleBellClick = () => {
		setShowDropdown(!showDropdown)
		if (!showDropdown) {
			markAsRead()
		}
	}

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				onClick={handleBellClick}
				className="btn-icon relative dark:text-gray-300 dark:hover:bg-gray-800"
				title="Notifications"
			>
				<Bell className="w-6 h-6" />
				{unreadCount > 0 && (
					<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				)}
			</button>

			{showDropdown && (
				<div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
					<div className="p-4">
						<h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
							Notifications
						</h3>
						{notifications.length === 0 ? (
							<p className="text-gray-500 dark:text-gray-400">No new notifications</p>
						) : (
							<div className="space-y-3">
								{notifications.map((notif) => (
									<div
										key={notif.id}
										className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
									>
										<p className="text-sm text-gray-900 dark:text-white">
											{userMap[notif.fromUser] || "Someone"} shared a list with you
										</p>
										<div className="flex gap-2 mt-2">
											<button
												onClick={() => navigate("/shopping-list")}
												className="px-3 py-1 text-xs bg-accent-600 text-white rounded hover:bg-accent-700"
											>
												Open Shared List
											</button>
											<button
												onClick={() =>
													openShareWithEmail(userMap[notif.fromUser])
												}
												className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
											>
												Share Back
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}