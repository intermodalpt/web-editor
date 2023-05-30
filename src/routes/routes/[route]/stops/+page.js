import { browser } from '$app/environment';
import { loadToken } from '$lib/stores.js';
import { fetchStops, fetchRoutes, getStops, getRoutes, loadMissing } from '$lib/db';
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

	const [, , routeStopsRes] = await Promise.all([fetchStops(), fetchRoutes(), fetch(`${apiServer}/v1/routes/${routeId}/stops`)]);
	const [stopData, routesData, routeStops] = await Promise.all([getStops(), getRoutes(), routeStopsRes.json().then((data) => {
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
	})
	]);

	const sortedRoutes = Object.values(routesData).sort((ra, rb) => {
		if (!ra.code) {
			return -1;
		} else if (!rb.code) {
			return 1;
		} else {
			return (parseInt(ra.code) || 10000) - (parseInt(rb.code) || 10000);
		}
	});


	return {
		stops: stopData,
		routeStops: routeStops,
		routes: sortedRoutes,
		route: routesData[routeId],
	};
}
