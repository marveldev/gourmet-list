import { useState } from "react"
import { ShoppingBag, Sun, Moon, Menu, X } from "lucide-react"
import { Link } from "react-router-dom"

export default function Navbar({ currentUser, toggleTheme, isDark, logout }) {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<nav className="fixed top-0 left-0 right-0 z-50 bg-[#fcfbf9]/80 dark:bg-gray-900 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
				{/* Logo */}
				<div className="flex items-center gap-2">
					<ShoppingBag className="w-7 h-7 text-accent-600 dark:text-accent-300" />
					<span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
						GourmetList
					</span>
				</div>

				{/* Desktop Menu */}
				<div className="hidden md:flex items-center gap-4">
					<button
						onClick={toggleTheme}
						className="inline-flex items-center justify-center w-10 h-10 rounded-full 
            text-gray-700 dark:bg-[#723258e7] bg-accent-700/5 
            hover:bg-accent-700/20 transition-colors">
						{isDark ? (
							<Sun className="w-5 h-5 text-accent-100" />
						) : (
							<Moon className="w-5 h-5 text-accent-700" />
						)}
					</button>

					{!currentUser ? (
						<>
							<Link
								to="/signin"
								className="px-4 py-2.5 rounded-full text-sm font-semibold text-white 
                bg-gradient-to-r from-accent-600 to-accent-700 shadow-md">
								Sign In
							</Link>
							<Link
								to="/signup"
								className="px-4 py-2.5 rounded-full text-sm font-semibold 
                text-accent-700 border-2 border-accent-600 hover:bg-accent-50">
								Create Account
							</Link>
						</>
					) : (
						<>
							<Link
								to="/shopping-list"
								className="bg-fuchsia-600 text-white px-5 py-2.5 rounded-full font-medium text-sm">
								Launch App
							</Link>
							<button
								onClick={logout}
								className="text-sm font-semibold text-gray-600 hover:text-gray-900 
                dark:text-gray-300 dark:hover:text-white">
								Sign Out
							</button>
						</>
					)}
				</div>

				{/* Mobile Right Section */}
				<div className="flex items-center gap-4 md:hidden">
					<button
						onClick={toggleTheme}
						className="w-9 h-9 flex items-center justify-center rounded-full 
            bg-accent-700/5 dark:bg-[#723258e7]">
						{isDark ? <Sun size={18} /> : <Moon size={18} />}
					</button>

					<button onClick={() => setIsOpen(!isOpen)}>
						{isOpen ? <X size={26} /> : <Menu size={26} />}
					</button>
				</div>
			</div>

			{/* Mobile Dropdown Menu */}
			{isOpen && (
				<div
					className="md:hidden absolute top-full right-4 mt-2 w-64 
    bg-white dark:bg-gray-900 rounded-2xl shadow-xl 
    border border-gray-200 dark:border-gray-800 
    p-4 animate-in fade-in slide-in-from-top-2 duration-200">
					<div className="flex flex-col gap-3">
						{!currentUser ? (
							<>
								<Link
									to="/signin"
									onClick={() => setIsOpen(false)}
									className="w-full text-center py-2.5 rounded-lg font-semibold 
            text-white bg-gradient-to-r from-accent-600 to-accent-700">
									Sign In
								</Link>

								<Link
									to="/signup"
									onClick={() => setIsOpen(false)}
									className="w-full text-center py-2.5 rounded-lg font-semibold 
            border-2 border-accent-600 text-accent-700">
									Create Account
								</Link>
							</>
						) : (
							<>
								<Link
									to="/shopping-list"
									onClick={() => setIsOpen(false)}
									className="w-full text-center py-2.5 rounded-lg font-semibold 
            bg-fuchsia-600 text-white">
									Launch App
								</Link>

								<button
									onClick={() => {
										logout()
										setIsOpen(false)
									}}
									className="w-full text-center py-2.5 rounded-lg font-semibold 
            border border-gray-300 dark:border-gray-700 
            text-gray-700 dark:text-gray-300">
									Sign Out
								</button>
							</>
						)}
					</div>
				</div>
			)}
		</nav>
	)
}
