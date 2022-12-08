import { dev, browser } from '$app/environment';
import { get } from 'svelte/store';
import { loadToken, loadRoutes, loadCalendars } from '$lib/stores.js';
import { api_server } from '$lib/settings.js';

// we don't need any JS on this page, though we'll load
// it in dev so that we get hot module replacement
export const csr = dev;

// since there's no dynamic data here, we can prerender
// it so that it gets served as a static asset in production
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, depends }) {
	let routeId = params.route;

	if (browser) {
		const token = await loadToken(fetch);
	}

	let routes = await loadRoutes(fetch);
	let calendars = await loadCalendars(fetch);

	depends('app:departures');

	let departures = await fetch(`${api_server}/v1/routes/${routeId}/schedule`)
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
