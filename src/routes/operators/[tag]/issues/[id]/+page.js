import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import { loadToken, loadStops, loadRoutes, operators } from '$lib/stores.js';
import { apiServer } from '$lib/settings';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, depends }) {
	const operatorTag = params.tag;
	const issueId = params.id;

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

	if (browser) {
		await loadToken(fetch);
	}

	return {
		operator: operators[operatorId],
		issue: fetch(`${apiServer}/v1/issues/${issueId}`).then((r) => r.json())
	};
}