import { getOperator, getOperatorRouteTypes, getSimpleRegions } from '$lib/api.js';
import { error } from '@sveltejs/kit';

export const csr = true;
export const ssr = false;
export const prerender = false;

export async function load({ params, fetch }) {
	const operatorId = parseInt(params.opId);

	const [operator, regions] = await Promise.all([
		getOperator(operatorId,
			{
				onError: (res) => {
					error(res.status, 'Failed to fetch operator');
				},
				toJson: true,
				fetch
			}),
		getSimpleRegions({
			onError: (res) => {
				error(res.status, 'Failed to fetch regions');
			},
			toJson: true,
			fetch
		})
	]);

	return {
		operator,
		regions
	};
}
