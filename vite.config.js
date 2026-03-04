import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
	base: "/gourmetlist-smart-shopping-chef-bot/",
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			workbox: {
				maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // safety limit
			},
			manifest: {
				name: "GourmetList",
				short_name: "GourmetList",
				description: "Smart collaborative shopping list app",
				theme_color: "#f97316",
				background_color: "#f4f7f5",
				display: "standalone",
				start_url: "/gourmetlist-smart-shopping-chef-bot/",
				scope: "/gourmetlist-smart-shopping-chef-bot/",
				icons: [
					{
						src: "/gourmetlist-smart-shopping-chef-bot/icon-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "/gourmetlist-smart-shopping-chef-bot/icon-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
				],
			},
		}),
	],

	// 🔥 PRODUCTION OPTIMIZATION
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					// Firebase heavy SDK separated
					firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],

					// React ecosystem separated
					react: ["react", "react-dom"],

					// Optional: lucide icons separate
					icons: ["lucide-react"],
				},
			},
		},
	},
})
