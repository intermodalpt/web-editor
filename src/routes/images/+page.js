import { apiServer } from '$lib/settings.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const basePics = await fetch(`${apiServer}/v1/stop_pics/map`).then((r) => r.json());

	return { basePics: basePics };
}
