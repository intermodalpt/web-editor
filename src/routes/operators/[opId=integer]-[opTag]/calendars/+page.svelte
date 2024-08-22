<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { createCalendar, updateCalendar, deleteCalendar } from '$lib/api';
	import { permissions, toast } from '$lib/stores';
	import Menu from '../Menu.svelte';
	import CalendarBadge from './CalendarBadge.svelte';
	import CalendarInput from './CalendarInput.svelte';

	export let data;

	$: operator = data.operator;
	$: calendars = data.calendars.sort((a, b) => a.name.localeCompare(b.name));

	let dialog;

	let editedCalendarId: number | null;
	let editedCalendarName: string;
	let editedCalendar: Calendar;

	function viewCalendar(e) {
		const calendar = e.detail.calendar;
		editedCalendarId = calendar.id;
		editedCalendarName = calendar.name;
		editedCalendar = calendar.calendar;
		dialog.showModal();
	}

	async function handleCreate() {
		if (!editedCalendarName) {
			toast('É necessário um título para o calendário', 'error');
			return;
		}

		if (editedCalendar.weekdays.length === 0 && editedCalendar.also_if.length === 0) {
			toast('Calendário vazio', 'error');
			return;
		}
		await createCalendar(operator.id, editedCalendarName, editedCalendar, {
			onSuccess: async () => {
				invalidate('operator:calendars');
				resetFields();
				dialog.close();
				toast('Calendário criado');
			},
			onError: () => {
				toast('Erro a criar', 'error');
			}
		});
	}

	async function handleUpdate() {
		if (!confirm(`Confirma que quer atualizar o calendário ${editedCalendarId}?`)) return;
		if (!confirm(`Confirma que quer atualizar o calendário ${editedCalendarName}?`)) return;

		const request = {
			id: editedCalendarId,
			name: editedCalendarName,
			calendar: editedCalendar
		};

		await updateCalendar(operator.id, request, {
			onSuccess: () => {
				invalidate('operator:calendars');
				resetFields();
				dialog.close();
				toast('Calendário alterado');
			},
			onError: () => {
				toast('Erro a gravar', 'error');
			}
		});
	}

	async function handleDelete() {
		if (!confirm(`Confirma que quer apagar o calendário ${editedCalendarName}?`)) return;

		await deleteCalendar(operator.id, editedCalendarId, {
			onSuccess: () => {
				invalidate('operator:calendars');
				resetFields();
				dialog.close();
				toast('Calendário apagado');
			},
			onError: () => {
				toast('Erro ao apagar', 'error');
			}
		});
	}

	function resetFields() {
		editedCalendarId = null;
		editedCalendarName = '';
		editedCalendar = {
			only_if: [],
			also_if: [],
			except_if: [],
			weekdays: []
		};
	}
</script>

<Menu {operator} page="calendars" />

<div class="card-body">
	{#if calendars.length == 0}
		<p>Sem calendários introduzidos neste operador.</p>
	{/if}
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-4" class:hidden={calendars.length === 0}>
		{#each calendars as calendar}
			<CalendarBadge {calendar} on:click={viewCalendar} />
		{/each}
	</div>
	<div class="flex justify-end">
		<button
			class="btn btn-primary"
			class:hidden={!$permissions?.operators?.modifyCalendars}
			on:click={() => {
				resetFields();
				dialog.showModal();
			}}
		>
			Novo
		</button>
	</div>
</div>

<dialog bind:this={dialog} class="modal">
	<div class="modal-box max-w-[55em]">
		<form class="flex flex-col gap-2">
			<div class="form-control">
				<span class="label-text">Título</span>
				<input
					type="text"
					placeholder="Ex: Dias úteis de verão"
					class="input input-bordered"
					disabled={!$permissions?.operators?.modifyCalendars}
					bind:value={editedCalendarName}
				/>
			</div>
			<CalendarInput bind:calendar={editedCalendar} />
			<div class="flex gap-2 justify-end">
				{#if !$permissions?.operators?.modifyCalendars}
					<button class="btn btn-neutral">Fechar</button>
				{:else if !editedCalendarId}
					<button class="btn btn-primary" on:click|preventDefault={handleCreate}>Criar</button>
				{:else}
					<button class="btn btn-primary" on:click|preventDefault={handleUpdate}>Alterar</button>
					<button class="btn btn-error" on:click|preventDefault={handleDelete}>Apagar</button>
				{/if}
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
