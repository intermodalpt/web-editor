import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import { fetchRoutes, getRoute, fetchOperators, getOperator } from '$lib/db';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const routeId = parseInt(params.routeId);
	const operatorId = parseInt(params.opId);

	if (!browser) {
		return;
	}

	await fetchOperators(fetch);
	const operator = await getOperator(operatorId);

	if (!operator) {
		throw error(404, 'Operator not found');
	}

	await fetchRoutes(fetch);
	const route = await getRoute(routeId);

	if (!route) {
		throw error(404, 'Operator not found');
	}

	return {
		operator: operator,
		route: route,
	};
}
