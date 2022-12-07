import { dev, browser } from '$app/environment';
import { get } from 'svelte/store';
import { loadToken, stops, loadStops, routes, loadRoutes } from '$lib/stores.js';
import { parseJwt } from '$lib/utils.js';
import { api_server } from '$lib/settings';
import { goto } from '$app/navigation';

// we don't need any JS on this page, though we'll load
// it in dev so that we get hot module replacement
export const csr = dev;

// since there's no dynamic data here, we can prerender
// it so that it gets served as a static asset in production
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const token = await loadToken(fetch);


	// if (!browser) {
	// 	return {
	// 		decided: [],
	// 		undecided: []
	// 	};
	// }

	if (get(stops) === undefined) {
		await loadStops(fetch);
	}

	if (get(routes) === undefined) {
		await loadRoutes(fetch);
	}


	return {
		stops: stops,
		routes: routes
	};
}
