import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import { fetchRoutes, getRoute, fetchOperators, getOperator } from '$lib/db';
import { apiServer } from '$lib/settings';

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

    const routeTypesRes = await fetch(`${apiServer}/v1/operators/${operatorId}/routes/types`);

    if (!routeTypesRes.ok) {
        throw error(500, 'Failed to fetch route types');
    }

    const routeTypes = await routeTypesRes.json();

	return {
		operator: operator,
		route: route,
        routeTypes: routeTypes
	};
}
