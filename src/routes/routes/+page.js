import { dev, browser } from '$app/environment';
import { get } from 'svelte/store';
import { loadToken, routes, loadRoutes } from '$lib/stores.js';

// we don't need any JS on this page, though we'll load
// it in dev so that we get hot module replacement
export const csr = dev;

// since there's no dynamic data here, we can prerender
// it so that it gets served as a static asset in production
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	if (browser) {
		const token = await loadToken(fetch);
	}

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
