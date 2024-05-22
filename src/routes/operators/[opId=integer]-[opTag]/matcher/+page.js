import { error } from '@sveltejs/kit';
import { fetchOperators, getOperator, regionId } from '$lib/db.js';
import { apiServer } from '$lib/settings.js';
import { get } from 'svelte/store';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const operatorId = parseInt(params.opId);
	const selectedRegionId = get(regionId);

	// Redirect the user to the root
	if (!selectedRegionId) {
		error(400, 'Without a selected region');
	}

	const [_, regionStopsRes, operatorStopsRes, gtfsStopsRes, gtfsRoutesRes] = await Promise.all([
		fetchOperators(),
		fetch(`${apiServer}/v1/regions/${selectedRegionId}/stops/full`),
		fetch(`${apiServer}/v1/operators/${operatorId}/stop_rels`),
		fetch(`${apiServer}/v1/operators/${operatorId}/gtfs/stops`),
		fetch(`${apiServer}/v1/operators/${operatorId}/gtfs/routes`)
	]);

	const operator = await getOperator(operatorId);
	if (!operator) {
		error(404, 'Operator not found');
	}

	if (!regionStopsRes.ok) {
		if (regionStopsRes.status === 0) {
			error(500, 'Failed to connect to server');
		} else {
			error(500, 'Failed to fetch the operator stops');
		}
	}

	if (!operatorStopsRes.ok) {
		if (operatorStopsRes.status === 0) {
			error(500, 'Failed to connect to server');
		} else {
			error(500, 'Failed to fetch the operator stops');
		}
	}

	const regionStops = await regionStopsRes.json();
	const operatorStopRels = await operatorStopsRes.json();
	let gtfsStops = [];
	let gtfsRoutes = [];

	if (gtfsStopsRes.ok) {
		gtfsStops = await gtfsStopsRes.json();
	} else {
		if (gtfsStopsRes.status === 0) {
			error(500, 'Failed to connect to server');
		} else if (gtfsStopsRes.status !== 404) {
			error(500, 'Failed to fetch the operator gtfs stops');
		}
	}

	if (gtfsRoutesRes.ok) {
		gtfsRoutes = await gtfsRoutesRes.json();
	} else {
		if (gtfsRoutesRes.status === 0) {
			error(500, 'Failed to connect to server');
		} else if (gtfsRoutesRes.status !== 404) {
			error(500, 'Failed to fetch the operator gtfs routes');
		}
	}

	const seenGtfsIds = new Set();
	operatorStopRels.forEach((stop) => {
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

	operatorStopRels.forEach((stop) => {
		stop.gtfsStop = gtfsStops[stop.stop_ref];
	});

	return {
		operator: operator,
		operatorStopRels: operatorStopRels,
		regionStops: regionStops,
		gtfsStops: gtfsStops,
		gtfsRoutes: gtfsRoutes
	};
}
