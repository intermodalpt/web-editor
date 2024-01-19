import { apiServer } from '$lib/settings.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const operatorTag = params.tag;

	let operatorId;
	for (const [id, operator] of Object.entries(operators)) {
		if (operator.tag === operatorTag) {
			operatorId = parseInt(id);
			break;
		}
	}

	if (operatorId === undefined) {
		error(404, 'Operator not found');
	}


	const [stops, routes, gtfsStops, gtfsRoutes] = await Promise.all([
		fetch(`${apiServer}/v1/stops/full`).then((r) => r.json()),
		fetch(`${apiServer}/v1/operators/${operatorId}/routes`).then((r) => r.json()),
		fetch(`${apiServer}/v1/operators/${operatorId}/gtfs/stops`).then((r) => r.json()),
		fetch(`${apiServer}/v1/operators/${operatorId}/gtfs/routes`).then((r) => r.json())
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
		operatorId: operatorId,
		stops: indexedStops,
		routes: routes,
		gtfsStops: indexedGtfsStops,
		gtfsRoutes: gtfsRoutes
	};
}
