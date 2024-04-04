import { browser } from '$app/environment';
import { error } from '@sveltejs/kit';
import { fetchOperators, getOperator } from '$lib/db.js';
import { apiServer } from '$lib/settings.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const operatorId = parseInt(params.opId);

	if (!browser) {
		return;
	}

	await fetchOperators(fetch);
	const operator = await getOperator(operatorId);

	if (!operator) {
		throw error(404, 'Operator not found');
	}

	const [operatorStopsRes, gtfsStopsRes, gtfsRoutesRes] = await Promise.all([
		fetch(`${apiServer}/v1/operators/${operatorId}/stops`),
		fetch(`${apiServer}/v1/operators/${operatorId}/gtfs/stops`),
		fetch(`${apiServer}/v1/operators/${operatorId}/gtfs/routes`)
	]);

	if (!operatorStopsRes.ok) {
		if (operatorStopsRes.status === 0) {
			throw error(500, 'Failed to connect to server');
		} else {
			throw error(500, 'Failed to fetch the operator stops');
		}
	}

	const operatorStops = await operatorStopsRes.json();
	let gtfsStops = [];
	let gtfsRoutes = [];

	if (gtfsStopsRes.ok) {
		gtfsStops = await gtfsStopsRes.json();
	} else {
		if (gtfsStopsRes.status === 0) {
			throw error(500, 'Failed to connect to server');
		} else if (gtfsStopsRes.status !== 404) {
			throw error(500, 'Failed to fetch the operator gtfs stops');
		}
	}

	if (gtfsRoutesRes.ok) {
		gtfsRoutes = await gtfsRoutesRes.json();
	} else {
		if (gtfsRoutesRes.status === 0) {
			throw error(500, 'Failed to connect to server');
		} else if (gtfsRoutesRes.status !== 404) {
			throw error(500, 'Failed to fetch the operator gtfs routes');
		}
	}

	const seenGtfsIds = new Set();
	operatorStops.forEach((stop) => {
		seenGtfsIds.add(stop.stop_ref);
	});

	gtfsStops = Object.fromEntries(
		gtfsStops.map((stop) => [
			stop.stop_id,
			Object.assign(stop, {
				lat: stop.stop_lat,
				lon: stop.stop_lon,
				id: stop.stop_id,
				routes: new Set(),
				seen: seenGtfsIds.has(stop.stop_id)
			})
		])
	);

	gtfsRoutes.forEach((route) => {
		route.trips.forEach((trip) => {
			trip.stops.forEach((gtfsId) => {
				gtfsStops[gtfsId]?.routes.add(route);
			});
		});
	});

	operatorStops.forEach((stop) => {
		stop.gtfsStop = gtfsStops[stop.stop_ref];
	});

	return {
		operator: operator,
		operatorStops: operatorStops,
		gtfsStops: gtfsStops,
		gtfsRoutes: gtfsRoutes
	};
}
