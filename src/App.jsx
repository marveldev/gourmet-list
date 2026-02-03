import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import Landing from "./pages/Landing"
import List from "./pages/List"
import SignIn from "./pages/SignIn"
import SignUp from "./pages/SignUp"
import ShoppingList from "./pages/ShoppingList"

function App() {
	return (
		<Router>
			<AuthProvider>
				<Routes>
					<Route path="/" element={<Landing />} />
					<Route path="/shopping-list" element={<ShoppingList />} />
					<Route path="/signin" element={<SignIn />} />
					<Route path="/signup" element={<SignUp />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</AuthProvider>
		</Router>
	)
}

export default App
