import { apiServer } from '$lib/settings.js';
import { getRoutes, getCalendars } from '$lib/db';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, depends }) {
	const routeId = params.route;

	let routes = await getRoutes(fetch);
	let calendars = await getCalendars(fetch);

	depends('app:departures');

	let departures = await fetch(`${apiServer}/v1/routes/${routeId}/schedule`)
		.then((r) => r.json())
		.catch(() => {
			alert('Failed to parse the schedule');
		});

	const operatorCalendars = Object.fromEntries(
		Object.values(calendars)
			.filter((calendar) => calendar.operator_id === routes[routeId].operator)
			.map((calendar) => [calendar.id, calendar])
	);

	return {
		departures: departures,
		route: routes[routeId],
		calendars: operatorCalendars
	};
}
