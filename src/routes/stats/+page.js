import { apiServer } from '$lib/settings.js';
import { fetchStops, fetchParishes } from '$lib/db';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, depends }) {
	// await Promise.all([
	// 	fetchStops(),
	// 	fetchParishes()
	// ]);

	return {
		// picsByStop: await fetch(`${apiServer}/v1/stop_pics/by_stop`).then((r) => r.json())
	};
}
