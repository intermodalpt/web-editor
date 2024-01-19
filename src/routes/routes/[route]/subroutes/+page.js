import { error } from '@sveltejs/kit';
import { loadRoutes } from '$lib/stores.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, depends }) {
	let routeId = params.route;

	depends('app:subroutes');

	let routes = await loadRoutes(fetch);

	if (routes[routeId] === undefined) {
		throw error(404, 'Route not found');
	}

	return {
		route: routes[routeId]
	};
}
