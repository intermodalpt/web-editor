<script>
	import BooleanFormAttr from '$lib/components/BooleanFormAttr.svelte';

	export let hasSidewalk;
	export let hasSidewalkedPath;
	export let hasShelter;
	export let hasCover;
	export let hasBench;
	export let hasTrashCan;
	export let advertisementQty;

	export let hasCrossing;
	export let hasFlatAccess;
	export let hasWideAccess;
	export let hasTactileAccess;
	export let illuminationPosition;
	export let illuminationStrength;
	export let hasIlluminatedPath;

	export let hasVisibilityFromArea;
	export let hasVisibilityFromWithin;
	export let isVisibleFromOutside;
	export let hasWaitingTimes;
	export let hasTicketSeller;
	export let hasCostumerSupport;

	export let parkingVisibilityImpairment;
	export let parkingLocalAccessImpairment;
	export let parkingAreaAccessImpairment;

	export let infrastructureCheckDate;

	export let latestPictureDate;
	export let readOnly = true;
</script>

<div
	class="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"
>
	<div class="flex flex-col gap-1">
		<span>Infraestrutura</span>
		<BooleanFormAttr
			label="Passeio"
			bind:state={$hasSidewalk}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#has_sidewalk"
		/>
		<BooleanFormAttr
			label="Passeio no acesso"
			bind:state={$hasSidewalkedPath}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#has_sidewalk"
		/>
		<BooleanFormAttr
			label="Abrigo"
			bind:state={$hasShelter}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#has_shelter"
		/>
		<BooleanFormAttr
			label="Cobertura"
			bind:state={$hasCover}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#has_cover"
		/>
		<BooleanFormAttr
			label="Banco"
			bind:state={$hasBench}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#has_bench"
		/>
		<BooleanFormAttr
			label="Caixote do lixo"
			bind:state={$hasTrashCan}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#has_trash_can"
		/>

		<select
			class="select select-bordered max-w-xs select-xs"
			bind:value={advertisementQty}
			disabled={readOnly}
		>
			<option selected value={null}>Anúncios?</option>
			<option value={0}>Sem anúncios</option>
			<option value={2}>Pouca área de anúncio</option>
			<option value={4}>Muita área de anúncio</option>
			<option value={6}>Anúncios intrusivos</option>
		</select>
	</div>
	<div class="flex flex-col gap-1">
		<span>Acesso</span>

		<BooleanFormAttr
			label="Atravessamento de via"
			bind:state={$hasCrossing}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#has_crossing"
		/>
		<BooleanFormAttr
			label="Acesso sem ressaltos"
			bind:state={$hasFlatAccess}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#has_flat_access"
		/>
		<BooleanFormAttr
			label="Acesso largo"
			bind:state={$hasWideAccess}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#has_wide_access"
		/>
		<BooleanFormAttr
			label="Acesso táctil"
			bind:state={$hasTactileAccess}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#has_tactile_access"
		/>
		<span>Iluminação</span><br />
		<select
			class="select select-bordered max-w-xs select-xs"
			bind:value={illuminationPosition}
			disabled={readOnly}
		>
			<option selected value={null}>Posição?</option>
			<option value={0}>Iluminação Indireta</option>
			<option value={10}>Iluminação Directa</option>
			<option value={20}>Iluminação Própria</option>
		</select>
		<select
			class="select select-bordered max-w-xs select-xs"
			bind:value={illuminationStrength}
			disabled={readOnly}
		>
			<option selected value={null}>Intensidade?</option>
			<option value={0}>Sem iluminação</option>
			<option value={1}>Iluminação Fraca</option>
			<option value={3}>Iluminação Moderada</option>
			<option value={5}>Iluminação Forte</option>
		</select>
		<BooleanFormAttr
			label="No acesso"
			bind:state={$hasIlluminatedPath}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#has_illuminated_path"
		/>
	</div>
	<div class="flex flex-col gap-1">
		<span>Visibilidade</span>
		<BooleanFormAttr
			label="Da paragem para autocarro"
			bind:state={$hasVisibilityFromArea}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#has_visibility_from_area"
		/>
		{#if $hasShelter}
			<BooleanFormAttr
				label="Do abrigo para autocarro"
				bind:state={$hasVisibilityFromWithin}
				disabled={readOnly}
				infoUrl="/instructions/stopattrs#has_visibility_from_within"
			/>
		{/if}
		<BooleanFormAttr
			label="Do autocarro para paragem"
			bind:state={$isVisibleFromOutside}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#is_visible_from_outside"
		/>
		<span>Apoios</span>
		<BooleanFormAttr
			label="Tempos de espera"
			bind:state={$hasWaitingTimes}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#has_waiting_times"
		/>
		<BooleanFormAttr
			label="Ponto de venda"
			bind:state={$hasTicketSeller}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#has_ticket_seller"
		/>
		<BooleanFormAttr
			label="Apoio ao passageiro"
			bind:state={$hasCostumerSupport}
			disabled={readOnly}
			infoUrl="/instructions/stopattrs#has_costumer_support"
		/>
	</div>
	<div class="flex flex-col gap-1">
		<span>Parque automóvel</span>
		<select
			class="select select-bordered max-w-xs select-xs"
			bind:value={parkingVisibilityImpairment}
			disabled={readOnly}
		>
			<option disabled selected value={null}>Limitação visual?</option>
			<option value={0}>Sem limitações à visibilidade</option>
			<option value={2}>Pouco limitante à visibilidade</option>
			<option value={4}>Algo limitante à visibilidade</option>
			<option value={6}>Muito limitante à visibilidade</option>
		</select>
		<select
			class="select select-bordered max-w-xs select-xs"
			bind:value={parkingLocalAccessImpairment}
			disabled={readOnly}
		>
			<option disabled selected value={null}>Disfuncional à paragem?</option>
			<option value={0}>Sem inteferência à paragem</option>
			<option value={2}>Pouca intreferêcia à paragem</option>
			<option value={4}>Alguma intreferência à paragem</option>
			<option value={6}>Muita intreferência à paragem</option>
		</select>
		<select
			class="select select-bordered max-w-xs select-xs"
			bind:value={parkingAreaAccessImpairment}
			disabled={readOnly}
		>
			<option disabled selected value={null}>Disfuncional ao acesso?</option>
			<option value={0}>Acesso sem inteferência</option>
			<option value={2}>Acesso com pouca intreferêcia</option>
			<option value={4}>Acesso com alguma intreferência</option>
			<option value={6}>Acesso com muita intreferência</option>
		</select>
	</div>
	<div>
		<span class="label-text">Verificação</span>
		<div class="flex gap-1">
			<input
				type="date"
				class="input input-xs input-bordered"
				bind:value={infrastructureCheckDate}
			/>
			<input
				type="button"
				class="btn btn-primary btn-xs"
				value="Hoje"
				on:click={() => {
					infrastructureCheckDate = new Date().toISOString().split('T')[0];
				}}
				on:keypress={() => {
					infrastructureCheckDate = new Date().toISOString().split('T')[0];
				}}
			/>
			{#if $latestPictureDate}
				<input
					type="button"
					class="btn btn-info btn-xs"
					value="Fotos"
					on:click={() => {
						infrastructureCheckDate = $latestPictureDate.toISOString().split('T')[0];
					}}
					on:keypress={() => {
						infrastructureCheckDate = $latestPictureDate.toISOString().split('T')[0];
					}}
				/>
			{/if}
		</div>
	</div>
</div>
