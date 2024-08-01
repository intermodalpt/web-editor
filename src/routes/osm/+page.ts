import { error } from '@sveltejs/kit';
import { getStops, getOsmStops, getRegions } from '$lib/api';

export async function load({ fetch, depends }) {
	const [stops, osmStops, regions] = await Promise.all([
		getStops({
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar as paragens');
			},
			toJson: true,
			fetch
		}),
		getOsmStops({
			onError: (res: Response) => {
				error(res.status, 'Erro a carregar as paragens OSM');
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
		})
	]);

	depends('stops:osm');
	return { stops, osmStops, regions };
}
