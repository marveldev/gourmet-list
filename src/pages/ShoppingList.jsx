import React, { useState, useEffect, useRef } from "react"
import {
	Plus,
	Trash2,
	Check,
	Share2,
	MessageSquare,
	X,
	Send,
	AlertCircle,
	Loader2,
	ShoppingBag,
	Edit,
} from "lucide-react"
import clsx from "clsx"
import {
	collection,
	addDoc,
	deleteDoc,
	query,
	where,
	getDocs,
	updateDoc,
	doc,
	setDoc,
	arrayUnion,
	arrayRemove,
	getDoc,
	serverTimestamp,
} from "firebase/firestore"
import { useChefBot } from "../hooks/useChefBot"
import Header from "../components/Header"
import { useTheme } from "../contexts/ThemeContext"
import { db } from "../firebase"
import SharedList from "../components/SharedList"
import { useAuth } from "../../src/contexts/AuthContext"
import { listenToItems } from "../services/list.services"

export default function ShoppingListApp() {
	// State
	const { currentUser } = useAuth()
	const [items, setItems] = useState([])
	const [filter, setFilter] = useState("all")
	const [inputValue, setInputValue] = useState("")
	const [isChatOpen, setIsChatOpen] = useState(false)
	const [isShareModalOpen, setIsShareModalOpen] = useState(false)
	const [deleteModalIsOpen, setDeleteModalIsOpen] = useState(false)
	const [shareEmail, setShareEmail] = useState("")
	const { isDark, toggleTheme } = useTheme()
	const [toast, setToast] = useState(null)
	const [sharedUsers, setSharedUsers] = useState([])
	const [swipedItemId, setSwipedItemId] = useState(null)
	const [isEditModalOpen, setIsEditModalOpen] = useState(false)
	const [editingItem, setEditingItem] = useState(null)
	const [editValue, setEditValue] = useState("")
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	const [deletingItem, setDeletingItem] = useState(null)

	const usersCollectionRef = collection(
		db,
		"shoppingLists",
		currentUser.uid,
		"items",
	)

	useEffect(() => {
		if (!currentUser) return

		const unsubscribe = listenToItems(currentUser.uid, (items) => {
			setItems(items)
		})

		return unsubscribe
	}, [currentUser])

	// AI Hook
	const {
		isReady,
		isLoading: isAiLoading,
		progress: aiProgress,
		chatHistory,
		loadModel,
		generateResponse,
		clearChat,
	} = useChefBot()

	const chatInputRef = useRef(null)
	const chatContainerRef = useRef(null)

	// Effects
	useEffect(() => {
		localStorage.setItem("chef.list", JSON.stringify(items))
	}, [items])

	// theme is handled globally by ThemeProvider

	useEffect(() => {
		if (chatContainerRef.current) {
			chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
		}
	}, [chatHistory, isChatOpen])

	const fetchSharedUsers = async () => {
		try {
			const listRef = doc(db, "shoppingLists", currentUser.uid)
			const listSnap = await getDoc(listRef)

			if (!listSnap.exists()) return

			const sharedWith = listSnap.data().sharedWith || []

			const users = await Promise.all(
				sharedWith.map(async (uid) => {
					const userSnap = await getDoc(doc(db, "users", uid))
					return userSnap.exists()
						? { uid, email: userSnap.data().email }
						: null
				}),
			)

			setSharedUsers(users.filter(Boolean))
		} catch (err) {
			console.error("Failed to fetch shared users:", err)
		}
	}

	useEffect(() => {
		if (isShareModalOpen && currentUser) {
			fetchSharedUsers()
		}
	}, [isShareModalOpen, currentUser])

	const removeAccess = async (uid) => {
		try {
			const listRef = doc(db, "shoppingLists", currentUser.uid)

			await updateDoc(listRef, {
				sharedWith: arrayRemove(uid),
			})

			setSharedUsers((prev) => prev.filter((u) => u.uid !== uid))

			showToast("Access removed")
		} catch (err) {
			console.error("Failed to remove access:", err)
		}
	}

	// Actions
	const addItem = async (e) => {
		e.preventDefault()
		if (!inputValue.trim()) return
		const newItem = {
			name: inputValue.trim(),
			completed: false,
			createdAt: Date.now(),
		}

		const docRef = await addDoc(usersCollectionRef, newItem)

		setItems([{ id: docRef.id, ...newItem }, ...items])

		setInputValue("")
		showToast(`Added ${newItem.name}`)
	}

	const toggleItem = async (id) => {
		const item = items.find((i) => i.id === id)
		if (!item) return

		const itemDoc = doc(
			db,
			"shoppingLists",
			currentUser.uid,
			"items",
			id, // ✅ dynamic
		)

		const updatedItem = { completed: !item.completed }

		await updateDoc(itemDoc, {
			completed: !item.completed,
		})

		setItems(items.map((i) => (i.id === id ? { ...i, ...updatedItem } : i)))
	}

	const deleteItem = async (id) => {
		await deleteDoc(doc(db, "shoppingLists", currentUser.uid, "items", id))
		setItems(items.filter((item) => item.id !== id))
		setIsDeleteModalOpen(false)
		setDeletingItem(null)
		showToast("Item deleted")
	}

	const openEditModal = (id) => {
		const item = items.find((i) => i.id === id)
		if (!item) return
		setEditingItem(item)
		setEditValue(item.name)
		setSwipedItemId(null)
		setIsEditModalOpen(true)
	}

	const saveEdit = async () => {
		if (!editValue.trim() || !editingItem) return
		const itemDoc = doc(
			db,
			"shoppingLists",
			currentUser.uid,
			"items",
			editingItem.id,
		)
		await updateDoc(itemDoc, { name: editValue.trim() })
		setItems(
			items.map((i) =>
				i.id === editingItem.id ? { ...i, name: editValue.trim() } : i,
			),
		)
		setIsEditModalOpen(false)
		setEditingItem(null)
		setEditValue("")
		showToast("Item updated")
	}

	const cancelEdit = () => {
		setIsEditModalOpen(false)
		setEditingItem(null)
		setEditValue("")
	}

	const openDeleteModal = (id) => {
		const item = items.find((i) => i.id === id)
		if (!item) return
		setDeletingItem(item)
		setSwipedItemId(null)
		setIsDeleteModalOpen(true)
	}

	const clearCompleted = async () => {
		const completedItems = items.filter((item) => item.completed)

		if (completedItems.length === 0) {
			showToast("No completed items to clear")
			return
		}

		await Promise.all(
			completedItems.map((item) =>
				deleteDoc(doc(db, "shoppingLists", currentUser.uid, "items", item.id)),
			),
		)

		setItems((prev) => prev.filter((item) => !item.completed))
		showToast("Cleared completed items")
	}

	const handleClearAll = async () => {
		if (items.length === 0) {
			setDeleteModalIsOpen(false)
			return
		}

		await Promise.all(
			items.map((item) =>
				deleteDoc(doc(db, "shoppingLists", currentUser.uid, "items", item.id)),
			),
		)

		setItems([])
		setDeleteModalIsOpen(false)
		showToast("Cleared all items")
	}

	const shareListWithEmail = async (currentUser, listId, email) => {
		// Find the target user by email
		const q = query(collection(db, "users"), where("email", "==", email))
		const snapshot = await getDocs(q)

		if (snapshot.empty) {
			throw new Error("No registered user found with this email")
		}

		const targetUserDoc = snapshot.docs[0]
		const targetUserId = targetUserDoc.id

		// Add target user to the sharedWith array
		const listRef = doc(db, "shoppingLists", listId)
		await updateDoc(listRef, {
			sharedWith: arrayUnion(targetUserId),
		})

		// Create notification for the target user
		const notifRef = doc(collection(db, "users", targetUserId, "notifications"))

		await setDoc(notifRef, {
			type: "list_shared",
			fromUid: currentUser.uid,
			fromEmail: currentUser.email,
			listId: listRef.id,
			listName: "Shared List",
			timestamp: serverTimestamp(),
			read: false,
		})
	}

	const smartSort = () => {
		const sorted = [...items].sort((a, b) => {
			if (a.completed !== b.completed) return a.completed ? 1 : -1
			return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
		})
		setItems(sorted)
		showToast("List sorted")
	}

	const showToast = (msg) => {
		setToast(msg)
		setTimeout(() => setToast(null), 2000)
	}

	// Chat Actions
	const handleChatSubmit = async (e) => {
		e.preventDefault()
		const text = chatInputRef.current?.value.trim()
		if (!text || !isReady) return

		chatInputRef.current.value = ""

		const listContext = useMemo(
			() => items.map((i) => i.name).join(", "),
			[items],
		)
		const systemPrompt = `You are Chef Bot, a friendly and creative culinary expert. 
    The user has a shopping list containing: ${listContext || "nothing yet"}. 
    Suggest recipes or advice based on these ingredients if asked. 
    Keep responses helpful, encouraging, and concise (under 100 words). 
    Format bold text with **asterisks**.`

		await generateResponse(text, systemPrompt)
	}

	const handleShare = async (e) => {
		e.preventDefault()

		try {
			await shareListWithEmail(
				currentUser,
				currentUser.uid,
				shareEmail.trim().toLowerCase(),
			)
			showToast("List shared successfully")
			setShareEmail("") // clear input if you want
			setIsShareModalOpen(false) // close modal
		} catch (err) {
			showToast(err.message || "Unable to share list")
		}
	}

	// Filtered Items
	const filteredItems = items.filter((item) => {
		if (filter === "active") return !item.completed
		if (filter === "completed") return item.completed
		return true
	})

	const completedCount = items.filter((i) => i.completed).length
	const progress =
		items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100)

	return (
		<div className="flex flex-col h-screen overflow-hidden bg-[#f4f7f5] dark:bg-gray-900 transition-colors">
			<Header
				toggleTheme={toggleTheme}
				isDark={isDark}
				openShare={() => setIsShareModalOpen(true)}
				openChefBot={() => setIsChatOpen(true)}
				openShareWithEmail={(email) => {
					setShareEmail(email)
					setIsShareModalOpen(true)
				}}
				setFilter={setFilter}
				setToast={setToast}
			/>

			<main className="flex-grow flex overflow-hidden relative">
				{/* Main List Area */}
				<section className="flex-grow flex flex-col w-full h-full overflow-hidden bg-[#f4f7f5] dark:bg-gray-900">
					{/* Input */}
					<div className="p-6 max-w-3xl mx-auto w-full">
						<form onSubmit={addItem} className="relative">
							<input
								type="text"
								value={inputValue}
								onChange={(e) => setInputValue(e.target.value)}
								placeholder="Add item (e.g. 'Milk', 'Eggs')"
								className="w-full pl-5 pr-14 py-4 rounded-2xl border-none shadow-lg focus:ring-2 focus:ring-accent-600 outline-none text-lg text-gray-800 placeholder-gray-400 dark:bg-gray-800 dark:text-white"
							/>
							<button
								type="submit"
								className="absolute right-2 top-2 bottom-2 bg-accent-600 hover:bg-accent-700 text-white rounded-xl px-4 transition-colors">
								<Plus className="w-6 h-6" />
							</button>
						</form>
					</div>

					{/* Progress */}
					<div className="pb-4 max-w-3xl mx-auto w-full px-6">
						<div className="flex justify-between text-xs font-medium text-black-500 mb-1">
							<span>Shopping Progress</span>
							<span className="text-xs font-bold text-black-400 uppercase tracking-wider">
								{completedCount}/{items.length} done
							</span>
						</div>
						<div className="h-2 dark:bg-gray-700 bg-gray-200 rounded-full overflow-hidden">
							<div
								id="progress-fill"
								className="h-full bg-accent-500 transition-all duration-500 ease-out"
								style={{ width: `${progress}%` }}></div>
						</div>
					</div>
					<div className="bg-transparent p-4 max-w-3xl mx-auto w-full">
						<div className="flex bg-white rounded-xl shadow-sm border border-gray-100 z-20 mx-2">
							<button
								onClick={() => setFilter("all")}
								className={clsx(
									"tab-btn flex-1 py-3 text-sm font-semibold transition-all",
									filter === "all"
										? "bg-accent-500 text-white rounded-l-lg"
										: "hover:bg-gray-100 dark:hover:bg-gray-800",
								)}
								data-tab="all">
								All
							</button>
							<button
								onClick={() => setFilter("active")}
								className={clsx(
									"tab-btn flex-1 py-3 text-sm font-semibold transition-all",
									filter === "active"
										? "bg-accent-500 text-white"
										: "hover:bg-gray-100 dark:hover:bg-gray-800",
								)}
								data-tab="to-buy">
								To Buy
							</button>
							<button
								onClick={() => setFilter("completed")}
								className={clsx(
									"tab-btn flex-1 py-3 text-sm font-semibold transition-all",
									filter === "completed"
										? "bg-accent-500 text-white"
										: "hover:bg-gray-100 dark:hover:bg-gray-800",
								)}
								data-tab="done">
								Done
							</button>
							<button
								onClick={() => setFilter("shared")}
								className={clsx(
									"tab-btn flex-1 py-3 text-sm font-semibold transition-all",
									filter === "shared"
										? "bg-accent-500 text-white rounded-r-lg"
										: "hover:bg-gray-100 dark:hover:bg-gray-800",
								)}
								data-tab="shared">
								Shared
							</button>
						</div>
					</div>

					{/* List */}
					<div className="flex-grow overflow-y-auto p-6 max-w-3xl mx-auto w-full space-y-2">
						{filter === "shared" ? (
							<SharedList toggleItem={toggleItem} deleteItem={deleteItem} />
						) : filteredItems.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
								<div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
									<ShoppingBag className="w-8 h-8 text-gray-400" />
								</div>
								<p className="text-gray-500 dark:text-gray-400 font-medium">
									Your list is empty.
								</p>
								<p className="text-sm text-gray-400 mt-1">
									Add items or ask Chef Bot for ideas!
								</p>
							</div>
						) : (
							filteredItems.map((item) => {
								const isSwiped = swipedItemId === item.id

								return (
									<div key={item.id} className="relative overflow-hidden">
										{/* Swipe Actions */}
										<div
											className={clsx(
												"absolute right-0 top-0 bottom-0 flex items-center bg-accent-500 rounded-tr-lg rounded-br-lg border border-gray-100 dark:border-gray-700 shadow-sm transition-transform duration-300 ease-out z-10",
												isSwiped ? "translate-x-0" : "translate-x-full",
											)}>
											<button
												onClick={() => openEditModal(item.id)}
												className="p-3 text-white hover:bg-red-600 transition-colors">
												<Edit className="w-5 h-5" />
											</button>
											<button
												onClick={() => openDeleteModal(item.id)}
												className="p-3 text-white hover:bg-red-600 transition-colors">
												<Trash2 className="w-5 h-5" />
											</button>
										</div>

										{/* Item */}
										<div
											onClick={(e) => {
												// Only trigger click if it wasn't a drag
												if (!e.currentTarget.wasDragged) {
													toggleItem(item.id)
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
													setSwipedItemId(item.id)
												} else {
													setSwipedItemId(null)
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
													setSwipedItemId(item.id)
												} else {
													setSwipedItemId(null)
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
														? "bg-accent-600 border-accent-600"
														: "border-gray-300",
												)}>
												{item.completed && (
													<Check className="w-4 h-4 text-white" />
												)}
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
										</div>
									</div>
								)
							})
						)}
					</div>

					<div className="bg-white border-t border-gray-200 p-4">
						<div className="mx-auto max-w-full sm:max-w-3xl lg:max-w-4xl">
							<div className="flex justify-between items-start sm:items-center">
								{/* Left stack */}
								<div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
									<button
										onClick={smartSort}
										className="text-sm font-medium dark:text-gray-50 dark:bg-gray-800 dark:hover:text-accent-300 text-gray-600 bg-[#F3F4F6] hover:text-accent-700 hover:bg-accent-50 px-4 py-2 rounded-lg transition-colors">
										Smart Sort
									</button>

									<button
										onClick={clearCompleted}
										className="text-sm font-medium dark:text-gray-50 dark:bg-gray-800 dark:hover:text-teal-300 text-gray-600 hover:text-teal-700 bg-[#F3F4F6] hover:bg-teal-50 px-4 py-2 rounded-lg transition-colors">
										Clear Completed
									</button>
								</div>

								{/* Right button */}
								<button
									onClick={() => setDeleteModalIsOpen(true)}
									className="text-sm font-medium dark:text-red-400 text-red-500 bg-gray-100 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors sm:ml-auto">
									Clear All
								</button>
							</div>
						</div>
					</div>
				</section>

				{/* Chat Sidebar */}
				{isChatOpen && (
					<div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
						{/* Backdrop */}
						<div
							className="absolute inset-0 bg-black/40 backdrop-blur-sm"
							onClick={() => setIsChatOpen(false)}
						/>

						{/* Modal */}
						<aside
							className={clsx(
								"relative z-50 w-full sm:max-w-lg bg-white dark:bg-gray-900 shadow-2xl flex flex-col",
								"rounded-2xl sm:rounded-2xl p-2",
								"h-[90vh]",
							)}>
							{/* Header */}
							<div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-9 h-9 bg-accent-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-accent-600">
										<MessageSquare className="w-5 h-5" />
									</div>
									<div>
										<h3 className="font-semibold text-gray-900 dark:text-white">
											Chef Bot
										</h3>
										<p className="text-xs text-gray-500">
											{isReady
												? "Online"
												: isAiLoading
													? `Loading… ${aiProgress}%`
													: "Offline"}
										</p>
									</div>
								</div>

								<div className="flex items-center gap-2">
									<button
										onClick={clearChat}
										className="p-2 rounded-lg text-black-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
										<Trash2 className="w-4 h-4" />
									</button>
									<button
										onClick={() => setIsChatOpen(false)}
										className="p-2 rounded-lg text-black-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-100">
										<X className="w-5 h-5" />
									</button>
								</div>
							</div>

							{/* Messages */}
							<div
								ref={chatContainerRef}
								className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
								{!isReady && !isAiLoading && (
									<div className="text-center py-10">
										<button
											onClick={loadModel}
											className="bg-accent-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-accent-600">
											Load Chef Bot
										</button>
										<p className="text-xs text-gray-500 mt-3 max-w-xs mx-auto">
											Downloads ~1GB model to your browser. Requires WebGPU.
										</p>
									</div>
								)}

								{isAiLoading && (
									<div className="flex flex-col items-center py-12 space-y-4">
										<Loader2 className="w-8 h-8 animate-spin text-accent-500" />
										<div className="w-52 h-2 bg-gray-200 rounded-full overflow-hidden">
											<div
												className="h-full bg-accent-500 transition-all"
												style={{ width: `${aiProgress}%` }}
											/>
										</div>
										<p className="text-sm text-gray-500">
											Initializing AI… {aiProgress}%
										</p>
									</div>
								)}

								{isReady && !isAiLoading && chatHistory.length === 0 && (
									<div className="flex flex-col items-center justify-center h-full text-center px-6">
										<div className="w-14 h-14 rounded-2xl bg-accent-100 dark:bg-orange-900/30 flex items-center justify-center text-accent-600 mb-4">
											<MessageSquare className="w-7 h-7" />
										</div>

										<h4 className="text-lg font-semibold text-gray-900 dark:text-white">
											Chef Bot is ready
										</h4>

										<p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs">
											Ask for recipes, meal ideas, or cooking tips based on what
											you have at home.
										</p>

										<div className="mt-4 text-xs text-gray-400">
											Try:{" "}
											<span className="italic">
												“What can I cook with chicken and rice?”
											</span>
										</div>
									</div>
								)}

								{chatHistory.map((msg, idx) => (
									<div
										key={idx}
										className={clsx(
											"flex",
											msg.role === "user" ? "justify-end" : "justify-start",
										)}>
										<div
											className={clsx(
												"max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
												msg.role === "user"
													? "bg-accent-500 text-white rounded-tr-none"
													: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-tl-none shadow-sm",
											)}>
											{msg.content ? (
												<div
													dangerouslySetInnerHTML={{
														__html: msg.content
															.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
															.replace(/\n/g, "<br />"),
													}}
												/>
											) : (
												<span className="animate-pulse">…</span>
											)}
										</div>
									</div>
								))}
							</div>

							{/* Input */}
							<div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
								<form onSubmit={handleChatSubmit} className="relative">
									<input
										ref={chatInputRef}
										disabled={!isReady}
										placeholder={isReady ? "Ask for recipes…" : "Load AI first"}
										className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-accent-500 outline-none text-sm"
									/>
									<button
										type="submit"
										disabled={!isReady}
										className="absolute right-2 top-2 p-2 rounded-lg bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50">
										<Send className="w-4 h-4" />
									</button>
								</form>
							</div>
						</aside>
					</div>
				)}
			</main>

			{/* Share Modal */}
			{isShareModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/40 backdrop-blur-sm"
						onClick={() => setIsShareModalOpen(false)}></div>
					<div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in-up">
						<div className="flex items-center justify-between mb-8">
							<div>
								<h2 className="text-lg font-bold text-gray-900 dark:text-white">
									Share your list
								</h2>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Grant access to another registered GourmetList user.
								</p>
							</div>
							<button
								onClick={() => setIsShareModalOpen(false)}
								className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
								<X className="w-5 h-5 dark:text-white" />
							</button>
						</div>

						{sharedUsers.length > 0 && (
							<div className="mb-6">
								<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
									Already Shared With
								</h3>

								<div className="space-y-2">
									{sharedUsers.map((user) => (
										<div
											key={user.uid}
											className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-4 rounded-lg">
											<span className="text-sm text-gray-800 dark:text-gray-200">
												{user.email}
											</span>

											<button
												onClick={() => removeAccess(user.uid)}
												className="text-xs text-red-500 hover:text-red-700 font-medium">
												Remove
											</button>
										</div>
									))}
								</div>
							</div>
						)}

						<form onSubmit={handleShare} className="space-y-4">
							<div>
								<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
									Email address
								</label>
								<input
									type="email"
									required
									value={shareEmail}
									onChange={(e) => setShareEmail(e.target.value)}
									className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-500 outline-none dark:bg-gray-700 dark:text-white"
									placeholder="you@example.com"
								/>
							</div>
							<div className="flex justify-end gap-2">
								<button
									type="button"
									onClick={() => setIsShareModalOpen(false)}
									className="px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900">
									Cancel
								</button>
								<button
									type="submit"
									className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-lg transition-colors">
									Share access
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Edit Item Modal */}
			{isEditModalOpen && editingItem && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/40 backdrop-blur-sm"
						onClick={cancelEdit}></div>
					<div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in-up">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h2 className="text-lg font-bold text-gray-900 dark:text-white">
									Edit Item
								</h2>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Update the item name.
								</p>
							</div>
							<button
								onClick={cancelEdit}
								className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
								<X className="w-5 h-5 dark:text-white" />
							</button>
						</div>

						<form
							onSubmit={(e) => {
								e.preventDefault()
								saveEdit()
							}}
							className="space-y-4">
							<div>
								<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
									Item name
								</label>
								<input
									type="text"
									required
									value={editValue}
									onChange={(e) => setEditValue(e.target.value)}
									className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-500 outline-none dark:bg-gray-700 dark:text-white"
									placeholder="Enter item name"
									autoFocus
								/>
							</div>
							<div className="flex justify-end gap-2">
								<button
									type="button"
									onClick={cancelEdit}
									className="px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900">
									Cancel
								</button>
								<button
									type="submit"
									className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-lg transition-colors">
									Save
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{isDeleteModalOpen && deletingItem && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/40 backdrop-blur-sm"
						onClick={() => {
							setIsDeleteModalOpen(false)
							setDeletingItem(null)
						}}></div>
					<div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in-up">
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
								onClick={() => deleteItem(deletingItem.id)}
								className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-lg transition-colors">
								Confirm Delete
							</button>
						</div>
					</div>
				</div>
			)}

			{deleteModalIsOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/40 backdrop-blur-sm"
						onClick={() => setDeleteModalIsOpen(false)}></div>
					<div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in-up">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h2 className="text-lg font-bold text-gray-900 dark:text-white">
									Do you want to clear all items?
								</h2>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									This action cannot be undone.
								</p>
							</div>
						</div>

						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setDeleteModalIsOpen(false)}
								className="px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900">
								Cancel
							</button>
							<button
								type="button"
								onClick={handleClearAll}
								className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-lg transition-colors">
								Clear All
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Toast */}
			{toast && (
				<div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-accent-600 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 animate-slide-up">
					{toast}
				</div>
			)}
		</div>
	)
}
