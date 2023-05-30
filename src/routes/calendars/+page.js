import { browser } from '$app/environment';
import { loadToken } from '$lib/stores.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, depends }) {
	if (!browser) {
		return { calendars: {} };
	}

	await loadToken(fetch);
}
