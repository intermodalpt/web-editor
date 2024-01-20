import { browser } from '$app/environment';
import { fetchOperators, getOperators } from '$lib/db.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const operatorTag = params.tag;

	if (!browser) {
		return;
	}

	await fetchOperators(fetch);
	let operators = await getOperators();

	let matchedOperator;
	for (const operator of Object.values(operators)) {
		if (operator.tag === operatorTag) {
			matchedOperator = operator;
			break;
		}
	}

	if (!matchedOperator) {
		error(404, 'Operator not found');
	}

	return {
		operator: matchedOperator
	};
}
