import { get } from 'svelte/store';
import { loadToken, stops, loadStops, routes, loadRoutes } from '$lib/stores.js';
import { api_server } from '$lib/settings';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, depends }) {
	const routeId = params.route;

	await loadToken(fetch);

	depends('app:subroute-stops')


	let stopData = get(stops);
	if (stopData === undefined) {
		stopData = await loadStops(fetch);
	}

	let routesData = get(routes);
	if (routesData === undefined) {
		routesData = await loadRoutes(fetch);
	}

	const sortedRoutes = Object.values(routesData).sort((ra, rb) => {
		if (!ra.code) {
			return -1;
		} else if (!rb.code) {
			return 1;
		} else {
			return (parseInt(ra.code) || 10000) - (parseInt(rb.code) || 10000);
		}
	});

	const route = routesData[routeId];

	const routeStops = await fetch(`${api_server}/v1/routes/${routeId}/stops`)
			.then((r) => r.json())
			.then((data) => {
				const stops = Object.fromEntries(data.map((subroute) => [subroute.subroute, subroute.stops]));

				// TODO is this still needed?
				// (I think it was due to JOINS not returning stopless subroutes)
				for (const subroute of route.subroutes) {
					if (!(subroute.id in stops)) {
						stops[subroute.id] = [];
					}
				}
				return stops;
			})
			.catch((e) => {
				console.error(e);
			});

	return {
		stops: stopData,
		routeStops: routeStops,
		routes: sortedRoutes,
		route: route,
	};
}
