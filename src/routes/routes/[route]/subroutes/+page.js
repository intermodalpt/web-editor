import { error } from '@sveltejs/kit';
import { fetchRoutes, getRoute } from '$lib/db';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, depends }) {
	let routeId = parseInt(params.route);

	depends('app:subroutes');

	await fetchRoutes(fetch);
	const route = await getRoute(routeId);

	if (!route) {
		throw error(404, 'Route not found');
	}

	return {
		route: route
	};
}
