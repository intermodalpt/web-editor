import { loadToken } from '$lib/stores.js';
import { browser } from '$app/environment';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	if (browser) {
		await loadToken(fetch);
	}
}
