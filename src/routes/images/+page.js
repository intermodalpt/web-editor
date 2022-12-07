import { dev, browser } from '$app/environment';
import { get } from 'svelte/store';
import { loadToken, stops, loadStops } from '$lib/stores.js';
import { api_server } from '$lib/settings';

// we don't need any JS on this page, though we'll load
// it in dev so that we get hot module replacement
export const csr = dev;

// since there's no dynamic data here, we can prerender
// it so that it gets served as a static asset in production
export const prerender = true;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	if (!browser) {
		return {
			untagged: []
		};
	}

	const token = await loadToken(fetch);

	let untagged = await fetch(`${api_server}/v1/tagging/stops/untagged?p=0`, {
		headers: {
			authorization: `Bearer ${token}`
		}
	}).then((r) => r.json());

	// Might be unneeded
	if (get(stops) === undefined) {
		await loadStops(fetch);
	}

	return {
		untagged: untagged
	};
}
