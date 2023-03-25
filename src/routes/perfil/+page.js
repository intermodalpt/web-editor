import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { loadToken } from '$lib/stores.js';
import { apiServer } from '$lib/settings';

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

	const undecidedContributions = await fetch(
		`${apiServer}/v1/contrib/contributions/own/undecided?p=0`,
		{
			headers: {
				authorization: `Bearer ${token}`
			}
		}
	).then((r) => r.json());

	const decidedContributions = await fetch(
		`${apiServer}/v1/contrib/contributions/own/decided?p=0`,
		{
			headers: {
				authorization: `Bearer ${token}`
			}
		}
	).then((r) => r.json());

	return {
		decidedContributions: decidedContributions,
		undecidedContributions: undecidedContributions
	};
}
