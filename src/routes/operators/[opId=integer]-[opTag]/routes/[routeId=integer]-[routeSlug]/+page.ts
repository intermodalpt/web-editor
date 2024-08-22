import { error } from '@sveltejs/kit';
import { getOperator, getOperatorCalendars, getOperatorFullStops, getOperatorRouteTypes, getRouteFull } from '$lib/api';

export async function load({ params, fetch }) {
	const routeId = parseInt(params.routeId);
	const operatorId = parseInt(params.opId);

	const [operator, route, stops, routeTypes, calendars] = await Promise.all([
		getOperator(operatorId, {
			onError: (err) => {
				if (err.status === 404) {
					error(404, 'Operator not found');
				} else {
					error(500, 'Failed to fetch operator');
				}
			},
			fetch,
			toJson: true
		}),
		getRouteFull(routeId, {
			onError: (err) => {
				if (err.status === 404) {
					error(404, 'Route not found');
				} else {
					error(500, 'Failed to fetch route');
				}
			},
			fetch,
			toJson: true
		}),
		getOperatorFullStops(operatorId, {
			onError: (err) => {
				if (err.status === 404) {
					error(404, 'Operator not found');
				} else {
					error(500, 'Failed to fetch stops');
				}
			},
			fetch,
			toJson: true
		}),
		getOperatorRouteTypes(operatorId, {
			onError: (err) => {
				if (err.status === 404) {
					error(404, 'Operator not found');
				} else {
					error(500, 'Failed to fetch route types');
				}
			},
			fetch,
			toJson: true
		}),
		getOperatorCalendars(operatorId, {
			onError: (err) => {
				if (err.status === 404) {
					error(404, 'Operator not found');
				} else {
					error(500, 'Failed to fetch calendars');
				}
			},
			fetch,
			toJson: true
		})
	]);

	const stopIndex = Object.fromEntries(stops.map((stop) => [stop.id, stop]));

	return { operator, stops: stopIndex, route, routeTypes, calendars};
}
