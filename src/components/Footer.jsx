import { ShoppingBag } from "lucide-react"

export default function Footer() {
	return (
		<footer className="py-12 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 transition-colors">
			<div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
				<div className="flex items-center gap-2">
					<div className="text-accent-600 w-6 h-6 dark:text-accent-300">
						<ShoppingBag className="w-full h-full" />
					</div>
					<span className="font-bold text-gray-900 dark:text-white">
						GourmetList
					</span>
				</div>
				<p className="text-gray-500 dark:text-gray-400 text-sm">
					Built by{" "}
					<a
						href="https://teda.dev"
						className="text-accent-600 hover:text-orange-700 font-medium">
						Teda.dev
					</a>
					. &copy; {new Date().getFullYear()}
				</p>
			</div>
		</footer>
	)
}
