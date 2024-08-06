import { error } from '@sveltejs/kit';
import { getStops, getStopPicMap } from '$lib/api';

export async function load({ params, fetch }) {
	const [stops, basePics] = await Promise.all([
		getStops({
			onError: (res) => {
				error(res.status, 'Falha a carregar as paragens');
			},
			toJson: true,
			fetch
		}),
		getStopPicMap({
			onError: (res) => {
				error(res.status, 'Problema a carregar imagens');
			},
			toJson: true,
			fetch
		})
	]);

	return { stops, basePics };
}
