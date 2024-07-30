import { browser } from '$app/environment';
import { apiServer } from '$lib/settings';
import { fetchOperators, getOperator } from '$lib/db.ts';

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
		operator: operator,
		issues: fetch(`${apiServer}/v1/operators/${operatorId}/issues`).then((r) => r.json())
	};
}
