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
} from "lucide-react"
import { useChefBot } from "../hooks/useChefBot"
import Header from "../components/Header"
import clsx from "clsx"

export default function ShoppingListApp() {
	// State
	const [items, setItems] = useState(() => {
		try {
			const saved = localStorage.getItem("chef.list")
			return saved ? JSON.parse(saved) : []
		} catch {
			return []
		}
	})
	const [filter, setFilter] = useState("all")
	const [inputValue, setInputValue] = useState("")
	const [isChatOpen, setIsChatOpen] = useState(false)
	const [isShareModalOpen, setIsShareModalOpen] = useState(false)
	const [shareEmail, setShareEmail] = useState("")
	const [isDark, setIsDark] = useState(() => {
		return localStorage.getItem("chef.theme") === "dark"
	})
	const [toast, setToast] = useState(null)

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

	useEffect(() => {
		if (isDark) {
			document.documentElement.classList.add("dark")
			localStorage.setItem("chef.theme", "dark")
		} else {
			document.documentElement.classList.remove("dark")
			localStorage.setItem("chef.theme", "light")
		}
	}, [isDark])

	useEffect(() => {
		if (chatContainerRef.current) {
			chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
		}
	}, [chatHistory, isChatOpen])

	// Actions
	const addItem = (e) => {
		e.preventDefault()
		if (!inputValue.trim()) return
		const newItem = {
			id: Date.now().toString(),
			name: inputValue.trim(),
			completed: false,
			createdAt: Date.now(),
		}
		setItems([newItem, ...items])
		setInputValue("")
		showToast(`Added ${newItem.name}`)
	}

	const toggleItem = (id) => {
		setItems(
			items.map((item) =>
				item.id === id ? { ...item, completed: !item.completed } : item,
			),
		)
	}

	const deleteItem = (id) => {
		setItems(items.filter((item) => item.id !== id))
	}

	const clearCompleted = () => {
		setItems(items.filter((item) => !item.completed))
		showToast("Cleared completed items")
	}

	const clearAll = () => {
		if (window.confirm("Clear all items?")) {
			setItems([])
			showToast("Cleared all items")
		}
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

		const listContext = items.map((i) => i.name).join(", ")
		const systemPrompt = `You are Chef Bot, a friendly and creative culinary expert. 
    The user has a shopping list containing: ${listContext || "nothing yet"}. 
    Suggest recipes or advice based on these ingredients if asked. 
    Keep responses helpful, encouraging, and concise (under 100 words). 
    Format bold text with **asterisks**.`

		await generateResponse(text, systemPrompt)
	}

	const handleShare = (e) => {
		e.preventDefault()
		const unpurchased = items.filter((i) => !i.completed)
		if (!unpurchased.length) {
			showToast("Add unpurchased items to share")
			return
		}
		const listText = unpurchased.map((i) => `• ${i.name}`).join("\n")
		const subject = encodeURIComponent("My GourmetList (unpurchased items)")
		const body = encodeURIComponent(
			`Here are my items to buy:\n\n${listText}\n\nShared from GourmetList`,
		)
		window.location.href = `mailto:${shareEmail}?subject=${subject}&body=${body}`
		setIsShareModalOpen(false)
		setShareEmail("")
		showToast("Opening email app...")
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
				toggleChat={() => setIsChatOpen(!isChatOpen)}
				toggleTheme={() => setIsDark(!isDark)}
				isDark={isDark}
				openShare={() => setIsShareModalOpen(true)}
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
								className="w-full pl-5 pr-14 py-4 rounded-2xl border-none shadow-lg focus:ring-2 focus:ring-orange-500 outline-none text-lg text-gray-800 placeholder-gray-400 dark:bg-gray-800 dark:text-white"
							/>
							<button
								type="submit"
								className="absolute right-2 top-2 bottom-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 transition-colors">
								<Plus className="w-6 h-6" />
							</button>
						</form>
					</div>

					{/* Controls */}
					<div className="px-6 pb-2 max-w-3xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4">
						<div className="flex gap-2">
							{["all", "active", "completed"].map((f) => (
								<button
									key={f}
									onClick={() => setFilter(f)}
									className={clsx(
										"filter-btn capitalize",
										filter === f
											? "active"
											: "inactive dark:text-gray-400 dark:hover:bg-gray-800",
									)}>
									{f === "active"
										? "To Buy"
										: f === "completed"
											? "Done"
											: "All"}
								</button>
							))}
						</div>

						<div className="flex items-center gap-3">
							<button
								onClick={smartSort}
								className="text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-lg transition-colors dark:bg-orange-900/30 dark:text-orange-400">
								Smart Sort
							</button>
							<span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
								{completedCount}/{items.length} done
							</span>
						</div>
					</div>

					{/* Progress */}
					<div className="w-full h-1 bg-gray-200 dark:bg-gray-800">
						<div
							className="h-full bg-orange-500 transition-all duration-500"
							style={{ width: `${progress}%` }}></div>
					</div>

					{/* List */}
					<div className="flex-grow overflow-y-auto p-6 max-w-3xl mx-auto w-full space-y-2">
						{filteredItems.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
								<div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
									hey
									{/* <ShoppingBag className="w-8 h-8 text-gray-400" /> */}
								</div>
								<p className="text-gray-500 dark:text-gray-400 font-medium">
									Your list is empty.
								</p>
								<p className="text-sm text-gray-400 mt-1">
									Add items or ask Chef Bot for ideas!
								</p>
							</div>
						) : (
							filteredItems.map((item) => (
								<div
									key={item.id}
									className={clsx(
										"group flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200",
										item.completed &&
											"opacity-60 bg-gray-50 dark:bg-gray-800/50",
									)}>
									<label className="relative flex items-center justify-center cursor-pointer p-1">
										<input
											type="checkbox"
											className="peer sr-only item-checkbox"
											checked={item.completed}
											onChange={() => toggleItem(item.id)}
										/>
										<div
											className={clsx(
												"w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
												item.completed
													? "bg-orange-500 border-orange-500"
													: "border-gray-300 dark:border-gray-600 hover:border-orange-500",
											)}>
											{item.completed && (
												<Check
													className="w-3.5 h-3.5 text-white"
													strokeWidth={3}
												/>
											)}
										</div>
									</label>

									<span
										className={clsx(
											"flex-grow font-medium transition-all",
											item.completed
												? "line-through text-gray-400"
												: "text-gray-700 dark:text-gray-200",
										)}>
										{item.name}
									</span>

									<button
										onClick={() => deleteItem(item.id)}
										className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
							))
						)}
					</div>

					{/* Footer Actions */}
					<div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-[#f4f7f5] dark:bg-gray-900 flex flex-wrap items-center justify-center gap-3">
						<button
							onClick={clearCompleted}
							className="text-sm text-red-500 hover:text-red-600 font-medium hover:underline">
							Clear Completed
						</button>
						<button
							onClick={clearAll}
							className="text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 font-medium hover:underline">
							Clear All
						</button>
					</div>
				</section>

				{/* Chat Sidebar (Desktop) / Modal (Mobile) */}
				<aside
					className={clsx(
						"fixed inset-y-0 right-0 w-full lg:w-96 bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 z-30 flex flex-col border-l border-gray-200 dark:border-gray-800",
						isChatOpen
							? "translate-x-0"
							: "translate-x-full lg:translate-x-0 lg:w-0 lg:border-none lg:overflow-hidden",
					)}>
					{/* Chat Header */}
					<div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-600">
								<MessageSquare className="w-5 h-5" />
							</div>
							<div>
								<h3 className="font-bold text-gray-900 dark:text-white">
									Chef Bot
								</h3>
								<p className="text-xs text-gray-500 dark:text-gray-400">
									{isReady
										? "Online"
										: isAiLoading
											? `Loading... ${aiProgress}%`
											: "Offline"}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-1">
							<button
								onClick={clearChat}
								className="p-2 text-gray-400 hover:text-red-500"
								title="Clear chat">
								<Trash2 className="w-4 h-4" />
							</button>
							<button
								onClick={() => setIsChatOpen(false)}
								className="p-2 text-gray-400 hover:text-gray-600 lg:hidden">
								<X className="w-5 h-5" />
							</button>
						</div>
					</div>

					{/* Chat Messages */}
					<div
						className="flex-grow overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950 space-y-4"
						ref={chatContainerRef}>
						{!isReady && !isAiLoading && (
							<div className="text-center py-8">
								<button
									onClick={loadModel}
									className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors">
									Load Chef Bot
								</button>
								<p className="text-xs text-gray-500 mt-2 max-w-[200px] mx-auto">
									Downloads ~1GB model to your browser. Requires WebGPU.
								</p>
							</div>
						)}

						{isAiLoading && (
							<div className="flex flex-col items-center justify-center py-12 space-y-3">
								<Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
								<div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
									<div
										className="h-full bg-orange-500 transition-all duration-300"
										style={{ width: `${aiProgress}%` }}></div>
								</div>
								<p className="text-sm text-gray-500">
									Initializing AI... {aiProgress}%
								</p>
							</div>
						)}

						{chatHistory.map((msg, idx) => (
							<div
								key={idx}
								className={clsx(
									"flex w-full",
									msg.role === "user" ? "justify-end" : "justify-start",
								)}>
								<div
									className={clsx(
										"max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed prose",
										msg.role === "user"
											? "bg-gray-800 text-white rounded-tr-none"
											: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none shadow-sm",
									)}>
									{msg.content ? (
										<div
											dangerouslySetInnerHTML={{
												__html: msg.content
													.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
													.replace(/\n/g, "<br>"),
											}}
										/>
									) : (
										<span className="animate-pulse">...</span>
									)}
								</div>
							</div>
						))}
					</div>

					{/* Chat Input */}
					<div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
						<form onSubmit={handleChatSubmit} className="relative">
							<input
								ref={chatInputRef}
								type="text"
								placeholder={isReady ? "Ask for recipes..." : "Load AI first"}
								disabled={!isReady}
								className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-orange-500 outline-none text-sm dark:text-white"
							/>
							<button
								type="submit"
								disabled={!isReady}
								className="absolute right-2 top-2 p-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed">
								<Send className="w-4 h-4" />
							</button>
						</form>
					</div>
				</aside>
			</main>

			{/* Share Modal */}
			{isShareModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/40 backdrop-blur-sm"
						onClick={() => setIsShareModalOpen(false)}></div>
					<div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in-up">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h2 className="text-lg font-bold text-gray-900 dark:text-white">
									Share your list
								</h2>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									Send unpurchased items via email.
								</p>
							</div>
							<button
								onClick={() => setIsShareModalOpen(false)}
								className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
								<X className="w-5 h-5 dark:text-white" />
							</button>
						</div>
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
									className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 outline-none dark:bg-gray-700 dark:text-white"
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
									className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors">
									Send
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Toast */}
			{toast && (
				<div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50 animate-slide-up">
					{toast}
				</div>
			)}
		</div>
	)
}
