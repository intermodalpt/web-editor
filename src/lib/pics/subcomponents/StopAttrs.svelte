<script>
	import { createEventDispatcher } from 'svelte';
	import { onMount } from 'svelte';

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
		{stop?.id} - {stop?.short_name || stop?.name || stop?.osm_name}
		{stop ? '' : '(⚠️)'}
	</div>
	{#if editable}
		<div
			class="btn btn-error btn-circle btn-xs absolute top-0 right-0"
			on:click={issueDelete}
			on:keypress={issueDelete}
		>
			✕
		</div>
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
			bind:checked={attrBack}
			disabled={!editable}
			aria-label="Traseira"
		/>
		<div class="w-full flex justify-center">
			<svg
				class="w-24 h-16"
				xmlns="http://www.w3.org/2000/svg"
				width="31.665"
				height="24.314"
				viewBox="0 0 8.378 6.433"
				xmlns:v="https://vecta.io/nano"
				><path d="M.175.175h7.322v6.083H.175z" fill="#666" paint-order="fill markers stroke" /><g
					stroke-width=".35"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path
						d="M7.497 6.215V.175"
						fill="none"
						stroke="#ccc"
						paint-order="fill markers stroke"
					/><path
						d="M8.203 5.807V.28L5.295 1.96l2.751 1.588"
						fill="#ff0"
						stroke="#540"
						paint-order="fill markers stroke"
					/><g fill="none" stroke="#ccc"
						><path d="M.175 6.258V.175" paint-order="fill markers stroke" /><path
							d="M3.836 6.258V.175"
							stroke-dasharray="0.349999, 1.05"
							paint-order="fill markers stroke"
						/></g
					></g
				></svg
			>
		</div>
		<input
			class="join-item btn btn-sm h-full"
			type="checkbox"
			bind:checked={attrFront}
			disabled={!editable}
			aria-label="Perfil"
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
