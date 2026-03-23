import React, { useEffect, useState, useRef } from "react"
import { Bell } from "lucide-react"
import {
	acceptInvite,
	declineInvite,
	listenToPendingInvites,
} from "../services/list.services"

export default function NotificationBadge({ currentUser, showToast }) {
	const [invites, setInvites] = useState([])
	const [isOpen, setIsOpen] = useState(false)
	const [processingInviteId, setProcessingInviteId] = useState(null)
	const dropdownRef = useRef(null)

	useEffect(() => {
		if (!currentUser?.email) {
			setInvites([])
			return
		}

		return listenToPendingInvites(currentUser.uid, setInvites)
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

	const handleInviteAction = async (inviteId, action) => {
		try {
			setProcessingInviteId(inviteId)

			const invite =
				action === "accept"
					? await acceptInvite(inviteId, currentUser)
					: await declineInvite(inviteId, currentUser)

			showToast?.(
				action === "accept"
					? `Joined ${invite.fromEmail}'s shared list`
					: "Invite declined",
			)
		} catch (err) {
			console.error("Failed to respond to invite:", err)
			showToast?.(err.message || "Unable to update invite")
		} finally {
			setProcessingInviteId(null)
		}
	}

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="btn-icon dark:text-gray-300 dark:hover:bg-gray-800 relative">
				<Bell className="w-6 h-6" />
				{invites.length > 0 && (
					<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-600 text-white text-xs flex items-center justify-center">
						{invites.length}
					</span>
				)}
			</button>

			{isOpen && (
				<div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1rem)] bg-[#fff] dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-600 rounded-lg shadow-lg p-2 z-50 max-h-[70vh] overflow-y-auto sm:w-72 max-sm:fixed max-sm:right-1 max-sm:top-16 max-sm:w-auto max-sm:max-w-xs">
					{invites.length > 0 ? (
						invites.map((invite) => (
							<div
								key={invite.id}
								className="flex flex-col gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
								<p className="text-sm text-gray-700 dark:text-gray-200">
									<span className="font-semibold">{invite.fromEmail}</span>{" "}
									invited you to collaborate on a shopping list.
								</p>
								<div className="flex flex-wrap gap-2">
									<button
										className="px-2 py-[0.35rem] bg-accent-600 hover:bg-accent-700 text-white rounded text-xs disabled:opacity-50"
										disabled={processingInviteId === invite.id}
										onClick={() => handleInviteAction(invite.id, "accept")}>
										Accept
									</button>
									<button
										className="px-2 py-[0.35rem] bg-gray-500 hover:bg-gray-600 text-white rounded text-xs disabled:opacity-50"
										disabled={processingInviteId === invite.id}
										onClick={() => handleInviteAction(invite.id, "decline")}>
										Decline
									</button>
								</div>
							</div>
						))
					) : (
						<p className="text-center text-gray-500 dark:text-gray-400 text-sm">
							No invites
						</p>
					)}
				</div>
			)}
		</div>
	)
}
