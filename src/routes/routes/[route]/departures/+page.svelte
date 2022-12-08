<script>
	import { invalidate } from '$app/navigation';
	import { timeToTimestamp, timestampToTime } from '$lib/utils.js';
	import { api_server } from '$lib/settings.js';
	import { token, decodedToken, operators } from '$lib/stores.js';

	/** @type {import('./$types').PageData} */
	export let data;

	let newTime;
	let additionalNewTimes = [];
	let newCalendarId;

	let selectedSubrouteId = data?.route?.subroutes[0]?.id;
	$: subroute = selectedSubrouteId
		? data.route.subroutes.find((subroute) => subroute.id === selectedSubrouteId)
		: null;
	let selectedDepartureId = null;
	$: selectedDeparture = data?.departures?.find((d) => d.id === selectedDepartureId);
	let selectedDepartureCalendarId = null;
	$: subrouteSchedule = data?.departures?.filter(
		(departure) => departure.subroute === selectedSubrouteId
	);
	$: departuresAndCalendars = subrouteSchedule ? getDeparturesAndCalendars() : {};

	function getDeparturesAndCalendars() {
		let scheduleMats = Object.fromEntries(
			data.departures.map((departure) => [departure.calendar_id, {}])
		);

		for (let e of subrouteSchedule) {
			let scheduleMat = scheduleMats[e.calendar_id];

			let hour = Math.floor(e.time / 60);
			let minute = String(Math.floor(e.time % 60)).padStart(2, '0');
			if (!scheduleMat[hour]) scheduleMat[hour] = [];

			scheduleMat[hour].push({ id: e.id, minute: minute });
		}
		let departures = {};

		for (const scheduleMat of Object.values(scheduleMats)) {
			for (const hour of Object.keys(scheduleMat).sort()) {
				departures[hour] = scheduleMat[hour];
			}
		}
		return scheduleMats;
	}

	async function createDeparture() {
		if (newTime) {
			additionalNewTimes.push(newTime);
		}
		for (let time of additionalNewTimes) {
			let departure = {
				time: timeToTimestamp(time),
				calendar_id: newCalendarId
			};

			await fetch(`${api_server}/v1/schedules/${selectedSubrouteId}`, {
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
			await fetch(`${api_server}/v1/schedules/${selectedSubrouteId}/${selectedDepartureId}`, {
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
			additionalNewTimes = additionalNewTimes.sort();
		}
	}

	function removeAdditionalTime(time) {
		additionalNewTimes = additionalNewTimes.filter((t) => t !== time);
	}
</script>

<div class="flex flex-col self-center p-4 gap-4">
	{#if data.route}
		<div class="card bg-base-100 shadow-md">
			<div class="card-body">
				<h2 class="card-title">Partidas</h2>
				<select class="select select-bordered w-fit" bind:value={selectedSubrouteId}>
					{#each data.route.subroutes as subroute}
						<option value={subroute.id}>{subroute.flag}</option>
					{/each}
				</select>

				{#if departuresAndCalendars}
					{#each Object.entries(departuresAndCalendars) as [calendarId, departuresPerHour]}
						<h2 class="text-lg font-bold">{data?.calendars[calendarId]?.name}</h2>
						<div class="flex flex-row gap-1 bg-base-200 p-1 rounded-xl w-min mx-auto">
							{#each Object.entries(departuresPerHour) as [hour, departures]}
								<div class="bg-base-100 rounded-lg flex flex-col min-w-[1.0rem] items-start p-1">
									<div class="font-bold">{hour}</div>
									{#each departures as departure}
										<a
											class="cursor-pointer hover:bg-base-300"
											on:mouseup={() => {
												selectedDepartureCalendarId = departure.calendarId;
												selectedDepartureId = departure.id;
											}}>{departure.minute}</a
										>
									{/each}
								</div>
							{/each}
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
	{#if selectedDeparture}
		<div class="card bg-base-100 shadow-md">
			<div class="card-body">
				<h2 class="card-title">Partida selecionada</h2>
				<div class="flex gap-4 text-lg">
					<input
						type="time"
						class="input input-bordered"
						value={timestampToTime(selectedDeparture.time)}
					/>
					em
					<select class="select select-bordered w-fit" bind:value={selectedDepartureCalendarId}>
						{#each Object.values(data.calendars) as calendar}
							<option value={calendar.id}>{calendar.name}</option>
						{/each}
					</select>
				</div>
				<div class="card-actions justify-end">
					<button class="btn btn-secondary" on:mouseup={patchDeparture}>Alterar</button>
					<button class="btn btn-error" on:mouseup={deleteDeparture}>Apagar</button>
				</div>
			</div>
		</div>
	{/if}
	{#if data.calendars && subroute}
		<div class="card bg-base-100 shadow-md">
			<div class="card-body">
				<h2 class="card-title">Nova partida em {subroute.flag}</h2>
				<div class="flex flex-col gap-4 text-lg">
					<div class="form-control">
						<label class="input-group">
							<span>Início</span>
							<input type="time" class="input input-bordered" bind:value={newTime} />
							<input
								type="button"
								class="btn btn-success"
								value="+"
								on:mouseup={addAdditionalTime}
							/>
						</label>
					</div>

					<ul class="flex gap-2">
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
					</ul>
					Em
					<select class="select select-bordered w-fit" bind:value={newCalendarId}>
						{#each Object.values(data.calendars) as calendar}
							<option value={calendar.id}>{calendar.name}</option>
						{/each}
					</select>
				</div>
				<div class="card-actions justify-end">
					<button class="btn btn-primary" on:mouseup={createDeparture}>Adicionar</button>
				</div>
			</div>
		</div>
	{/if}
</div>
