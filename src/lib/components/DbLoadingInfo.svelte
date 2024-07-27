<script>
	import { liveQuery } from 'dexie';
	import {
		regionsLoaded,
		operatorsLoaded,
		stopsLoaded,
		routesLoaded,
		parishesLoaded,
		regionId,
		getRegions,
		getOperators,
		getParishes,
		getStops,
		getRoutes
	} from '$lib/db';

	//let minimized = false;
	let minimized = true;

	const regions = liveQuery(() => getRegions());
	const operators = liveQuery(() => getOperators());
	const parishes = liveQuery(() => getParishes());
	const stops = liveQuery(() => getStops());
	const routes = liveQuery(() => getRoutes());
</script>

<div class="fixed bottom-0 right-0 z-50">
	<button
		class="btn btn-xs btn-ghost opacity-20"
		class:hidden={!minimized}
		on:click={() => (minimized = false)}>{minimized ? '«' : ''}</button
	>
	<table class="bg-base-100 rounded-md px-2" class:hidden={minimized}>
		<tr>
			<td>
				{#if $regionsLoaded}✓{:else}<span class="loading loading-spinner loading-xs" />{/if}
			</td>
			<td>Regiões</td>
			<td>{$regions ? Object.keys($regions).length : '-'}</td>
		</tr>
		<tr>
			<td>
				{#if $operatorsLoaded}✓{:else}<span class="loading loading-spinner loading-xs" />{/if}
			</td>
			<td>Operadores</td>
			<td>{$operators ? Object.keys($operators).length : '-'}</td>
		</tr>
		<tr>
			<td
				>{#if $parishesLoaded}✓{:else}<span class="loading loading-spinner loading-xs" />{/if}
			</td>
			<td>Freguesias</td>
			<td>{$parishes ? Object.keys($parishes).length : '-'}</td>
		</tr><tr>
			<td>
				{#if $stopsLoaded}✓{:else}<span class="loading loading-spinner loading-xs" />{/if}
			</td>
			<td>Paragens</td>
			<td>{$stops ? Object.keys($stops).length : '-'}</td>
		</tr><tr>
			<td>
				{#if $routesLoaded}✓{:else}<span class="loading loading-spinner loading-xs" />{/if}
			</td>
			<td>Linhas</td>
			<td>{$routes ? Object.keys($routes).length : '-'}</td>
		</tr>
	</table>
</div>
