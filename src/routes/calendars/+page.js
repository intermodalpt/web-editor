import { browser } from '$app/environment';
import { loadToken, loadCalendars } from '$lib/stores.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, depends }) {
	if (!browser) {
		return { calendars: {} };
	}

	await loadToken(fetch);

	depends('app:calendars');

	return {
		calendars: await loadCalendars(fetch)
	};
}
