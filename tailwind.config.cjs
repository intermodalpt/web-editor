/** @type {import('tailwindcss').Config} */

module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {}
	},
	plugins: [require('daisyui')],

	daisyui: {
		themes: [
			{
				winter: {
					...require('daisyui/src/theming/themes')['[data-theme=winter]'],
					secondary: '#60a5fa',
					success: '#22c55e',
					warning: '#fcd34d',
					info: '#3abff8',
					error: '#f87171'
				}
			}
		]
	}
};
