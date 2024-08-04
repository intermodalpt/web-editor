import { getOperators, getRegion, getRegions } from '$lib/api';
import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
	const regionId = parseInt(params.regId);

	const [region, regions, operators] = await Promise.all([
		getRegion(regionId, {
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar a região');
			},
			toJson: true,
			fetch
		}),
		getRegions({
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar as regiões');
			},
			toJson: true,
			fetch
		}),
		getOperators({
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar os operadores');
			},
			toJson: true,
			fetch
		})
	]);

	const regionOperators = operators.filter((op) => op.regions.includes(regionId));
	

	return { regions, region, operators: regionOperators };
}
