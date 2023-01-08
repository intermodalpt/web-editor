import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { loadToken, stops, pictures, loadStops, loadPictures } from '$lib/stores.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	if (!browser) {
		return {
			stops: {},
			pictures: {}
		};
	}

	const token = await loadToken(fetch);

	if (get(stops) === undefined) {
		await loadStops(fetch);
	}

	if (token) {
		if (get(pictures) === undefined) {
			await loadPictures(fetch, token);
		}
	}

	return {
		stops: get(stops),
		pictures: token ? get(pictures) : {}
	};
}
