import { error } from '@sveltejs/kit';
import { getStopPicMap } from '$lib/api';

export async function load({ fetch }) {
	const basePics = await getStopPicMap({
		onError: (res) => {
			error(res.status, 'Problema a carregar imagens');
		},
		toJson: true,
		fetch
	});

	return { basePics: basePics };
}
