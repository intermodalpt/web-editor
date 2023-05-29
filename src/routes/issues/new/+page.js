import { browser } from '$app/environment';
import { loadToken, loadRoutes, loadStops } from '$lib/stores.js';
import { apiServer } from '$lib/settings';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	if (!browser) {
		return;
	}

	let token = await loadToken(fetch);


	const [stops, routes] = await Promise.all([
		loadStops(fetch),
		loadRoutes(fetch)
	]);


	return {
		stops: stops,
		routes: routes
	};
}
