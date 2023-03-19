import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { loadToken, stops, loadStops } from '$lib/stores.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	if (!browser) {
		return {
			stops: {}
		};
	}

	const token = await loadToken(fetch);

	if (get(stops) === undefined) {
		await loadStops(fetch);
	}

	return {
		stops: get(stops)
	};
}
