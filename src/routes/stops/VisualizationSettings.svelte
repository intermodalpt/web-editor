<script>
	import { createEventDispatcher } from 'svelte';
	import BooleanToggle from '$lib/editor/BooleanToggle.svelte';

	const dispatch = createEventDispatcher();

	export let filters = [];
	export let visualization = 'attrs_weighted';

	let filterType = null;
	let expectedText1 = null;
	let expectedText2 = null;
	let selectedAttr = null;
	let dateLessThan = null;
	let dateGreaterThan = null;

	let expectedBoolVal = null;
	let expectedSelectorVal = null;

	$: isFilterValid =
		filterType &&
		((filterType === 'name' && isRegexValid(expectedText1)) ||
			(filterType === 'flags' &&
				((expectedText1 && isRegexValid(expectedText1)) ||
					(expectedText2 && isRegexValid(expectedText2)))) ||
			(filterType === 'attr' && selectedAttr) ||
			(filterType === 'infrastructure_check_date' && (dateLessThan || dateGreaterThan) !== null) ||
			(filterType === 'service_check_date' && (dateLessThan || dateGreaterThan) !== null) ||
			(filterType === 'authenticity' && expectedSelectorVal !== null));

	const boolAttrs = [
		'has_sidewalk',
		'has_sidewalked_path',
		'has_shelter',
		'has_cover',
		'has_bench',
		'has_trash_can',
		'has_waiting_times',
		'has_ticket_seller',
		'has_costumer_support',
		'has_crossing',
		'has_flat_access',
		'has_wide_access',
		'has_tactile_access',
		'has_visibility_from_within',
		'has_visibility_from_area',
		'has_illuminated_path',
		'is_visible_from_outside'
	];

	const selectorAttrs = [
		'advertisement_qty',
		'illumination_strength',
		'illumination_position',
		'parking_visibility_impairment',
		'parking_local_access_impairment',
		'parking_area_access_impairment'
	];

	function clearInputs() {
		expectedText1 = null;
		dateLessThan = null;
		dateGreaterThan = null;
		expectedBoolVal = null;
		expectedSelectorVal = null;
	}

	function addFilter() {
		filters.push(pendingFilter());
		filters = filters;
		dispatch('filter_change');
	}

	function pendingFilter() {
		if (filterType === 'name') {
			try {
				return {
					type: 'name',
					nameExp: expectedText1 ? new RegExp(expectedText1) : null
				};
			} catch (e) {
				alert(e);
			}
		} else if (filterType === 'flags') {
			try {
				return {
					type: 'flags',
					nameExp: expectedText1 ? new RegExp(expectedText1) : null,
					idExp: expectedText2 ? new RegExp(expectedText2) : null
				};
			} catch (e) {
				alert(e);
			}
		} else if (filterType === 'schedules') {
			return {
				type: 'schedules',
				routeCode: expectedText1 ? new RegExp(expectedText1) : null,
				printingFrom: dateLessThan,
				printingTo: dateGreaterThan,
				negated: false
			};
		} else if (filterType === 'attr' && selectedAttr) {
			if (boolAttrs.includes(selectedAttr)) {
				return {
					type: 'attr',
					attr: selectedAttr,
					expectedVal: expectedBoolVal
				};
			} else if (selectorAttrs.includes(selectedAttr)) {
				return {
					type: 'attr',
					attr: selectedAttr,
					expectedVal: expectedSelectorVal
				};
			}
		} else if (filterType === 'infrastructure_check_date') {
			return {
				type: 'infrastructure_check_date',
				dateLessThan: dateLessThan,
				dateGreaterThan: dateGreaterThan
			};
		} else if (filterType === 'service_check_date') {
			return {
				type: 'service_check_date',
				dateLessThan: dateLessThan,
				dateGreaterThan: dateGreaterThan
			};
		} else if (filterType === 'authenticity') {
			return {
				type: 'authenticity',
				expectedVal: expectedSelectorVal
			};
		}
	}

	function isRegexValid(expr) {
		try {
			new RegExp(expr);
			return true;
		} catch (e) {
			return false;
		}
	}
</script>

<div class="flex items-center gap-2">
	<h2 class="text-lg">Visualização</h2>
	<select
		class="select select-primary select-xs"
		bind:value={visualization}
		on:change={() => {
			dispatch('visualization_change');
		}}
	>
		<option value="attrs_log">Log Atributos</option>
		<option selected value="attrs_weighted">Atributos ponderados</option>
		<option value="attrs">Atributos linear</option>
		<!-- <option value="attrs_weighted_log">Log Atributos ponderados</option> -->
		<option value="refs">Identificação</option>
		<option value="pics">Fotografada</option>
	</select>
</div>
<div class="flex items-center gap-2">
	<h2 class="text-lg">Filtros</h2>
	<div class="max-w-full text-sm breadcrumbs">
		<ul>
			{#each filters as filter, i}
				<li>
					<div class="badge badge-outline">
						{filter.type}{#if filter.type === 'attr'}: {filter.attr}{/if}
						<span
							class="btn btn-circle btn-error btn-xs"
							on:click={() => {
								filters.splice(i, 1);
								filters = filters;
								dispatch('filter_change');
							}}>X</span
						>
					</div>
				</li>
			{/each}
		</ul>
	</div>
	<label for="new-filter-modal" class="btn btn-xs btn-success">+</label>
</div>

<input type="checkbox" id="new-filter-modal" class="modal-toggle" />
<div class="modal z-[11]">
	<div class="modal-box relative z-[11]">
		<label for="new-filter-modal" class="btn btn-sm btn-circle absolute right-2 top-2">✕</label>
		<h3 class="text-lg font-bold">Novo filtro</h3>
		<div class="flex flex-col">
			<span class="text-md">Tipo de filtro</span>
			<select
				bind:value={filterType}
				class="select select-primary select-xs"
				on:change={() => clearInputs()}
			>
				<option disabled selected value={null}>Tipo de filtro</option>
				<option value="name">Nomes</option>
				<option value="flags">Bandeiras</option>
				<option value="schedules">Horários</option>
				<option value="attr">Atributo</option>
				<option value="service_check_date">Verificação do Serviço</option>
				<option value="infrastructure_check_date">Verificação da Infraestrutura</option>
				<option value="authenticity">Autenticidade</option>
			</select>
			<div class="flex flex-col">
				{#if filterType === 'name'}
					<span class="text-md">Nome a filtrar (Regex)</span>
					<input
						class="input input-primary input-xs"
						class:input-error={!isRegexValid(expectedText1)}
						type="text"
						placeholder="null"
						bind:value={expectedText1}
					/>
				{:else if filterType === 'flags'}
					<span class="text-md">Nome a filtrar (Regex, opcional)</span>
					<input
						class="input input-primary input-xs"
						class:input-error={!isRegexValid(expectedText1)}
						type="text"
						placeholder="Nome"
						bind:value={expectedText1}
					/>
					<span class="text-md">Identificador a filtrar (Regex, opcional)</span>
					<input
						class="input input-primary input-xs"
						class:input-error={!isRegexValid(expectedText1)}
						type="text"
						placeholder="Identificador"
						bind:value={expectedText2}
					/>
				{:else if filterType === 'schedules'}
					<span class="text-md">Linha afectada (Regex)</span>
					<input
						class="input input-primary input-xs"
						class:input-error={expectedText1 && !isRegexValid(expectedText1)}
						type="text"
						placeholder="Linha"
						bind:value={expectedText1}
					/>
					<span class="text-md">Impressão entre (data inicial, opcional)</span>
					<input
						class="input input-primary input-xs"
						type="date"
						placeholder="Mais recente que"
						bind:value={dateLessThan}
					/>
					<span class="text-md">e (data final, opcional)</span>
					<input
						class="input input-primary input-xs"
						type="date"
						placeholder="Mais antigo que"
						bind:value={dateGreaterThan}
					/>
				{:else if filterType === 'attr'}
					<span class="text-md">Atributo a filtrar</span>
					<select
						bind:value={selectedAttr}
						class="select select-primary select-xs"
						on:change={() => clearInputs()}
					>
						<option disabled selected value={null}>--------</option>
						<option value="has_sidewalk">Passeio</option>
						<option value="has_sidewalked_path">Passeio no caminho</option>
						<option value="has_shelter">Abrigo</option>
						<option value="has_cover">Cobertura</option>
						<option value="has_bench">Banco</option>
						<option value="has_trash_can">Balde do lixo</option>
						<option value="has_waiting_times">Tempos de espera</option>
						<option value="has_ticket_seller">Venda</option>
						<option value="has_costumer_support">Apoio ao cliente</option>
						<option value="advertisement_qty">Anúncios</option>
						<option value="has_crossing">Atravessamento</option>
						<option value="has_flat_access">Acesso sem ressaltos</option>
						<option value="has_wide_access">Acesso largo</option>
						<option value="has_tactile_access">Acesso táctil</option>
						<option value="illumination_strength">Força da iluminação</option>
						<option value="illumination_position">Posição da iluminação</option>
						<option value="has_illuminated_path">Caminho iluminado</option>
						<option value="has_visibility_from_area">Visibilidade da paragem</option>
						<option value="has_visibility_from_within">Visibilidade do abrigo</option>
						<option value="is_visible_from_outside">Visibilidade exterior</option>
						<option value="parking_visibility_impairment">Lim. visual parque</option>
						<option value="parking_local_access_impairment">Disfuncional acesso</option>
						<option value="parking_area_access_impairment">Disfuncional paragem</option>
					</select>
				{:else if filterType === 'infrastructure_check_date'}
					<span class="text-md">Entre (data inicial, opcional)</span>
					<input
						class="input input-primary input-xs"
						type="date"
						placeholder="Mais recente que"
						bind:value={dateLessThan}
					/>
					<span class="text-md">E (data final, opcional)</span>
					<input
						class="input input-primary input-xs"
						type="date"
						placeholder="Mais antigo que"
						bind:value={dateGreaterThan}
					/>
				{:else if filterType === 'service_check_date'}
					<span class="text-md">Entre (data inicial, opcional)</span>
					<input
						class="input input-primary input-xs"
						type="date"
						placeholder="Mais recente que"
						bind:value={dateLessThan}
					/>
					<span class="text-md">E (data final, opcional)</span>
					<input
						class="input input-primary input-xs"
						type="date"
						placeholder="Mais antigo que"
						bind:value={dateGreaterThan}
					/>
				{:else if filterType === 'authenticity'}
					<span class="text-md">Autenticidade</span>
					<select class="select select-primary select-xs" bind:value={expectedSelectorVal}>
						<option selected value={0}>Não verificado</option>
						<option value={8}>Infra muito provável</option>
						<option value={48}>Serviço verificado</option>
						<option value={12}>Infraestrutura verificada</option>
						<option value={84}>Errado</option>
						<option value={252}>Tudo verificado</option>
					</select>
				{/if}
			</div>
			{#if filterType === 'attr' && selectedAttr}
				<span class="text-md">Valor esperado</span>
				{#if boolAttrs.includes(selectedAttr)}
					<BooleanToggle bind:state={expectedBoolVal} />
				{:else if selectedAttr === 'advertisement_qty'}
					<select class="select select-primary select-xs" bind:value={expectedSelectorVal}>
						<option selected value={null}>Desconhecido</option>
						<option value={0}>Sem anúncios</option>
						<option value={2}>Pouca área de anúncio</option>
						<option value={4}>Muita área de anúncio</option>
						<option value={6}>Anúncios intrusivos</option>
					</select>
				{:else if selectedAttr === 'illumination_strength'}
					<select class="select select-primary select-xs" bind:value={expectedSelectorVal}>
						<option selected value={null}>Desconhecido</option>
						<option value={0}>Iluminação Indireta</option>
						<option value={10}>Iluminação Directa</option>
						<option value={20}>Iluminação Própria</option>
					</select>
				{:else if selectedAttr === 'illumination_position'}
					<select class="select select-primary select-xs" bind:value={expectedSelectorVal}>
						<option selected value={null}>Desconhecido</option>
						<option value={0}>Sem iluminação</option>
						<option value={1}>Iluminação Fraca</option>
						<option value={3}>Iluminação Moderada</option>
						<option value={5}>Iluminação Forte</option>
					</select>
				{:else if selectedAttr === 'parking_visibility_impairment'}
					<select class="select select-primary select-xs" bind:value={expectedSelectorVal}>
						<option selected value={null}>Desconhecido</option>
						<option value={0}>Sem limitações à visibilidade</option>
						<option value={2}>Pouco limitante à visibilidade</option>
						<option value={4}>Algo limitante à visibilidade</option>
						<option value={6}>Muito limitante à visibilidade</option>
					</select>
				{:else if selectedAttr === 'parking_local_access_impairment'}
					<select class="select select-primary select-xs" bind:value={expectedSelectorVal}>
						<option disabled selected value={null}>Disfuncional à paragem?</option>
						<option value={0}>Sem inteferência à paragem</option>
						<option value={2}>Pouca intreferêcia à paragem</option>
						<option value={4}>Alguma intreferência à paragem</option>
						<option value={6}>Muita intreferência à paragem</option>
					</select>
				{:else if selectedAttr === 'parking_area_access_impairment'}
					<select class="select select-primary select-xs" bind:value={expectedSelectorVal}>
						<option disabled selected value={null}>Disfuncional ao acesso?</option>
						<option value={0}>Acesso sem inteferência</option>
						<option value={2}>Acesso com pouca intreferêcia</option>
						<option value={4}>Acesso com alguma intreferência</option>
						<option value={6}>Acesso com muita intreferência</option>
					</select>
				{:else}
					Não implementado :(
				{/if}
			{/if}
		</div>

		<div class="flex justify-end">
			<button
				class="btn btn-sm btn-primary"
				class:btn-disabled={!isFilterValid}
				disabled={!isFilterValid}
				on:click={() => {
					if (isFilterValid) {
						addFilter(pendingFilter());
						document.getElementById('new-filter-modal').checked = false;
					}
				}}>Adicionar</button
			>
		</div>
	</div>
</div>
