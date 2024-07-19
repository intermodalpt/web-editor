<script>
	import { createEventDispatcher } from 'svelte';
	import { onMount } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	const dispatch = createEventDispatcher();

	const managedAttrs = ['front', 'back', 'movement', 'cmovement', 'primary', 'secondary', 'env'];

	const relevancy = {
		primary: 'primary',
		secondary: 'secondary',
		env: 'env'
	};

	export let rel;
	export let stops;
	export let editable;

	$: stop = $stops ? $stops[rel.id] : undefined;

	let attrFront;
	let attrBack;
	let attrMovement;
	let attrCounterMovement;
	let attrRelevance = null;

	let oriAttrFront;
	let oriAttrBack;
	let oriAttrMovement;
	let oriAttrCounterMovement;
	let oriAttrRelevance;

	$: updateData(rel);

	$: attrsChanged =
		attrFront !== oriAttrFront ||
		attrBack !== oriAttrBack ||
		attrMovement !== oriAttrMovement ||
		attrCounterMovement !== oriAttrCounterMovement ||
		attrRelevance !== oriAttrRelevance;

	$: {
		(attrFront || attrBack || attrMovement || attrCounterMovement || attrRelevance || true) &&
			issueChange(attrsChanged);
	}

	function issueChange() {
		const attrs = rel.attrs.filter((attr) => !managedAttrs.includes(attr));

		if (attrRelevance) attrs.push(attrRelevance);
		if (attrFront) attrs.push('front');
		if (attrBack) attrs.push('back');
		if (attrMovement) attrs.push('movement');
		if (attrCounterMovement) attrs.push('cmovement');

		rel.attrs = attrs;

		dispatch('change', {
			id: rel.id,
			attrs: attrs,
			changed: attrsChanged
		});
	}

	function issueDelete() {
		dispatch('delete', { stop: rel.id });
	}

	function updateData(rel) {
		attrFront = rel.attrs.includes('front');
		attrBack = rel.attrs.includes('back');
		attrMovement = rel.attrs.includes('movement');
		attrCounterMovement = rel.attrs.includes('cmovement');

		oriAttrFront = attrFront;
		oriAttrBack = attrBack;
		oriAttrMovement = attrMovement;
		oriAttrCounterMovement = attrCounterMovement;

		if (rel.attrs.includes(relevancy.primary)) {
			attrRelevance = relevancy.primary;
		} else if (rel.attrs.includes(relevancy.secondary)) {
			attrRelevance = relevancy.secondary;
		} else if (rel.attrs.includes(relevancy.env)) {
			attrRelevance = relevancy.env;
		} else {
			attrRelevance = null;
		}
		oriAttrRelevance = attrRelevance;
	}

	onMount(() => {
		updateData(rel);
	});
</script>

<div class="w-full border-2 rounded-md p-2 relative flex flex-col gap-2">
	<div class="font-semibold">
		{stop?.id} - {stop?.short_name || stop?.name}
		{stop ? '' : '(⚠️)'}
	</div>
	{#if editable}
		<button class="btn btn-error btn-circle btn-xs absolute top-0 right-0" on:click={issueDelete}>
			<Icon name="close" class="h-4 stroke-current" />
		</button>
	{/if}

	<div class="join join-vertical sm:join-horizontal">
		<input
			class="join-item btn btn-sm"
			type="radio"
			value={relevancy.primary}
			bind:group={attrRelevance}
			disabled={!editable}
			aria-label="Principal"
		/>
		<input
			class="join-item btn btn-sm"
			type="radio"
			value={relevancy.secondary}
			bind:group={attrRelevance}
			disabled={!editable}
			aria-label="Secundária"
		/>
		<input
			class="join-item btn btn-sm"
			type="radio"
			value={relevancy.env}
			bind:group={attrRelevance}
			disabled={!editable}
			aria-label="Ambiente"
		/>
	</div>

	<div class="grid grid-cols-3">
		<span />
		<input
			class="join-item btn btn-md"
			type="checkbox"
			bind:checked={attrMovement}
			disabled={!editable}
			aria-label="Destino"
		/>
		<span />
		<input
			class="join-item btn btn-sm h-full"
			type="checkbox"
			bind:checked={attrFront}
			disabled={!editable}
			aria-label="Perfil"
		/>
		<div class="w-full flex justify-center">
			<Icon name="bus-stop" class="w-24 h-16" />
		</div>
		<input
			class="join-item btn btn-sm h-full"
			type="checkbox"
			bind:checked={attrBack}
			disabled={!editable}
			aria-label="Traseira"
		/>
		<span />
		<input
			class="join-item btn btn-md"
			type="checkbox"
			bind:checked={attrCounterMovement}
			disabled={!editable}
			aria-label="Origem"
		/>
	</div>
</div>
