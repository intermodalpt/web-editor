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
		themes: ["winter"]
	}
};
