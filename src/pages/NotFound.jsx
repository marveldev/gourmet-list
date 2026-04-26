import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

export default function NotFound() {
	const { currentUser } = useAuth()

	return (
		<div className="relative min-h-screen overflow-hidden bg-[#fcfbf9] dark:bg-gray-900 flex items-center justify-center px-6 py-10">
			<div className="pointer-events-none absolute -top-28 -right-20 h-72 w-72 rounded-full bg-accent-100/60 blur-3xl dark:bg-accent-900/20" />
			<div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-accent-100/50 blur-3xl dark:bg-accent-900/20" />

			<div className="relative w-full max-w-2xl rounded-3xl border border-gray-200 bg-white/95 p-8 text-center shadow-xl backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/95 md:p-10">
				<div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent-50 dark:bg-accent-900/30">
					<svg
						viewBox="0 0 120 120"
						className="h-12 w-12 text-accent-600 dark:text-accent-300"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true">
						<circle cx="60" cy="60" r="46" stroke="currentColor" strokeWidth="8" opacity="0.2" />
						<path d="M43 52C43 42.6112 50.6112 35 60 35V35C69.3888 35 77 42.6112 77 52V52" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
						<path d="M52 70L68 54" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
						<circle cx="49" cy="75" r="5" fill="currentColor" />
						<circle cx="72" cy="75" r="5" fill="currentColor" />
					</svg>
				</div>

				<p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent-600 dark:text-accent-300">
					Error 404
				</p>
				<h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
					Page not found
				</h1>
				<p className="mx-auto mb-8 max-w-md text-sm text-gray-600 dark:text-gray-300 md:text-base">
					This page doesn’t exist anymore or the link is incorrect. Let’s get you
					back to something useful.
				</p>

				<div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
					<Link
						to="/"
						className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 sm:w-auto">
						Go home
					</Link>
					<Link
						to={currentUser ? "/shopping-list" : "/signin"}
						className="w-full rounded-xl bg-accent-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-700 sm:w-auto">
						{currentUser ? "Open list" : "Sign in"}
					</Link>
				</div>
			</div>
		</div>
	)
}
