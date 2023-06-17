import { browser } from '$app/environment';
import { loadToken } from '$lib/stores.js';
import { apiServer } from '$lib/settings';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, depends }) {
	if (!browser) {
		return;
	}

	const routeId = params.route;

	await loadToken(fetch);

	depends('app:subroute-stops')

	const routeStops = await fetch(`${apiServer}/v1/routes/${routeId}/stops`)
		.then((r) => r.json())
		.then((data) => {
			const stops = Object.fromEntries(data.map((subroute) => [subroute.subroute, subroute.stops]));

			// // TODO is this still needed?
			// // (I think it was due to JOINS not returning stopless subroutes)
			// for (const subroute of route.subroutes) {
			// 	if (!(subroute.id in stops)) {
			// 		stops[subroute.id] = [];
			// 	}
			// }
			return stops;
		}).catch((e) => {
			console.error(e);
		});

	return {
		routeId: routeId,
		routeStops: routeStops,
	};
}
