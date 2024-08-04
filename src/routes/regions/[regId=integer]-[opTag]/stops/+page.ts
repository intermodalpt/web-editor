import { error } from '@sveltejs/kit';
import { getRegion } from '$lib/api';

export async function load({ params, fetch }) {
	const regionId = parseInt(params.regId);

	const region = await getRegion(regionId, {
		onError: (res: Response) => {
			error(res.status, 'Erro a carregar a região');
		},
		toJson: true,
		fetch
	});

	return { region };
}
