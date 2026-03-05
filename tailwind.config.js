/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,html}"],
	darkMode: "class",
	theme: {
		extend: {
			fontFamily: {
				sans: ['"Plus Jakarta Sans"', "sans-serif"],
			},
			colors: {
				// Custom palette from original styles/main.css
				accent: {
					50: "#f8e9f2",
					100: "#f2d3e6",
					300: "#d38ab3",
					400: "#c36b9b",
					500: "#a94f83",
					600: "#8c3f6d",
					700: "#723258",
					900: "#421d34",
				},
				// Mapping specific fuchsia overrides if needed, or just using accent
				fuchsia: {
					50: "#f8e9f2",
					100: "#f2d3e6",
					500: "#a94f83",
					600: "#8c3f6d",
					700: "#723258",
					900: "#421d34",
				},
			},
			animation: {
				"fade-in-up": "fadeInUp 0.4s ease-out forwards",
				"slide-up": "slideUp 0.3s ease-out forwards",
			},
			keyframes: {
				fadeInUp: {
					"0%": { opacity: "0", transform: "translateY(10px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
				slideUp: {
					"0%": { transform: "translate(-50%, 100%)", opacity: "0" },
					"100%": { transform: "translate(-50%, 0)", opacity: "1" },
				},
			},
		},
	},
	plugins: [],
}
