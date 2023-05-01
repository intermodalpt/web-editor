import { browser } from '$app/environment';
import { loadToken } from '$lib/stores.js';
import { apiServer } from '$lib/settings.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, depends }) {
	if (!browser) {
		return { calendars: {} };
	}

	const token = await loadToken(fetch);

	const [stops, routes, gtfsStops, gtfsRoutes] = await Promise.all([
		fetch(`${apiServer}/v1/tml/stops`).then((r) => r.json()),
		fetch(`${apiServer}/v1/operators/1/routes`).then((r) => r.json()),
		fetch(`${apiServer}/v1/tml/gtfs_stops`).then((r) => r.json()),
		fetch(`${apiServer}/v1/tml/gtfs_routes`).then((r) => r.json())
	]);

	const indexedGtfsStops = Object.fromEntries(
		gtfsStops.map((stop) => [
			parseInt(stop.stop_id),
			Object.assign(stop, {
				lat: stop.stop_lat,
				lon: stop.stop_lon,
				id: parseInt(stop.stop_id)
			})
		])
	);
	const indexedStops = Object.fromEntries(
		stops.map((stop) => [
			stop.id,
			Object.assign(stop, {
				gtfsStop: gtfsStops[parseInt(stop.tml_id)] || null
			})
		])
	);

	return {
		stops: indexedStops,
		routes: routes,
		gtfsStops: indexedGtfsStops,
		gtfsRoutes: gtfsRoutes
	};
}
