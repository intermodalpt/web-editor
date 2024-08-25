export const csr = true;
export const ssr = false;
export const prerender = false;


import { getSimpleRegions } from '$lib/api';
import { error } from '@sveltejs/kit';

export async function load({ fetch }) {

    const regions: SimpleRegion[] = await getSimpleRegions({
        onError: (res: Response) => {
            error(res.status, 'Erro a carregar as regiões');
        },
        toJson: true,
        fetch
    });

    return { regions };
}
