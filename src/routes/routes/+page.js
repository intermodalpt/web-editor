import { get } from 'svelte/store';
import { loadToken, routes, loadRoutes } from '$lib/stores.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const token = await loadToken(fetch);

	let routesData = get(routes);
	if (routesData === undefined) {
		routesData = await loadRoutes(fetch);
	}

	const sortedRoutes = Object.values(routesData).sort((ra, rb) => {
		if (!ra.code) {
			return -1;
		} else if (!rb.code) {
			return 1;
		} else {
			return (parseInt(ra.code) || 10000) - (parseInt(rb.code) || 10000);
		}
	});

	return {
		routes: sortedRoutes
	};
}
