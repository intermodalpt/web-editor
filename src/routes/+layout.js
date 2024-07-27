import { permissions, isAuthenticated, uid } from '$lib/stores.js';
import { browser } from '$app/environment';
import { apiServer } from '$lib/settings.js';

export const csr = true;
export const ssr = true;
export const prerender = false;


export async function load({ fetch, data }) {
	permissions.set(data.accessData?.permissions ?? []);
	isAuthenticated.set(data.accessData ?? false);
	uid.set(data.accessData.uid);

	return data;
}
