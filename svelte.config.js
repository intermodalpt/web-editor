import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter()
	},
	// Disable prerendering, as this is a dynamic app
	prerender: {
		crawl: false,
		handleHttpError: "warn",

	},
};

export default config;
