import { browser } from '$app/environment';
import { loadToken, loadRoutes, loadCalendars } from '$lib/stores.js';
import { apiServer } from '$lib/settings.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, depends }) {
	const routeId = params.route;

	if (browser) {
		const token = await loadToken(fetch);
	}

	let routes = await loadRoutes(fetch);
	let calendars = await loadCalendars(fetch);

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
