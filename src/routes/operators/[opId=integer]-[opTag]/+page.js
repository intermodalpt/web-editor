import { browser } from '$app/environment';
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
		error(404, 'Operator not found');
	}

	return {
		operator: operator
	};
}
