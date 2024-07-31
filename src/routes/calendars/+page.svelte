<script>
	import { derived } from 'svelte/store';
	import Select from 'svelte-select';
	import { liveQuery } from 'dexie';
	import { calendarStr, isDeepEqual } from '$lib/utils';
	import { permissions, toast } from '$lib/stores';
	import { fetchOperators, getOperators, fetchCalendars, getCalendars, loadMissing } from '$lib/db';
	import { deleteCalendar } from '$lib/api';

	const calendars = liveQuery(() => getCalendars());
	const operators = liveQuery(() => getOperators());

	async function loadData() {
		await Promise.all([fetchOperators(), fetchCalendars()]);
	}

	loadData().then(async () => {
		console.log('data loaded');
		await loadMissing();
	});

	let selectedOperatorId = null;
	$: operatorCalendars =
		selectedOperatorId && $calendars
			? Object.values($calendars)
					.filter((value) => value.operator_id === selectedOperatorId)
					.sort((a, b) => a.name.localeCompare(b.name))
			: [];

	let formTitle = null;
	let formNewConditionType = null;
	let formNewConditionPeriod = null;
	$: newConditionPeriodReady =
		formNewConditionPeriod != null &&
		((formNewConditionPeriod === 'Range' &&
			rangeStart != null &&
			rangeStart !== '' &&
			rangeEnd != null &&
			rangeEnd !== '') ||
			(formNewConditionPeriod === 'Nth' && nth != null) ||
			!(formNewConditionPeriod === 'Range' || formNewConditionPeriod === 'Nth'));
	let formNewCondition = null;
	let formWeekdays = [0, 1, 2, 3, 4];
	let formCalendar = {
		only_if: [],
		also_if: [],
		except_if: []
	};
	let nth = null;
	let rangeStart = null;
	let rangeEnd = null;
	$: formCalendar.weekdays = formWeekdays;

	function resetFormCalendar() {
		formCalendar = {
			only_if: [],
			also_if: [],
			except_if: []
		};
		formWeekdays = [0, 1, 2, 3, 4];
	}

	function addModifier() {
		let modifier;
		if (formNewConditionPeriod === 'Range') {
			const startParts = rangeStart.split('-');
			const endParts = rangeEnd.split('-');
			const start = [parseInt(startParts[1]), parseInt(startParts[2])];
			const end = [parseInt(endParts[1]), parseInt(endParts[2])];
			modifier = { condition: 'Range', start: start, end: end };
		} else if (formNewConditionPeriod === 'Nth') {
			modifier = { condition: 'Nth', Nth: nth };
		} else {
			modifier = { condition: formNewConditionPeriod };
		}

		if (
			formCalendar[formNewConditionType].findIndex((existingModifier) =>
				isDeepEqual(existingModifier, modifier)
			) === -1
		) {
			formCalendar[formNewConditionType].push(modifier);
			formCalendar = formCalendar;
		}
	}

	function handleSelect(event) {
		selectedOperatorId = parseInt(event.detail.value);
	}

	const operatorOptions = derived([operators], ([$operators]) => {
		if (!$operators) {
			return [];
		}

		return Object.entries($operators).map(([key, value]) => {
			return {
				value: key,
				label: value.name
			};
		});
	});

	async function handleCreateCalendar() {
		if (!formTitle) {
			alert('É necessário um título para o calendário');
			return;
		}
		await createCalendar(selectedOperatorId, formTitle, formCalendar, {
			onSuccess: async () => {
				toast('Calendário criado', 'error');
				await fetchCalendars(false);
				formTitle = null;
				resetFormCalendar();
			},
			onError: (error) => {
				toast('Erro ao criar calendário', 'error');
			}
		});
	}

	function handleDelete(calendar) {
		if (!confirm(`Confirma que quer apagar o calendário ${calendar.name}?`)) return;

		deleteCalendar(selectedOperatorId, calendar.id, {
			onSuccess: async () => {
				await fetchCalendars(false);
			},
			onError: () => {
				toast('Erro ao apagar calendário', 'error');
			}
		});
	}
</script>

<svelte:head>
	<title>Intermodal - Calendários</title>
	<meta name="description" content="Calendários" />
</svelte:head>

<div class="flex flex-col self-center gap-4 p-2">
	<div class="card bg-base-100 shadow-md">
		<div class="card-body">
			<h2 class="card-title">Calendários existentes</h2>
			<Select
				items={$operatorOptions}
				on:select={handleSelect}
				isClearable={false}
				placeholder="Operador"
			/>

			{#if selectedOperatorId}
				<table>
					<thead>
						<tr>
							<th>Id</th>
							<th>Titulo</th>
							<th>Descrição</th>
							<th />
						</tr>
					</thead>
					<tbody>
						{#each operatorCalendars as calendar}
							<tr class="hover:bg-base-200">
								<td class="pr-4 text-xs">{calendar.id}</td>
								<td>{calendar.name}</td>
								<td>{calendarStr(calendar.calendar)}</td>
								<td>
									{#if $permissions?.operators?.modify_calendars}
										<button
											class="btn btn-error btn-xs btn-outline"
											on:click={() => {
												handleDelete(calendar);
											}}>Apagar</button
										>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>

	{#if selectedOperatorId && $permissions?.operators?.modify_calendars}
		<div class="card max-w-5xl bg-base-100 shadow-md">
			<div class="card-body">
				<h2 class="card-title">Novo calendário</h2>
				<div class="form-control">
					<label class="label">
						<span class="label-text">Título</span>
					</label>
					<input
						type="text"
						placeholder="Ex: Dias úteis de verão"
						class="input input-bordered"
						bind:value={formTitle}
					/>
				</div>

				<div class="border-2 rounded-lg p-2">
					<span class="text-md">Dias da semana</span>
					<div class="flex gap-4">
						<label>
							<input
								class="checkbox"
								name="weekdays"
								type="checkbox"
								value={0}
								bind:group={formWeekdays}
							/> Segunda</label
						>
						<label>
							<input
								class="checkbox"
								name="weekdays"
								type="checkbox"
								value={1}
								bind:group={formWeekdays}
							/> Terça</label
						>
						<label>
							<input
								class="checkbox"
								name="weekdays"
								type="checkbox"
								value={2}
								bind:group={formWeekdays}
							/> Quarta</label
						>
						<label>
							<input
								class="checkbox"
								name="weekdays"
								type="checkbox"
								value={3}
								bind:group={formWeekdays}
							/> Quinta</label
						>
						<label>
							<input
								class="checkbox"
								name="weekdays"
								type="checkbox"
								value={4}
								bind:group={formWeekdays}
							/> Sexta</label
						>
						<label>
							<input
								class="checkbox"
								name="weekdays"
								type="checkbox"
								value={5}
								bind:group={formWeekdays}
							/> Sábado</label
						>
						<label>
							<input
								class="checkbox"
								name="weekdays"
								type="checkbox"
								value={6}
								bind:group={formWeekdays}
							/> Domingo</label
						>
					</div>

					<div class="border-2 rounded-lg p-2">
						<div class="flex gap-8">
							<span class="text-md">A aplicar</span>
							<label class="flex gap-1 items-center">
								<input
									class="radio"
									name="exception-type"
									type="radio"
									value="only_if"
									bind:group={formNewConditionType}
								/>
								Apenas
							</label>
							<label class="flex gap-1 items-center">
								<input
									class="radio"
									name="exception-type"
									type="radio"
									value="except_if"
									bind:group={formNewConditionType}
								/>
								Exceto
							</label>
							<label class="flex gap-1 items-center">
								<input
									class="radio"
									name="exception-type"
									type="radio"
									value="also_if"
									bind:group={formNewConditionType}
								/>
								Também
							</label>
						</div>
						<hr class="mt-2 mb-2" />
						<div class="flex gap-12 items-start">
							<span class="text-md">Em</span>
							<label class="flex gap-1 items-center">
								<input
									class="radio"
									name="period"
									type="radio"
									value="Summer"
									bind:group={formNewConditionPeriod}
								/>
								Verão
							</label>
							<label class="flex gap-1 items-center">
								<input
									class="radio"
									name="period"
									type="radio"
									value="School"
									bind:group={formNewConditionPeriod}
								/>
								Escola
							</label>
							<label class="flex gap-1 items-center">
								<input
									class="radio"
									name="period"
									type="radio"
									value="Holiday"
									bind:group={formNewConditionPeriod}
								/>
								Feriados
							</label>
							<div class="flex flex-col gap-2">
								<label class="flex gap-1 items-center">
									<input
										class="radio"
										name="period"
										type="radio"
										value="Nth"
										bind:group={formNewConditionPeriod}
									/>
									Ocorrência #
								</label>
								<div class="form-control">
									<label class="input-group">
										<span class="label-text w-16">#</span>
										<input
											type="number"
											min="1"
											max="5"
											class="input input-bordered input-xs w-16 h-10"
											disabled={formNewConditionPeriod !== 'Nth'}
											bind:value={nth}
										/>
									</label>
								</div>
							</div>
							<div class="flex flex-col gap-2">
								<label class="flex gap-1 items-center">
									<input
										class="radio"
										name="period"
										type="radio"
										value="Range"
										bind:group={formNewConditionPeriod}
									/>
									Período
								</label>
								<div class="form-control">
									<label class="input-group">
										<span class="label-text w-16">Entre</span>
										<input
											type="date"
											class="input input-bordered input-xs w-fit"
											disabled={formNewConditionPeriod !== 'Range'}
											bind:value={rangeStart}
										/>
									</label>
								</div>
								<div class="form-control">
									<label class="input-group">
										<span class="label-text w-16">E</span>
										<input
											type="date"
											class="input input-bordered input-xs w-fit"
											disabled={formNewConditionPeriod !== 'Range'}
											bind:value={rangeEnd}
										/>
									</label>
								</div>
							</div>
						</div>
						<div class="flex justify-end">
							<button
								class="btn btn-info btn-xs mt-2"
								disabled={!(newConditionPeriodReady && formNewConditionType)}
								on:mouseup={addModifier}
							>
								Adicionar modificador
							</button>
						</div>
					</div>
					<span>
						Calendário atual: {calendarStr(formCalendar)}
						<span on:mouseup={resetFormCalendar}>(x)</span>
					</span>
				</div>
				<div class="card-actions justify-end">
					<button class="btn btn-primary" on:click={handleCreateCalendar}>Criar</button>
				</div>
			</div>
		</div>
	{/if}
</div>
