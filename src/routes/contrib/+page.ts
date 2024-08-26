
import { error } from '@sveltejs/kit';
import { getOwnUndecidedContributions, getStops } from '$lib/api.js';

export async function load({ fetch }) {

    const [contributors, stops] = await Promise.all([
        getStops({
            onError: (err) => {
                error(err.status, 'Erro a carregar paragens');
            }, toJson: true, fetch
        }).then((stops) => Object.fromEntries(stops.map((s) => [s.id, s]))),
        getOwnUndecidedContributions({
            onError: (res) => {
                error(res.status, 'Erro a carregar utilizadores');
            },
            toJson: true,
            fetch
        })
    ]);

    return {
        contributors, stops
    };
}
