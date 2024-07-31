import { error } from '@sveltejs/kit';
import {
	getOperator,
	getStops,
	getOsmStops,
	getOperatorStopRels,
	getOperatorGtfsStops,
	getOperatorGtfsRoutes
} from '$lib/api';

export async function load({ params, fetch }) {
	const operatorId = parseInt(params.opId);

	const [operator, stops, osmStops, operatorStopRels, gtfsStops, gtfsRoutes] = await Promise.all([
		getOperator(operatorId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar o operador');
			},
			toJson: true,
			fetch
		}),
		getStops({
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar as paragens');
			},
			toJson: true,
			fetch
		}),
		getOsmStops({
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar as paragens OSM');
			},
			toJson: true,
			fetch
		}),
		getOperatorStopRels(operatorId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar as relações de paragens');
			},
			toJson: true,
			fetch
		}),
		getOperatorGtfsStops(operatorId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar as paragens GTFS');
			},
			toJson: true,
			fetch
		}),
		getOperatorGtfsRoutes(operatorId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar as linhas GTFS');
			},
			toJson: true,
			fetch
		})
	]);

	const seenGtfsIds = new Set();
	operatorStopRels.forEach((stop) => {
		seenGtfsIds.add(stop.stop_ref);
	});

	const gtfsStopIndex = Object.fromEntries(
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
				gtfsStopIndex[gtfsId]?.routes.add(route);
			});
		});
	});

	operatorStopRels.forEach((stop) => {
		stop.gtfsStop = gtfsStopIndex[stop.stop_ref];
	});

	return {
		operator,
		operatorStopRels,
		regionStops: stops,
		// regionStops: regionStops,
		gtfsStops: gtfsStopIndex,
		gtfsRoutes: gtfsRoutes,
		osmStops: osmStops
	};
}
