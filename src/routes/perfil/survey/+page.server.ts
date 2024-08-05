import { getLastSurvey } from '$lib/api.js';
import { error, redirect } from '@sveltejs/kit';

export async function load({ locals, fetch }) {
	if (!locals.accessToken) {
		redirect(307, '/login');
	}

	let survey = await getLastSurvey({
		onError: (res) => {
			error(res.status, "Problema a carregar o questionário");
		},
		toJson: true,
		fetch
	});

	return {
		uid: locals.refreshData?.uid,
		uname: locals.refreshData?.uname,
		survey
	};
}
