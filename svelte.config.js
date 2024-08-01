import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	kit: {
		adapter: adapter()
	},
	// Disable prerendering, as this is a dynamic app
	prerender: {
		crawl: false,
		handleHttpError: 'warn'
	},
	preprocess: vitePreprocess()
};

export default config;
