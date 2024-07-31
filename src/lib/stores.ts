import { writable } from 'svelte/store';

export const permissions = writable({});
export const isAuthenticated = writable(false);
export const uid = writable(null);

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