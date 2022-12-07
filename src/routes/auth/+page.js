import { loadToken } from '$lib/stores.js';
import { browser } from '$app/environment';

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	if (browser) {
		await loadToken(fetch);
	}
}
