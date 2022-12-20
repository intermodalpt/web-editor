import { browser } from '$app/environment';
import { loadToken, loadRoutes } from '$lib/stores.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, depends }) {
	let routeId = params.route;

	depends('app:subroutes');

	if (browser) {
		await loadToken(fetch);
	}

	let routes = await loadRoutes(fetch);

	return {
		route: routes[routeId]
	};
}
