import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import { fetchRoutes, getRoutes } from '$lib/db';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	if (!browser) {
		return;
	}

	const routeId = params.routeId;

	await fetchRoutes();
	let routes = await getRoutes();

	if (routes[routeId] === undefined) {
		throw error(404, 'Route not found');
	}

	return {
		route: routes[routeId],
	};
}
