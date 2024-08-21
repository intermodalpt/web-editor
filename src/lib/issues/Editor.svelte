<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores';
	import Icon from '$lib/components/Icon.svelte';
	import LocationPicker from '$lib/components/LocationPicker.svelte';
	import ContentBlock from '$lib/content/editor/ContentBlock.svelte';
	import { createIssue } from '$lib/api';
	import ContentEditor from './ContentEditor.svelte';

	export let issue;
	export let stops;
	export let routes;
	export let operators;

	let title: string = issue?.title ?? '';
	let category: string = issue?.category ?? '';
	let lat: number | null = issue?.lat ?? null;
	let lon: number | null = issue?.lon ?? null;

	let content: ContentBlock = issue?.content ?? [];
	let issueRoutes: number[] = issue?.route_ids ?? [];
	let issueStops: number[] = issue?.stop_ids ?? [];
	let issueOperators: number[] = issue?.operator_ids ?? [];

	let newStopId: string;
	$: newStop = stops[newStopId];
	let newRouteId: string;
	$: newRoute = routes[newRouteId];
	let newOperatorId: string;
	$: newOperator = operators[newOperatorId];

	function removeStop(stopId: number) {
		issueStops = issueStops.filter((e) => e !== stopId);
		issueStops = issueStops;
	}

	function removeRoute(routeId: number) {
		issueRoutes = issueRoutes.filter((e) => e !== routeId);
		issueRoutes = issueRoutes;
	}

	function removeOperator(operatorId: number) {
		issueOperators = issueOperators.filter((e) => e !== operatorId);
		issueOperators = issueOperators;
	}

	async function submit() {
		let issue = {
			title: title,
			category: category,
			impact: -1,
			lat: lat,
			lon: lon,
			content,
			route_ids: issueRoutes,
			stop_ids: issueStops,
			operator_ids: issueOperators
		};

		await createIssue(issue, {
			onSuccess: (data) => {
				goto(`/issues/${data.id}`);
			},
			onError: (res) => {
				toast('Erro ao criar problema', 'error');
			},
			toJson: true
		});
	}

	onMount(() => {});
</script>

<div class="form-control">
	<label class="input-group">
		<span class="w-28">Titulo</span>
		<input type="text" bind:value={title} class="input input-bordered w-full input-md" />
	</label>
</div>

<div class="form-control">
	<label class="input-group">
		<span class="w-28">Categoria</span>
		<select class="input input-bordered w-full" bind:value={category}>
			<option value="stopimprovement">Paragens: Melhoria</option>
			<option value="stopissue">Paragens: Problema</option>
			<option value="routeimprovement">Linhas: Melhorias</option>
			<option value="scheduleissue">Horários: Problema</option>
			<option value="scheduleimprovement">Horários: Melhoria</option>
			<option value="serviceimprovement">Serviço: Melhoria</option>
			<option value="gtfs">GTFS</option>
		</select>
	</label>
</div>

<span>Conteúdo</span>
<ContentEditor bind:content canEdit={true} />

<span>Localização (Opcional)</span>
<LocationPicker bind:lon bind:lat canEdit={true} />

<h2 class="text-lg">Referenciar</h2>
<div class="form-control">
	<label class="input-group">
		<span class="w-28">Linha</span>
		<input type="number" bind:value={newRouteId} class="input input-bordered w-full input-md" />
		<button
			disabled={!newRoute}
			on:click={() => {
				issueRoutes.push(parseInt(newRouteId));
				issueRoutes = issueRoutes;
				newRouteId = null;
			}}
			class="btn btn-md btn-success">Adicionar</button
		>
	</label>
</div>
{#if issueRoutes.length > 0}
	<div class="form-control">
		<span class="label">
			<span class="label-text">Referenciadas</span>
		</span>
		<div>
			{#each issueRoutes as routeId}
				<div class="badge badge-outline badge-lg">
					{routeId} - {routes[routeId].name}
					<button class="btn btn-error btn-circle btn-xs" on:click={() => removeRoute(routeId)}>
						<Icon name="close" class="h-4 stroke-current" />
					</button>
				</div>
			{/each}
		</div>
	</div>
{/if}

<div class="form-control">
	<label class="input-group">
		<span class="w-28">Paragem</span>
		<input type="number" bind:value={newStopId} class="input input-bordered w-full input-md" />
		<button
			disabled={!newStop}
			on:click={() => {
				issueStops.push(parseInt(newStopId));
				issueStops = issueStops;
				newStopId = null;
			}}
			class="btn btn-md btn-success">Adicionar</button
		>
	</label>
</div>
{#if issueStops.length > 0}
	<div class="form-control">
		<span class="label">
			<span class="label-text">Referenciadas</span>
		</span>
		<div>
			{#each issueStops as stopId}
				<div class="badge badge-outline badge-lg">
					{stopId} - {stops[stopId].name}
					<button class="btn btn-error btn-circle btn-xs" on:click={() => removeStop(stopId)}>
						<Icon name="close" class="h-4 stroke-current" />
					</button>
				</div>
			{/each}
		</div>
	</div>
{/if}

<div class="form-control">
	<label class="input-group">
		<span class="w-28">Operador</span>
		<input type="number" bind:value={newOperatorId} class="input input-bordered w-full input-md" />
		<button
			class="btn btn-md btn-success"
			disabled={!newOperator}
			on:click={() => {
				issueOperators.push(parseInt(newOperatorId));
				issueOperators = issueOperators;
				newOperatorId = null;
			}}>Adicionar</button
		>
	</label>
</div>
{#if issueOperators.length > 0}
	<div class="form-control">
		<span class="label">
			<span class="label-text">Referenciadas</span>
		</span>
		<div>
			{#each issueOperators as operatorId}
				<div class="badge badge-outline badge-lg">
					{operatorId} - {operators[operatorId]?.name ?? '?'}
					<button
						class="btn btn-error btn-circle btn-xs"
						on:click={() => removeOperator(operatorId)}
					>
						<Icon name="close" class="h-4 stroke-current" />
					</button>
				</div>
			{/each}
		</div>
	</div>
{/if}

<div class="flex" class:justify-between={issue} class:justify-end={!issue}>
	{#if issue}
		<button class="btn btn-error" on:click={submit}>
			<Icon name="delete" class="p-3 h-full fill-error-content" />
			Apagar
		</button>
		<!-- TODO Add content validity check here -->
		<button class="btn btn-primary" on:click={submit}>
			<Icon name="save" class="p-3 h-full fill-primary-content" />
			Guardar
		</button>
	{:else}
		<!-- TODO Add content validity check here -->
		<button class="btn btn-primary" disabled={!title || !category} on:click={submit}>
			<Icon name="plus" class="p-3 h-full fill-primary-content" />
			Create
		</button>
	{/if}
</div>
