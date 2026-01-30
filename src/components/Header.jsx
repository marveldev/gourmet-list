import React from "react"
import { Link } from "react-router-dom"
import { MessageSquare, Share2, Moon, Sun, ShoppingBag } from "lucide-react"

export default function Header({
	openChefBot,
	toggleTheme,
	isDark,
	openShare,
}) {
	return (
		<header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 flex-shrink-0 z-20 transition-colors">
			<div className="h-full px-4 md:px-6 flex items-center justify-between max-w-7xl mx-auto w-full">
				<Link to="/" className="flex items-center gap-2 group">
					<div className="text-accent-600 w-6 h-6 group-hover:scale-110 transition-transform">
						<ShoppingBag className="w-full h-full" />
					</div>
					<span className="font-bold text-gray-900 dark:text-white group-hover:text-accent-600 transition-colors">
						GourmetList
					</span>
				</Link>

				<div className="flex items-center gap-2">
					<button
						onClick={openChefBot}
						className="btn-icon relative dark:text-gray-300 dark:hover:bg-gray-800">
						<MessageSquare className="w-6 h-6" />
						<span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full"></span>
					</button>

					{openShare && (
						<button
							onClick={openShare}
							className="btn-icon dark:text-gray-300 dark:hover:bg-gray-800"
							title="Share list">
							<Share2 className="w-6 h-6" />
						</button>
					)}

					<button
						onClick={toggleTheme}
						className="btn-icon dark:text-gray-300 dark:hover:bg-gray-800"
						title={isDark ? "Switch to light theme" : "Switch to dark theme"}>
						{isDark ? (
							<Sun className="w-6 h-6" />
						) : (
							<Moon className="w-6 h-6" />
						)}
					</button>
				</div>
			</div>
		</header>
	)
}
