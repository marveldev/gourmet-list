import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { UserPlus, AlertCircle } from "lucide-react"

export default function SignUp() {
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [error, setError] = useState("")
	const [loading, setLoading] = useState(false)
	const { signup, googleSignIn } = useAuth()
	const navigate = useNavigate()

	async function handleSubmit(e) {
		e.preventDefault()
		if (password !== confirmPassword) {
			return setError("Passwords do not match")
		}
		try {
			setError("")
			setLoading(true)
			await signup(email, password)
			navigate("/shopping-list")
		} catch (err) {
			setError("Failed to create an account.")
			console.error(err)
		}
		setLoading(false)
	}

	async function handleGoogleSignIn() {
		try {
			setError("")
			setLoading(true)
			await googleSignIn()
			navigate("/shopping-list")
		} catch (err) {
			setError("Failed to sign in with Google.")
			console.error(err)
		}
		setLoading(false)
	}

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
			<div className="w-full max-w-md">
				<div className="bg-white shadow-xl rounded-3xl overflow-hidden border border-gray-100">
					<div className="px-6 py-8 bg-gradient-to-r from-accent-600 to-accent-700 text-white">
						<div className="flex items-center gap-3 mb-4">
							<div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold">
								<UserPlus className="w-5 h-5" />
							</div>
							<div>
								<p className="text-sm text-fuchsia-100">Join Basket</p>
								<h1 className="text-2xl font-bold leading-tight">
									Create Account
								</h1>
							</div>
						</div>
						<p className="text-sm text-fuchsia-100">
							Sync your lists everywhere.
						</p>
					</div>

					<div className="px-6 py-8 space-y-6">
						{error && (
							<div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
								<AlertCircle className="w-4 h-4" />
								{error}
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-5">
							<div className="space-y-2">
								<label className="block text-sm font-semibold text-gray-700">
									Email
								</label>
								<input
									type="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-fuchsia-500 outline-none bg-gray-50"
									placeholder="you@example.com"
								/>
							</div>
							<div className="space-y-2">
								<label className="block text-sm font-semibold text-gray-700">
									Password
								</label>
								<input
									type="password"
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-fuchsia-500 outline-none bg-gray-50"
									placeholder="••••••••"
								/>
							</div>
							<div className="space-y-2">
								<label className="block text-sm font-semibold text-gray-700">
									Confirm Password
								</label>
								<input
									type="password"
									required
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:ring-2 focus:ring-fuchsia-500 outline-none bg-gray-50"
									placeholder="••••••••"
								/>
							</div>

							<button
								type="submit"
								disabled={loading}
								className="w-full bg-gradient-to-r from-accent-600 to-accent-700 text-white py-4 rounded-2xl font-extrabold shadow-lg hover:from-accent-700 hover:to-accent-900 transition-all disabled:opacity-50">
								{loading ? "Creating Account..." : "Create Account"}
							</button>
						</form>

						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-gray-200"></div>
							</div>
							<div className="relative flex justify-center text-sm">
								<span className="px-2 bg-white text-gray-500">
									or continue with
								</span>
							</div>
						</div>

						<button
							onClick={handleGoogleSignIn}
							disabled={loading}
							className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors">
							<svg className="w-5 h-5" viewBox="0 0 24 24">
								<path
									fill="#4285F4"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								/>
								<path
									fill="#34A853"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								/>
								<path
									fill="#FBBC05"
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								/>
								<path
									fill="#EA4335"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								/>
							</svg>
							Google
						</button>

						<div className="text-center text-sm text-gray-600">
							<span>Already have an account? </span>
							<Link
								to="/signin"
								className="text-accent-600 font-semibold hover:text-accent-700">
								Sign in
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
