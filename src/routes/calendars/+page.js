import { dev, browser } from '$app/environment';
import { get } from 'svelte/store';
import { loadToken, loadCalendars } from '$lib/stores.js';

// we don't need any JS on this page, though we'll load
// it in dev so that we get hot module replacement
export const csr = dev;

// since there's no dynamic data here, we can prerender
// it so that it gets served as a static asset in production
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	if (!browser) {
		return { calendars: {} };
	}
	const token = await loadToken(fetch);

	return {
		calendars: await loadCalendars(fetch)
	};
}
