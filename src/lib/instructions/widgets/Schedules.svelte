<script>
	export let schedulesData = [];
</script>

<table class="table table-zebra table-compact">
	<thead>
		<tr>
			<th class="text-xs">Linha</th>
			<th class="text-xs">Tipo</th>
			<th class="text-xs">Discrim.</th>
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
						disabled
					/>
				</td>
				<td class="p-0">
					<select
						class="select select-primary max-w-xs select-xs"
						bind:value={schedule.type}
						disabled
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
						disabled
					/>
				</td>
			</tr>
		{/each}
	</tbody>
</table>
