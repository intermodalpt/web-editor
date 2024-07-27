import { goto } from '$app/navigation';

export async function load({ locals }) {
	if (locals.accessData) {
		return goto('/perfil');
	}
}
