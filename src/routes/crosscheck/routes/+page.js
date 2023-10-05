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

	const operator_id = 1;

	const [stops, routes, gtfsStops, gtfsRoutes] = await Promise.all([
		fetch(`${apiServer}/v1/stops/full`).then((r) => r.json()),
		fetch(`${apiServer}/v1/operators/1/routes`).then((r) => r.json()),
		fetch(`${apiServer}/v1/operators/1/gtfs/stops`).then((r) => r.json()),
		fetch(`${apiServer}/v1/operators/1/gtfs/routes`).then((r) => r.json())
	]);

	const indexedGtfsStops = Object.fromEntries(
		gtfsStops.map((stop) => [
			stop.stop_id,
			Object.assign(stop, {
				lat: stop.stop_lat,
				lon: stop.stop_lon,
				id: stop.stop_id
			})
		])
	);
	const indexedStops = Object.fromEntries(
		stops.map((stop) => {
			const gtfsId = stop.operators.find((ref) => ref.operator_id === operator_id)?.stop_ref;
			return [
				stop.id,
				Object.assign(stop, {
					gtfsId: gtfsId,
					gtfsStop: gtfsId ? gtfsStops[gtfsId] : null,
				})
			];
		})
	);

	return {
		stops: indexedStops,
		routes: routes,
		gtfsStops: indexedGtfsStops,
		gtfsRoutes: gtfsRoutes
	};
}
