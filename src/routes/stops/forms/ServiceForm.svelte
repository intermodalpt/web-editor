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
						on:click={() => (hasFlags = true)}>Sim</button
					>
					<button
						class="btn btn-xs px-6 join-item"
						class:btn-active={hasFlags === null}
						on:click={() => (hasFlags = null)}>?</button
					>
					<button
						class="btn btn-xs px-4 join-item"
						class:btn-active={hasFlags === false}
						on:click={() => (hasFlags = false)}>Não</button
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
									<button
										class="btn btn-error btn-xs"
										disabled={readOnly}
										on:click={() => removeFlag(i)}>-</button
									>
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
									<button
										class="btn btn-success btn-xs"
										disabled={readOnly}
										on:click={() => addFlagRoute(i)}>+linha</button
									>
								</th>
							</tr>
						</thead>
					</table>
					<div class="flex flex-wrap">
						{#each flag.route_codes as code, j}
							<div class="badge badge-outline badge-lg">
								{code}
								<button
									class="btn btn-error btn-circle btn-xs"
									on:click={() => removeFlagRoute(i, j)}
								>
									✕
								</button>
							</div>
						{/each}
					</div>
					<hr />
				{/each}

				<div class="flex justify-end">
					<button class="btn btn-success btn-xs" on:click={addFlag}>+ postalete</button>
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
						on:click={() => (hasSchedules = true)}>Sim</button
					>
					<button
						class="btn btn-xs px-6"
						class:btn-active={hasSchedules === null}
						on:click={() => (hasSchedules = null)}>?</button
					>
					<button
						class="btn btn-xs px-4"
						class:btn-active={hasSchedules === false}
						on:click={() => (hasSchedules = false)}>Não</button
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
								<button
									class="btn btn-success btn-xs"
									on:click={addScheduleEntry}
									disabled={readOnly}>+</button
								>
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
									<button
										class="btn btn-error btn-xs"
										on:click={() => removeScheduleEntry(i)}
										disabled={readOnly}>-</button
									>
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
				<button
					class="btn btn-primary btn-xs"
					on:click={() => {
						serviceCheckDate = new Date().toISOString().split('T')[0];
					}}>Hoje</button
				>
				{#if $latestPictureDate}
					<button
						class="btn btn-info btn-xs"
						on:click={() => {
							serviceCheckDate = $latestPictureDate.toISOString().split('T')[0];
						}}>Fotos</button
					>
				{/if}
			</div>
		</div>
	</div>
</div>
