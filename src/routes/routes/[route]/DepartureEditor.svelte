<script>
	import { derived } from 'svelte/store';
	import { token, toast } from '$lib/stores.js';
	import { timeToTimestamp, timestampToTime } from '$lib/utils.js';
	import { getDeparturesAndCalendars } from './aux.js';

	export let canEdit = false;
	export let selectedSubroute;
	export let routeSchedules;
	export let operatorCalendars;

	const subrouteSchedule = derived(
		[selectedSubroute, routeSchedules],
		([$selectedSubroute, $routeSchedules]) => {
			if (!$selectedSubroute || !$routeSchedules) return [];
			return $routeSchedules.filter((departure) => departure.subroute === $selectedSubroute.id);
		}
	);

	let selectedDepartureId = null;
	$: selectedDeparture = $subrouteSchedule.find((d) => d.id === selectedDepartureId);
	let selectedDepartureCalendarId = null;

	let newTime;
	let newTimeInput = null;
	let additionalNewTimes = [];
	let newCalendarId;

	let newDepartureModal;
	let editDepartureModal;

	const subrouteDeparturesByCalendar = derived([subrouteSchedule], ([$subrouteSchedule]) => {
		if (!$subrouteSchedule) return [];
		return getDeparturesAndCalendars($subrouteSchedule);
	});

	async function createDeparture() {
		if (newTime) {
			additionalNewTimes.push(newTime);
		}
		for (let time of additionalNewTimes) {
			let departure = {
				time: timeToTimestamp(time),
				calendar_id: newCalendarId
			};

			await fetch(`${apiServer}/v1/schedules/${$selectedSubroute.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					authorization: `Bearer ${$token}`
				},
				body: JSON.stringify(departure)
			}).then((x) => {
				if (x.ok) {
					invalidate('app:departures');
				} else {
					throw alert('Erro a criar partida');
				}
			});
		}
		newTime = null;
		additionalNewTimes = [];
	}

	async function patchDeparture() {
		alert('Not implemented yet');
	}

	async function deleteDeparture() {
		if (confirm(`Confirma que quer apagar? (${timestampToTime(selectedDeparture.time)})`)) {
			await fetch(`${apiServer}/v1/schedules/${$selectedSubroute.id}/${selectedDepartureId}`, {
				method: 'DELETE',
				headers: { authorization: `Bearer ${$token}` }
			});
			invalidate('app:departures');
		}
	}

	function addAdditionalTime() {
		if (newTime) {
			additionalNewTimes.push(newTime);
			newTime = null;
			additionalNewTimes = [...new Set(additionalNewTimes)].sort();
			if (newTimeInput) {
				newTimeInput.blur();
				newTimeInput.focus();
			}
		}
	}

	function removeAdditionalTime(time) {
		additionalNewTimes = additionalNewTimes.filter((t) => t !== time);
	}
</script>

<div class="flex justify-between">
	<h2 class="text-lg">Partidas</h2>
	<button
		class="btn btn-sm btn-primary"
		class:hidden={!canEdit}
		on:click={() => {
			newDepartureModal.showModal();
		}}>Adicionar</button
	>
</div>
{#if $subrouteDeparturesByCalendar && $operatorCalendars}
	{#each Object.entries($subrouteDeparturesByCalendar) as [calendarId, departuresPerHour]}
		<h2 class="text-md font-bold">{$operatorCalendars[calendarId]?.name}</h2>
		<div class="flex flex-row gap-1 bg-base-200 p-1 rounded-xl w-min mx-auto">
			{#each Object.entries(departuresPerHour) as [hour, departures]}
				<div class="bg-base-100 rounded-lg flex flex-col min-w-[1.0rem] items-start p-1">
					<div class="font-bold">{hour % 24}</div>
					{#each departures as departure}
						{#if canEdit}
							<button
								class="cursor-pointer hover:bg-base-300"
								on:click={() => {
									selectedDepartureCalendarId = departure.calendarId;
									selectedDepartureId = departure.id;
									editDepartureModal.showModal();
								}}>{departure.minute}</button
							>
						{:else}
							<span>{departure.minute}</span>
						{/if}
					{/each}
				</div>
			{/each}
		</div>
	{/each}
{/if}

<dialog bind:this={editDepartureModal} class="modal">
	{#if selectedDeparture}
		<div class="modal-box flex flex-col gap-2">
			<h2 class="card-title">Partida selecionada</h2>
			<div class="flex gap-4 text-lg">
				<input
					type="time"
					class="input input-bordered"
					value={timestampToTime(selectedDeparture.time)}
				/>
				em
				<select class="select select-bordered w-fit" bind:value={selectedDepartureCalendarId}>
					{#each Object.values($operatorCalendars || {}) as calendar}
						<option value={calendar.id}>{calendar.name}</option>
					{/each}
				</select>
			</div>
			<div class="modal-action">
				<button class="btn btn-secondary" on:click={patchDeparture}>Alterar</button>
				<button class="btn btn-error" on:click={deleteDeparture}>Apagar</button>
				<form method="dialog">
					<button class="btn">Fechar</button>
				</form>
			</div>
		</div>
	{/if}
</dialog>
<dialog bind:this={newDepartureModal} class="modal">
	{#if $operatorCalendars && $selectedSubroute}
		<div class="modal-box max-w-3xl flex flex-col gap-2">
			<h2 class="card-title">Nova partida em {$selectedSubroute.flag}</h2>
			<div class="flex flex-col gap-2 text-lg">
				<div class="flex gap-1 items-center">
					<span>Em</span>
					<select class="select select-bordered w-fit" bind:value={newCalendarId}>
						{#each Object.values($operatorCalendars || {}) as calendar}
							<option value={calendar.id}>{calendar.name}</option>
						{/each}
					</select>
				</div>
				<div class="form-control">
					<label class="input-group">
						<span>Início</span>
						<input
							type="time"
							class="input input-bordered"
							bind:this={newTimeInput}
							bind:value={newTime}
						/>
						<input type="button" class="btn btn-success" value="+" on:mouseup={addAdditionalTime} />
					</label>
				</div>
				<div class="flex flex-wrap gap-2">
					{#each additionalNewTimes as time}
						<div class="badge badge-info gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								class="inline-block w-4 h-4 stroke-current"
								on:mouseup={() => removeAdditionalTime(time)}
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
							{time}
						</div>
					{/each}
				</div>
			</div>
			<div class="modal-action">
				<button class="btn btn-primary" on:mouseup={createDeparture}>Adicionar</button>
				<form method="dialog">
					<button class="btn">Fechar</button>
				</form>
			</div>
		</div>
	{/if}
</dialog>
