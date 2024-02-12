import { browser } from '$app/environment';
import { loadToken } from '$lib/stores.js';
import { apiServer } from '$lib/settings';

export const csr = true;
export const ssr = false;
export const prerender = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch, depends }) {
	const operatorTag = params.tag;
	const issueId = params.id;

	if (browser) {
		await loadToken(fetch);
	}

	return {
		operatorTag: operatorTag,
		issue: fetch(`${apiServer}/v1/issues/${issueId}`).then((r) => r.json())
	};
}