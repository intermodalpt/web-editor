import { writable, derived, get } from 'svelte/store';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { apiServer } from '$lib/settings.js';
import { parseJwt } from '$lib/utils.js';

// FIXME this is not safe but it is good enough for now
export const token = writable(null);

export const decodedToken = derived(token, ($token) => {
	if ($token) {
		return parseJwt($token);
	}
});

export async function loadToken(fetch) {
	if (!browser) {
		return;
	}

	let currentToken = get(token);
	if (currentToken === null) {
		let storedToken = localStorage.getItem('token');
		if (storedToken === null) {
			return null;
		}
		currentToken = storedToken;
		let validityCheck = await fetch(`${apiServer}/v1/auth/check`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${storedToken}`
			}
		});
		if (validityCheck.status === 200) {
			token.set(storedToken);
			return storedToken;
		} else {
			return null;
		}
	}

	return currentToken;
}

export async function logout() {
	token.set(null);
	localStorage.removeItem('token');
	await goto('/login');
}

export const toasts = writable([]);

export const toast = (message, type = 'info', duration = 5000) => {
	let newToast = {
		message,
		type,
		duration,
		id: Math.random().toString(36)
	};
	toasts.update((toasts) => {
		return [...toasts, newToast];
	});
	setTimeout(() => {
		toasts.update((toasts) => {
			return toasts.filter((toast) => toast.id !== newToast.id);
		});
	}, duration);
};
