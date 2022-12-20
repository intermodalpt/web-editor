import { browser } from '$app/environment';
import { loadToken } from '$lib/stores.js';
import { parseJwt } from '$lib/utils.js';
import { api_server } from '$lib/settings';
import { goto } from '$app/navigation';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	if (!browser) {
		return {
			decided: [],
			undecided: [],
			changesets: []
		};
	}

	if (!browser) {
		return [[], []];
	}

	const token = await loadToken(fetch);

	if (!token) {
		goto('/auth', { replaceState: true });
	}

	const decodedToken = parseJwt(token);

	if (!decodedToken.permissions.is_admin) {
		goto('/auth', { replaceState: true });
	}

	let headers = {
		headers: {
			authorization: `Bearer ${token}`
		}
	};

	const [decided, undecided, changesets] = await Promise.all([
		fetch(`${api_server}/v1/contrib/contributions/decided`, headers).then((res) => res.json()),
		fetch(`${api_server}/v1/contrib/contributions/undecided`, headers).then((res) => res.json()),
		fetch(`${api_server}/v1/contrib/changelog`, headers).then((res) => res.json())
	]);

	return {
		decided: decided,
		undecided: undecided,
		changesets: changesets
	};
}
