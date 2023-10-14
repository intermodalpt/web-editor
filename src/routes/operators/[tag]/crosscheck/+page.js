import { browser } from '$app/environment';
import { loadToken, operators } from '$lib/stores.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, depends }) {
	if (browser) {
		const token = await loadToken(fetch);
	}

	const operatorTag = params.tag;

	let operatorId;
	for (const [id, operator] of Object.entries(operators)) {
		if (operator.tag === operatorTag) {
			operatorId = parseInt(id);
			break;
		}
	}

	if (operatorId === undefined) {
		error(404, 'Operator not found');
	}

	return {
		operatorId: operatorId
	};
}