<script>
	import AuthenticitySelectors from './AuthenticitySelectors.svelte';
	import CoordViewer from '$lib/components/CoordViewer.svelte';
	import { permissions } from '$lib/stores';

	export let selectedStop;

	export let name;
	export let shortName;
	export let locality;
	export let street;
	export let door;

	export let verificationLevel;

	export let serviceAttrCount;
	export let infraAttrCount;
	export let totalInfraAttrCount;

	export let readOnly = true;
</script>

<div class="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
	<div class="flex flex-col gap-1 items-start">
		<div class="flex gap-2 items-center">
			<span class=" text-lg">#{$selectedStop?.id}</span>
			{#if $selectedStop}
				<CoordViewer lat={$selectedStop.lat} lon={$selectedStop.lon} />
			{/if}
		</div>
		<span>OpenStreetMap</span>
		<a
			class="link link-neutral ml-2 text-base border rounded-lg p-2"
			href="https://www.openstreetmap.org/node/{$selectedStop?.osm_id}">{$selectedStop?.osm_name}</a
		>
		<span>Operadores</span>
		<table class="table table-xs table-zebra">
			<thead>
				<tr>
					<th>Id</th>
					<th>Nome</th>
					<th>Ref</th>
					<th>Source</th>
				</tr>
			</thead>
			<tbody>
				{#each $selectedStop?.operators || [] as rel}
					<tr>
						<td>{rel.operator_id}</td>
						<td>{rel.name}</td>
						<td>{rel.stop_ref}</td>
						<td>{rel.source}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<div class="flex flex-col gap-1">
		<div class="form-control w-full">
			<label class="input-group">
				<span class="label-text w-24">Nome</span>
				<input
					type="text"
					bind:value={name}
					placeholder="Vale das Quintas, Rua Pessoa, 29"
					class="input input-bordered w-full input-sm"
					disabled={!$permissions.stops.modify_attrs}
				/>
			</label>
		</div>
		<div class="form-control w-full">
			<label class="input-group">
				<span class="label-text w-24">Abrev.</span>
				<input
					type="text"
					bind:value={shortName}
					placeholder="Vl. Quintas, Pessoa"
					class="input input-bordered w-full input-sm"
					disabled={!$permissions.stops.modify_attrs}
				/>
			</label>
		</div>
		<div class="form-control w-full">
			<label class="input-group">
				<span class="label-text w-24">Loc.</span>
				<input
					type="text"
					bind:value={locality}
					placeholder="Vale das Quintas"
					class="input input-bordered w-full input-sm"
					disabled={!($permissions.stops.modify_attrs || $permissions.stops.contrib_modify_attrs)}
				/>
			</label>
		</div>
		<div class="form-control w-full">
			<label class="input-group">
				<span class="label-text w-24">Via</span>
				<input
					type="text"
					bind:value={street}
					placeholder="Rua Pessoa"
					class="input input-bordered w-full input-sm"
					disabled={!($permissions.stops.modify_attrs || $permissions.stops.contrib_modify_attrs)}
				/>
			</label>
		</div>
		<div class="form-control w-full">
			<label class="input-group">
				<span class="label-text w-24">Porta</span>
				<input
					type="text"
					bind:value={door}
					placeholder="29"
					class="input input-bordered w-full input-sm"
					disabled={!($permissions.stops.modify_attrs || $permissions.stops.contrib_modify_attrs)}
				/>
			</label>
		</div>
	</div>
	<div class="flex flex-col gap-1">
		<span>Completude</span>
		<div class="flex flex-col gap-2 ml-2 text-base border rounded-lg p-2">
			<div>
				Serviço:
				<span>{serviceAttrCount}/2</span>
			</div>
			<div>
				Atributos:
				<span>{infraAttrCount}/{totalInfraAttrCount}</span>
			</div>
		</div>
		<span>Autenticidade</span>
		<div class="flex flex-col gap-2 ml-2 text-base border rounded-lg p-2">
			<AuthenticitySelectors bind:value={verificationLevel} disabled={!$permissions.stops.authenticate} />
		</div>
	</div>
</div>
