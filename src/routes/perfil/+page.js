import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { loadToken } from '$lib/stores.js';
import { apiServer } from '$lib/settings';
import { fetchStops } from '$lib/db';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	if (!browser) {
		return;
	}

	let token = await loadToken(fetch);

	if (!token) {
		return goto('/login');
	}

	const headers = {
		headers: {
			authorization: `Bearer ${token}`
		}
	};

	const [decidedContributions, undecidedContributions, ] = await Promise.all([
		fetch(
			`${apiServer}/v1/contrib/contributions/own/undecided?p=0`,
			headers
		).then((r) => r.json()),
		fetch(
			`${apiServer}/v1/contrib/contributions/own/decided?p=0`,
			headers
		).then((r) => r.json()),
		fetchStops()
	]);

	return {
		decidedContributions: decidedContributions,
		undecidedContributions: undecidedContributions
	};
}
