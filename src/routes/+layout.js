import { loadToken } from '$lib/stores.js';
import { fetchRegions } from '$lib/db.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

export async function load({ fetch }) {
	await loadToken(fetch);
	await fetchRegions(fetch);
}
