import { browser } from '$app/environment';
import { loadToken, operators } from '$lib/stores.js';
import { apiServer } from '$lib/settings';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const operatorTag = params.tag;

	let operatorId;
	for (const [id, operator] of Object.entries(operators)) {
		if (operator.tag === operatorTag) {
			operatorId = id;
			break;
		}
	}

	if (operatorId === undefined) {
		error(404, 'Operator not found');
	}


	if (!browser) {
		return;
	}

	let token = await loadToken(fetch);


	return {
		operator: operators[operatorId],
		issues: fetch(`${apiServer}/v1/operators/${operatorId}/issues`).then((r) => r.json())
	};
}
