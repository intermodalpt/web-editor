import { browser } from '$app/environment';
import { fetchOperators, getOperator } from '$lib/db.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const operatorId = parseInt(params.opId);

	if (!browser) {
		return;
	}

	await fetchOperators(fetch);
	const operator = await getOperator(operatorId);

	if (!operator) {
		throw error(404, 'Operator not found');
	}

	return {
		operator: operator
	};
}
