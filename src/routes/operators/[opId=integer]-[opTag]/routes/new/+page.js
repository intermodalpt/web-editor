import { browser } from '$app/environment';
import { apiServer } from '$lib/settings.js';
import { fetchOperators, getOperators } from '$lib/db.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const operatorId = params.opId;

	if (!browser) {
		return;
	}

	await fetchOperators(fetch);
	let operators = await getOperators();

	const operator = operators[operatorId];

	if (!operator) {
		throw error(404, 'Operator not found');
	}

	const routeTypesRes = await fetch(`${apiServer}/v1/operators/${operatorId}/routes/types`);

	if (!routeTypesRes.ok) {
		throw error(500, 'Failed to fetch route types');
	}

	const routeTypes = await routeTypesRes.json();

	return {
		operator: operator,
		routeTypes: routeTypes
	};
}
