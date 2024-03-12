/** @type {import('tailwindcss').Config} */

module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {}
	},
	plugins: [require('daisyui')],

	safelist: [
		'alert-info',
		'alert-success',
		'alert-warning',
		'alert-error'
	],

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
