<script lang="ts">
	import { calendarStr, isDeepEqual } from '$lib/utils';
	import { permissions, toast } from '$lib/stores';

	export let calendar: Calendar = {
		only_if: [],
		also_if: [],
		except_if: [],
		weekdays: []
	};

	let conditionType: string | null = null;
	let conditionPeriod: string | null = null;
	$: newConditionPeriodReady =
		conditionPeriod &&
		((conditionPeriod === 'Range' && rangeStart && rangeEnd) ||
			(conditionPeriod === 'Nth' && nth != null) ||
			!(conditionPeriod === 'Range' || conditionPeriod === 'Nth'));
	let nth: string | null = null;
	let rangeStart: [string, string] | null = null;
	let rangeEnd: [string, string] | null = null;

	// $: formCalendar.weekdays = formWeekdays;

	function addModifier() {
		if (!conditionType) return;
		let modifier;
		if (conditionPeriod === 'Range') {
			const startParts = rangeStart.split('-');
			const endParts = rangeEnd.split('-');
			const start = [parseInt(startParts[1]), parseInt(startParts[2])];
			const end = [parseInt(endParts[1]), parseInt(endParts[2])];
			modifier = { condition: 'Range', start: start, end: end };
		} else if (conditionPeriod === 'Nth') {
			modifier = { condition: 'Nth', Nth: nth };
		} else {
			modifier = { condition: conditionPeriod };
		}

		if (calendar[conditionType].findIndex((mod) => isDeepEqual(mod, modifier)) === -1) {
			calendar[conditionType].push(modifier);
			calendar = calendar;
		} else {
			toast('Modificador já adicionado', 'error');
		}
	}
</script>

<div class="border-2 rounded-lg p-2">
	<span class="text-md">Dias da semana</span>
	<div class="flex gap-4">
		<label>
			<input
				class="checkbox"
				name="weekdays"
				type="checkbox"
				value={0}
				disabled={!$permissions?.operators?.modifyCalendars}
				bind:group={calendar.weekdays}
			/> Segunda</label
		>
		<label>
			<input
				class="checkbox"
				name="weekdays"
				type="checkbox"
				value={1}
				bind:group={calendar.weekdays}
			/>
			Terça</label
		>
		<label>
			<input
				class="checkbox"
				name="weekdays"
				type="checkbox"
				value={2}
				disabled={!$permissions?.operators?.modifyCalendars}
				bind:group={calendar.weekdays}
			/> Quarta</label
		>
		<label>
			<input
				class="checkbox"
				name="weekdays"
				type="checkbox"
				value={3}
				disabled={!$permissions?.operators?.modifyCalendars}
				bind:group={calendar.weekdays}
			/> Quinta</label
		>
		<label>
			<input
				class="checkbox"
				name="weekdays"
				type="checkbox"
				value={4}
				disabled={!$permissions?.operators?.modifyCalendars}
				bind:group={calendar.weekdays}
			/> Sexta</label
		>
		<label>
			<input
				class="checkbox"
				name="weekdays"
				type="checkbox"
				value={5}
				disabled={!$permissions?.operators?.modifyCalendars}
				bind:group={calendar.weekdays}
			/> Sábado</label
		>
		<label>
			<input
				class="checkbox"
				name="weekdays"
				type="checkbox"
				value={6}
				disabled={!$permissions?.operators?.modifyCalendars}
				bind:group={calendar.weekdays}
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
					disabled={!$permissions?.operators?.modifyCalendars}
					bind:group={conditionType}
				/>
				Apenas
			</label>
			<label class="flex gap-1 items-center">
				<input
					class="radio"
					name="exception-type"
					type="radio"
					value="except_if"
					disabled={!$permissions?.operators?.modifyCalendars}
					bind:group={conditionType}
				/>
				Exceto
			</label>
			<label class="flex gap-1 items-center">
				<input
					class="radio"
					name="exception-type"
					type="radio"
					value="also_if"
					disabled={!$permissions?.operators?.modifyCalendars}
					bind:group={conditionType}
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
					disabled={!$permissions?.operators?.modifyCalendars}
					bind:group={conditionPeriod}
				/>
				Verão
			</label>
			<label class="flex gap-1 items-center">
				<input
					class="radio"
					name="period"
					type="radio"
					value="School"
					disabled={!$permissions?.operators?.modifyCalendars}
					bind:group={conditionPeriod}
				/>
				Escola
			</label>
			<label class="flex gap-1 items-center">
				<input
					class="radio"
					name="period"
					type="radio"
					value="Holiday"
					disabled={!$permissions?.operators?.modifyCalendars}
					bind:group={conditionPeriod}
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
						disabled={!$permissions?.operators?.modifyCalendars}
						bind:group={conditionPeriod}
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
							disabled={conditionPeriod !== 'Nth' || !$permissions?.operators?.modifyCalendars}
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
						bind:group={conditionPeriod}
					/>
					Período
				</label>
				<div class="form-control">
					<label class="input-group">
						<span class="label-text w-16">Entre</span>
						<input
							type="date"
							class="input input-bordered input-xs w-fit"
							disabled={conditionPeriod !== 'Range' || !$permissions?.operators?.modifyCalendars}
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
							disabled={conditionPeriod !== 'Range' || !$permissions?.operators?.modifyCalendars}
							bind:value={rangeEnd}
						/>
					</label>
				</div>
			</div>
		</div>
		<div class="flex justify-end">
			<button
				class="btn btn-info btn-xs mt-2"
				disabled={!(newConditionPeriodReady && conditionType) ||
					!$permissions?.operators?.modifyCalendars}
				on:mouseup={addModifier}
			>
				Adicionar modificador
			</button>
		</div>
	</div>
	<span>Calendário atual: {calendarStr(calendar)}</span>
</div>
