import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import { fetchOperators, getOperator } from '$lib/db';
import { apiServer } from '$lib/settings';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const routeId = parseInt(params.routeId);
	const operatorId = parseInt(params.opId);

	if (!browser) {
		return;
	}

	await fetchOperators(fetch);
	const operator = await getOperator(operatorId);

	if (!operator) {
		error(404, 'Operator not found');
	}

	const [stopsRes, routeRes, routeTypesRes] = await Promise.all([
		fetch(`${apiServer}/v1/operators/${operatorId}/stops/full`),
		fetch(`${apiServer}/v1/routes/${routeId}/full`),
		fetch(`${apiServer}/v1/operators/${operatorId}/routes/types`)
	]);


	if (!stopsRes.ok) {
		if (stopsRes.status === 0) {
			error(500, 'Failed to connect to server');
		} else {
			error(500, 'Failed to fetch stops');
		}
	}
	if (!routeRes.ok) {
		if (routeRes.status === 0) {
			error(500, 'Failed to connect to server');
		} else if (routeRes.status === 404) {
			error(404, 'Route not found');
		} else {
			error(500, 'Failed to fetch route');
		}
	}
	if (!routeTypesRes.ok) {
		if (routeTypesRes.status === 0) {
			error(500, 'Failed to connect to server');
		} else if (routeTypesRes.status === 404) {
			error(404, 'Route types not found');
		} else {
			error(500, 'Failed to fetch route types');
		}
	}

	const stops = Object.fromEntries((await stopsRes.json()).map((stop) => [stop.id, stop]));
	const route = await routeRes.json();
	const routeTypes = await routeTypesRes.json();

	return {
		operator: operator,
		stops: stops,
		route: route,
		routeTypes: routeTypes
	};
}
