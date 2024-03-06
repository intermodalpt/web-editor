import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import { fetchOperators, getOperator } from '$lib/db';
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

	const [routeRes, routeTypesRes] = await Promise.all([
		fetch(`${apiServer}/v1/routes/${routeId}/full`),
		fetch(`${apiServer}/v1/operators/${operatorId}/routes/types`)
	]);

	if (!routeRes.ok) {
		if (routeRes.status === 0) {
			throw error(500, 'Failed to connect to server');
		} else if (routeRes.status === 404) {
			throw error(404, 'Route not found');
		} else {
			throw error(500, 'Failed to fetch route');
		}
	}
	if (!routeTypesRes.ok) {
		if (routeTypesRes.status === 0) {
			throw error(500, 'Failed to connect to server');
		} else if (routeTypesRes.status === 404) {
			throw error(404, 'Route types not found');
		} else {
			throw error(500, 'Failed to fetch route types');
		}
	}

	const route = await routeRes.json();
	const routeTypes = await routeTypesRes.json();

	return {
		operator: operator,
		route: route,
		routeTypes: routeTypes
	};
}
