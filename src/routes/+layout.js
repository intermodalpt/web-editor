import { getRegion } from '$lib/api';
import { isAuthenticated, permissions, uid, selectedRegion } from '$lib/stores';

export const csr = true;
export const ssr = true;
export const prerender = false;

export async function load({ fetch, data }) {
	if (data.regionId) {
		await getRegion(data.regionId, {
			onSuccess: (data) => selectedRegion.set(data),
			toJson: true,
			fetch
		});
	}

	permissions.set(data.accessData?.permissions ?? []);
	isAuthenticated.set(data.accessData ?? false);
	uid.set(data.uid);

	return data;
}
