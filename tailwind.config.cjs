/** @type {import('tailwindcss').Config} */

/*mytheme: {
  "primary": "#81c423",
  "secondary": "#f9b1cf",
  "accent": "#f2e94b",
  "neutral": "#1D1A28",
  "base-100": "#362E60",
  "info": "#90A1F9",
  "success": "#19D28E",
  "warning": "#D7A914",
  "error": "#E75073",
},*/

module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {}
	},
	plugins: [require('daisyui')],

	daisyui: {
		themes: [
			{
				mytheme: {
					primary: '#a3e635',
					secondary: '#854d0e',
					accent: '#e226c6',
					neutral: '#1c1917',
					'base-100': '#ffffff',
					'base-200': '#f3f4f6',
					'base-300': '#bcc2cd',
					info: '#2971D6',
					success: '#78EDA7',
					warning: '#F8DA44',
					error: '#f87171'
				}
			}
		]
	}
};
