import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { ShoppingBag, Moon, Sun, ArrowRight, Check } from "lucide-react"
import Footer from "../components/Footer"
import { useTheme } from "../contexts/ThemeContext"

export default function Landing() {
	const { currentUser, logout } = useAuth()
	const { isDark, toggleTheme } = useTheme()

	return (
		<div className="min-h-screen flex flex-col bg-[#fcfbf9] dark:bg-gray-900">
			{/* Nav */}
			<nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#fcfbf9]/80 dark:bg-gray-900 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
				<div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
					<div className="flex items-center gap-2">
						<div className="text-accent-600 w-8 h-8 dark:text-accent-300">
							<ShoppingBag className="w-full h-full" />
						</div>
						<span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
							GourmetList
						</span>
					</div>
					<div className="flex md:gap-6 gap-2 items-center">
						<button
							onClick={toggleTheme}
							className="inline-flex items-center justify-center w-10 h-10 rounded-full text-gray-700 dark:bg-[#723258e7] bg-accent-700/5 hover:bg-accent-700/20 transition-colors">
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
									className="hidden md:block px-4 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-accent-600 to-accent-700 shadow-md hover:shadow-lg transition-all">
									Sign In
								</Link>
								<Link
									to="/signup"
									className="hidden md:block px-4 py-2.5 rounded-full text-sm font-semibold text-accent-700 border-2 border-accent-600 hover:bg-accent-50 transition-all">
									Create Account
								</Link>
							</>
						) : (
							<>
								<Link
									to="/shopping-list"
									className="bg-fuchsia-600 text-white px-5 py-2.5 rounded-full font-medium text-sm hover:bg-fuchsia-700 transition-colors shadow-lg shadow-fuchsia-900/20">
									Launch App
								</Link>
								<button
									onClick={logout}
									className="hidden md:block text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
									Sign Out
								</button>
							</>
						)}
					</div>
				</div>
			</nav>

			{/* Hero */}
			<section className="relative pt-28 pb-20 md:pt-48 md:pb-32 overflow-hidden flex-grow">
				{/* Background Blobs */}
				<div className="dark:hidden absolute top-0 right-0 w-[800px] h-[800px] bg-fuchsia-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 z-0 pointer-events-none"></div>
				<div className="dark:hidden absolute bottom-0 left-0 w-[600px] h-[600px] bg-fuchsia-100/50 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 z-0 pointer-events-none"></div>

				<div className="max-w-7xl mx-auto px-6 relative z-10">
					<div className="flex flex-col lg:flex-row items-center gap-16">
						<div className="lg:w-[55%]">
							<h1 className="hero-text mb-8 dark:text-white">
								Shopping lists that{" "}
								<span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-600 to-accent-700">
									actually work
								</span>
								.
							</h1>
							<p className="text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed max-w-lg">
								Stop sending texts. Stop forgetting milk. Basket is the
								local-first, AI-powered list that keeps your household in
								perfect sync.
							</p>
							<div className="flex flex-col sm:flex-row gap-4">
								<Link
									to={currentUser ? "/shopping-list" : "/signin"}
									className="btn-primary text-center flex items-center justify-center gap-2">
									Start Shopping Free
									<ArrowRight className="w-5 h-5" />
								</Link>
								<a
									href="#features"
									className="btn-outline text-center dark:border-white dark:text-white dark:hover:bg-white/10">
									See Features
								</a>
							</div>
						</div>

						<div className="lg:w-[45%] relative hidden md:block">
							{/* Decorative visual */}
							<div className="relative bg-white rounded-[2.5rem] shadow-2xl shadow-fuchsia-900/10 border-8 border-gray-900 overflow-hidden transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500 ease-out">
								<div className="h-6 bg-gray-900 w-full absolute top-0 left-0 z-20 flex justify-center">
									<div className="w-20 h-4 bg-black rounded-b-xl"></div>
								</div>
								<div className="bg-gray-50 p-6 pt-12 h-[500px] flex flex-col">
									<div className="flex justify-between items-end mb-6">
										<h2 className="text-2xl font-bold text-gray-900">
											Groceries
										</h2>
										<span className="text-fuchsia-600 font-bold bg-fuchsia-100 px-3 py-1 rounded-full text-xs">
											Sync On
										</span>
									</div>
									<div className="space-y-3">
										<div className="dark:bg-gray-800 bg-[#fff] p-4 rounded-xl shadow-sm flex items-center gap-3 border-l-4 border-fuchsia-500">
											<div className="w-6 h-6 rounded-full border-2 border-fuchsia-500 flex items-center justify-center bg-fuchsia-500 text-white">
												<Check className="w-3 h-3" />
											</div>
											<div className="flex-1">
												<span className="line-through text-gray-400">
													Almond Milk
												</span>
											</div>
										</div>
										<div className="dark:bg-gray-800 bg-[#fff] p-4 rounded-xl shadow-sm flex items-center gap-3 border-l-4 border-orange-400">
											<div className="w-6 h-6 rounded-full border-2 border-gray-200"></div>
											<div className="flex-1">
												<span className="text-gray-800 font-medium">
													Avocados (3)
												</span>
											</div>
											<span className="text-xs text-gray-400">Produce</span>
										</div>
										<div className="mt-4 bg-fuchsia-900 rounded-xl p-4 text-white relative overflow-hidden">
											<div className="absolute -right-4 -top-4 w-16 h-16 bg-fuchsia-700 rounded-full blur-xl"></div>
											<p className="text-xs text-fuchsia-300 uppercase font-bold mb-1">
												AI Chef Suggests
											</p>
											<p className="text-sm font-medium">
												"Don't forget eggs for that avocado toast!"
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Features */}
			<div
				id="features"
				className="bg-gray-900 text-white py-24 overflow-hidden">
				<div className="max-w-7xl mx-auto px-6">
					<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
						<div className="md:w-1/3">
							<h3 className="text-3xl font-bold mb-4">Smart Sorting</h3>
							<p className="text-gray-400 leading-relaxed">
								Our local AI automatically categorizes your messy inputs. Type
								"apples milk bread" and watch it organize by aisle.
							</p>
						</div>
						<div className="md:w-1/3">
							<h3 className="text-3xl font-bold mb-4">Chef Assistant</h3>
							<p className="text-gray-400 leading-relaxed">
								Stuck on dinner? Ask the built-in AI Chef for ideas and
								instantly add ingredients to your list.
							</p>
						</div>
						<div className="md:w-1/3">
							<h3 className="text-3xl font-bold mb-4">Snapshot Share</h3>
							<p className="text-gray-400 leading-relaxed">
								Send a magical link to your partner. No account setup required.
								Just share and shop.
							</p>
						</div>
					</div>
				</div>
			</div>

			<section id="how-it-works" className="py-24">
				<div className="max-w-7xl mx-auto px-6">
					<div className="flex flex-col md:flex-row gap-12 items-center">
						<div className="md:w-1/2">
							<span className="text-fuchsia-600 font-bold tracking-wider uppercase text-sm">
								Workflow
							</span>
							<h2 className="text-4xl font-bold mt-2 mb-6 text-gray-900">
								Keep shopping in sync.
							</h2>
							<p className="dark:text-gray-400 text-lg text-gray-600 mb-8">
								We use advanced browser technologies to keep your data local and
								secure. AI runs on your device, not a server.
							</p>
							<ul className="space-y-4">
								<li className="flex items-center gap-3">
									<div className="w-6 h-6 rounded-full bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center text-sm font-bold">
										1
									</div>
									<span className="text-gray-700 font-medium">
										Open the app (instantly loads)
									</span>
								</li>
								<li className="flex items-center gap-3">
									<div className="w-6 h-6 rounded-full bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center text-sm font-bold">
										2
									</div>
									<span className="text-gray-700 font-medium">
										Add items or ask AI for recipes
									</span>
								</li>
								<li className="flex items-center gap-3">
									<div className="w-6 h-6 rounded-full bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center text-sm font-bold">
										3
									</div>
									<span className="text-gray-700 font-medium">
										Share link with housemates
									</span>
								</li>
							</ul>
						</div>
						<div className="md:w-1/2 -mx-4 sm:-mx-6 md:mx-0">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="bg-orange-50 p-6 sm:p-6 rounded-xl flex items-start gap-4">
									<span className="text-xl">⚡</span>
									<div>
										<p className="font-bold text-orange-900 text-base sm:text-lg">
											Fast
										</p>
										<p className="text-sm sm:text-base text-orange-800/80">
											Updates sync instantly across devices.
										</p>
									</div>
								</div>

								<div className="bg-fuchsia-50 p-6 sm:p-6 rounded-xl flex items-start gap-4">
									<span className="text-xl">🔒</span>
									<div>
										<p className="font-bold text-fuchsia-900 text-base sm:text-lg">
											Secure
										</p>
										<p className="text-sm sm:text-base text-fuchsia-800/80">
											Your data stays private and encrypted.
										</p>
									</div>
								</div>

								<div className="bg-gray-100 p-6 sm:p-6 rounded-xl flex items-start gap-4">
									<span className="text-xl">🕶</span>
									<div>
										<p className="font-bold text-gray-900 text-base sm:text-lg">
											Private
										</p>
										<p className="text-sm sm:text-base text-gray-700">
											No ads. No tracking. Ever.
										</p>
									</div>
								</div>

								<div className="bg-fuchsia-900 p-6 sm:p-6 rounded-xl flex items-start gap-4">
									<span className="text-xl">🧠</span>
									<div>
										<p className="font-bold text-white text-base sm:text-lg">
											Smart
										</p>
										<p className="text-sm sm:text-base text-fuchsia-100">
											AI suggestions that actually help.
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<Footer />
		</div>
	)
}
