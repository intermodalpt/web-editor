import { loadToken } from '$lib/stores.js';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	if (browser) {
		let token = await loadToken(fetch);

		if (token) {
			return goto('/perfil');
		}
	}
}
