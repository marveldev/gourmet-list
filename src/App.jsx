import {
	BrowserRouter as Router,
	Routes,
	Route,
} from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import { ThemeProvider } from "./contexts/ThemeContext"
import Landing from "./pages/Landing"
import SignIn from "./pages/SignIn"
import SignUp from "./pages/SignUp"
import ShoppingList from "./pages/ShoppingList"
import NotFound from "./pages/NotFound"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {
	return (
		<Router>
			<ThemeProvider>
				<AuthProvider>
					<Routes>
						<Route path="/" element={<Landing />} />
						<Route path="/signin" element={<SignIn />} />
						<Route path="/login" element={<SignIn />} />
						<Route path="/signup" element={<SignUp />} />
						<Route element={<ProtectedRoute />}>
							<Route path="/shopping-list" element={<ShoppingList />} />
						</Route>
						<Route path="*" element={<NotFound />} />
					</Routes>
				</AuthProvider>
			</ThemeProvider>
		</Router>
	)
}

export default App
