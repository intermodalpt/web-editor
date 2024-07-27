import { goto } from '$app/navigation';
import { error } from '@sveltejs/kit';
import { apiServer } from '$lib/settings';
import { fetchStops } from '$lib/db';

export async function load({ locals, fetch }) {
	if (!locals.accessToken) {
		return goto('/login');
	}

	const [decidedContributionsRes, undecidedContributionsRes] = await Promise.all([
		fetch(`${apiServer}/v1/contrib/contributions/own/undecided?p=0`),
		fetch(`${apiServer}/v1/contrib/contributions/own/decided?p=0`),
		fetchStops()
	]);

	if (!decidedContributionsRes.ok) {
		error(500, 'Problema a obter as contribuições');
	}

	if (!undecidedContributionsRes.ok) {
		error(500, 'Problema a obter as contribuições');
	}

	const [decidedContributions, undecidedContributions] = await Promise.all([
		decidedContributionsRes.json(),
		undecidedContributionsRes.json()
	]);

	console.log('decidedContributions', decidedContributions);
	console.log('undecidedContributions', undecidedContributions);

	return {
		// accessData: locals.accessData,
		// accessExp: locals.accessExp,
		// refresh: locals.refreshToken,
		// refreshData: locals.refreshData,
		// refreshExp: locals.refreshExp,
		uid: locals.refreshData?.uid,
		uname: locals.refreshData?.uname,
		permissions: locals.accessData.permissions,
		decidedContributions,
		undecidedContributions
	};
}
