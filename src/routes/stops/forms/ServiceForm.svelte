<script>
	export let hasFlags;
	export let flagsData;
	export let hasSchedules;
	export let schedulesData;
	export let serviceCheckDate;

	export let latestPictureDate;

	export let readOnly = true;

	function addFlag() {
		flagsData.push({
			id: null,
			name: null,
			route_codes: []
		});
		flagsData = flagsData;
	}

	function removeFlag(i) {
		flagsData.splice(i, 1);
		flagsData = flagsData;
	}

	function addFlagRoute(i) {
		const code = prompt('Código da linha:');

		if (!code || code.trim() === '') {
			return;
		}

		const trimmedCode = code.trim();

		// Check if the route code is already in the list
		if (flagsData[i].route_codes.indexOf(trimmedCode) !== -1) {
			return;
		}

		flagsData[i].route_codes.push(code);
		flagsData[i].route_codes = flagsData[i].route_codes;
	}

	function removeFlagRoute(i, j) {
		flagsData[i].route_codes.splice(j, 1);
		flagsData[i].route_codes = flagsData[i].route_codes;
	}

	function addScheduleEntry() {
		schedulesData.push({
			code: null,
			discriminator: null,
			type: null
		});
		schedulesData = schedulesData;
	}

	function removeScheduleEntry(index) {
		schedulesData.splice(index, 1);
		schedulesData = schedulesData;
	}
</script>

<div class="w-full">
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 items-start">
		<div class="rounded-lg border p-2">
			<div class="flex gap-2 items-center">
				<span class="text-base">Postaletes</span>
				<a
					class="btn btn-circle btn-ghost btn-xs text-info"
					href="/instructions/stopattrs#flags"
					target="_blank"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="w-4 h-4 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</a>
				<div class="join items-center">
					<button
						class="btn btn-xs px-4 join-item"
						class:btn-active={hasFlags === true}
						on:click={() => (hasFlags = true)}
						on:keypress={() => (hasFlags = true)}>Sim</button
					>
					<button
						class="btn btn-xs px-6 join-item"
						class:btn-active={hasFlags === null}
						on:click={() => (hasFlags = null)}
						on:keypress={() => (hasFlags = null)}>?</button
					>
					<button
						class="btn btn-xs px-4 join-item"
						class:btn-active={hasFlags === false}
						on:click={() => (hasFlags = false)}
						on:keypress={() => (hasFlags = false)}>Não</button
					>
				</div>
			</div>
			{#if hasFlags}
				{#each flagsData as flag, i}
					<table class="table table-compact w-full">
						<thead>
							<tr>
								<th class="text-xs">Id</th>
								<th class="w-full">
									<input
										type="text"
										class="w-32 input input-xs input-bordered px-0"
										bind:value={flag.id}
									/>
								</th>
								<th>
									<input
										type="button"
										class="btn btn-error btn-xs"
										value="-"
										disabled={readOnly}
										on:click={() => removeFlag(i)}
										on:keypress={() => removeFlag(i)}
									/>
								</th>
							</tr>
							<tr>
								<th class="text-xs">Nome</th>
								<th class="w-full">
									<input
										type="text"
										class="w-32 input input-xs input-bordered px-0"
										bind:value={flag.name}
									/>
								</th>
								<th>
									<input
										type="button"
										class="btn btn-success btn-xs"
										value="+linha"
										disabled={readOnly}
										on:click={() => addFlagRoute(i)}
										on:keypress={() => addFlagRoute(i)}
									/>
								</th>
							</tr>
						</thead>
					</table>
					<div class="flex flex-wrap">
						{#each flag.route_codes as code, j}
							<div class="badge badge-outline badge-lg">
								{code}
								<div
									class="btn btn-error btn-circle btn-xs"
									on:click={() => removeFlagRoute(i, j)}
									on:keypress={() => removeFlagRoute(i, j)}
								>
									✕
								</div>
							</div>
						{/each}
					</div>
					<hr />
				{/each}

				<div class="flex justify-end">
					<input
						type="button"
						class="btn btn-success btn-xs"
						value="+ postalete"
						on:click={addFlag}
						on:keypress={addFlag}
					/>
				</div>
			{/if}
		</div>
		<div class="border rounded-lg p-2">
			<div class="flex gap-2 items-center">
				<span class="text-base">Horários</span>
				<a
					class="btn btn-circle btn-ghost btn-xs text-info"
					href="/instructions/stopattrs#schedules"
					target="_blank"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="w-4 h-4 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</a>
				<div class="btn-group items-center">
					<button
						class="btn btn-xs px-4"
						class:btn-active={hasSchedules === true}
						on:click={() => (hasSchedules = true)}
						on:keypress={() => (hasSchedules = true)}>Sim</button
					>
					<button
						class="btn btn-xs px-6"
						class:btn-active={hasSchedules === null}
						on:click={() => (hasSchedules = null)}
						on:keypress={() => (hasSchedules = null)}>?</button
					>
					<button
						class="btn btn-xs px-4"
						class:btn-active={hasSchedules === false}
						on:click={() => (hasSchedules = false)}
						on:keypress={() => (hasSchedules = false)}>Não</button
					>
				</div>
			</div>
			{#if hasSchedules}
				<table class="table table-zebra table-compact w-full">
					<thead>
						<tr>
							<th class="text-xs">Linha</th>
							<th class="text-xs">Tipo</th>
							<th class="text-xs">Discrim.</th>
							<th>
								<input
									type="button"
									class="btn btn-success btn-xs"
									value="+"
									on:click={addScheduleEntry}
									on:keypress={addScheduleEntry}
									disabled={readOnly}
								/>
							</th>
						</tr>
					</thead>
					<tbody>
						{#each schedulesData as schedule, i}
							<tr>
								<td>
									<input
										type="text"
										class="w-10 input input-xs input-bordered px-0"
										bind:value={schedule.code}
									/>
								</td>
								<td class="p-0">
									<select
										class="select select-primary max-w-xs select-xs"
										bind:value={schedule.type}
										disabled={readOnly}
									>
										<option disabled selected value={null}>Tipo?</option>
										<option value="origin">Origem</option>
										<option value="prediction">Previs.</option>
										<option value="frequency">Periód.</option>
									</select>
								</td>
								<td class="p-0">
									<input
										type="text"
										class="w-16 input input-xs input-bordered px-0"
										bind:value={schedule.discriminator}
									/>
								</td>
								<td>
									<input
										type="button"
										class="btn btn-error btn-xs"
										value="-"
										on:click={() => removeScheduleEntry(i)}
										on:keypress={() => removeScheduleEntry(i)}
										disabled={readOnly}
									/>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
		<div class="grow border rounded-lg p-2">
			<div class="flex gap-2">
				<div class="label-text">Verificação</div>
				<input type="date" class="input input-xs input-bordered" bind:value={serviceCheckDate} />
				<input
					type="button"
					class="btn btn-primary btn-xs"
					value="Hoje"
					on:click={() => {
						serviceCheckDate = new Date().toISOString().split('T')[0];
					}}
					on:keypress={() => {
						serviceCheckDate = new Date().toISOString().split('T')[0];
					}}
				/>
				{#if $latestPictureDate}
					<input
						type="button"
						class="btn btn-info btn-xs"
						value="Fotos"
						on:click={() => {
							serviceCheckDate = $latestPictureDate.toISOString().split('T')[0];
						}}
						on:keypress={() => {
							serviceCheckDate = $latestPictureDate.toISOString().split('T')[0];
						}}
					/>
				{/if}
			</div>
		</div>
	</div>
</div>
