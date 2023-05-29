import { browser } from '$app/environment';
import { loadToken, loadRoutes, loadStops, operators } from '$lib/stores.js';
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


	const [issues, stops, routes] = await Promise.all([
		fetch(`${apiServer}/v1/operators/${operatorId}/issues`).then((r) => r.json()),
		loadStops(fetch),
		loadRoutes(fetch)
	]);


	return {
		operator: operators[operatorId],
		issues: issues,
		stops: stops,
		routes: routes
	};
}
