import { error } from '@sveltejs/kit';
import { getRegions } from '$lib/api';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const regions = await getRegions({
		onError: (res: Response) => {
			error(res.status, 'Erro a carregar as regiões');
		},
		toJson: true,
		fetch
	});

	return { regions };
}
