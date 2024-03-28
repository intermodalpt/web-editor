import { loadToken } from '$lib/stores.js';
import { apiServer } from '$lib/settings.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	const token = await loadToken(fetch);

	const basePics = await fetch(`${apiServer}/v1/stop_pics/map`, {
		headers: token
			? {
				Authorization: `Bearer ${token}`
			}
			: {}
	}).then(r => r.json());

	return { basePics: basePics };
}
