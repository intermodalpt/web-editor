import { browser } from '$app/environment';
import { loadToken } from '$lib/stores.js';
import { goto } from '$app/navigation';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	if (!browser) {
		return;
	}

	const token = await loadToken(fetch);
}
