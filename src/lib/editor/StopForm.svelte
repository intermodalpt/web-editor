<script>
	import { createEventDispatcher } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { api_server } from '$lib/settings.js';
	import { token, decodedToken } from '$lib/stores.js';
	import StopCheckbox from '$lib/editor/StopCheckbox.svelte';
	import StopImageEditor from '$lib/editor/StopImageEditor.svelte';

	export let stop;

	let id = $stop.id;
	let name = $stop.name;
	let short_name = $stop.short_name;
	let official_name = $stop.official_name;
	let official_id = $stop.official_id;
	let locality = $stop.locality;
	let street = $stop.street;
	let door = $stop.door;
	let notes = $stop.notes;
	let tags = $stop.tags;

	let has_crossing = writable($stop.has_crossing);
	let has_accessibility = writable($stop.has_accessibility);
	let has_abusive_parking = writable($stop.has_abusive_parking);
	let has_outdated_info = writable($stop.has_outdated_info);
	let is_damaged = writable($stop.is_damaged);
	let is_vandalized = writable($stop.is_vandalized);
	let has_flag = writable($stop.has_flag);
	let has_schedules = writable($stop.has_schedules);
	let has_sidewalk = writable($stop.has_sidewalk);
	let has_shelter = writable($stop.has_shelter);
	let has_bench = writable($stop.has_bench);
	let has_trash_can = writable($stop.has_trash_can);
	let is_illumination_working = writable($stop.is_illumination_working);
	let illumination_strength = writable($stop.illumination_strength);
	let illumination_position = writable($stop.illumination_position);
	let has_illuminated_path = writable($stop.has_illuminated_path);
	let has_visibility_from_within = writable($stop.has_visibility_from_within);
	let has_visibility_from_area = writable($stop.has_visibility_from_area);
	let is_visible_from_outside = writable($stop.is_visible_from_outside);

	const dispatch = createEventDispatcher();
	let imageModal = false;

	const stopPictures = derived([stop], ([$stop], set) => {
		if ($stop) {
			if ($decodedToken) {
				fetch(`${api_server}/v1/stops/${$stop.id}/pictures/all`, {
					headers: { authorization: `Bearer ${$token}` }
				})
					.then((r) => r.json())
					.then((pictureList) => set(pictureList));
			} else {
				fetch(`${api_server}/v1/stops/${$stop.id}/pictures`)
					.then((r) => r.json())
					.then((pictureList) => set(pictureList));
			}
		} else {
			return [];
		}
	});

	stop.subscribe((selectedStop) => {
		if (selectedStop == null) {
			return;
		}

		id = selectedStop.id;
		name = selectedStop.name;
		short_name = selectedStop.short_name;
		official_name = selectedStop.official_name;
		official_id = selectedStop.official_id;
		locality = selectedStop.locality;
		street = selectedStop.street;
		door = selectedStop.door;
		notes = selectedStop.notes;
		tags = selectedStop.tags;

		$has_crossing = selectedStop.has_crossing;
		$has_accessibility = selectedStop.has_accessibility;
		$has_abusive_parking = selectedStop.has_abusive_parking;
		$has_outdated_info = selectedStop.has_outdated_info;
		$is_damaged = selectedStop.is_damaged;
		$is_vandalized = selectedStop.is_vandalized;
		$has_flag = selectedStop.has_flag;
		$has_schedules = selectedStop.has_schedules;
		$has_sidewalk = selectedStop.has_sidewalk;
		$has_shelter = selectedStop.has_shelter;
		$has_bench = selectedStop.has_bench;
		$has_trash_can = selectedStop.has_trash_can;
		$is_illumination_working = selectedStop.is_illumination_working;
		$illumination_strength = selectedStop.illumination_strength;
		$illumination_position = selectedStop.illumination_position;
		$has_illuminated_path = selectedStop.has_illuminated_path;
		$has_visibility_from_within = selectedStop.has_visibility_from_within;
		$has_visibility_from_area = selectedStop.has_visibility_from_area;
		$is_visible_from_outside = selectedStop.is_visible_from_outside;
	});

	has_visibility_from_within.subscribe((visibility_from_within) => {
		if (visibility_from_within) {
			$has_shelter = true;
			$has_visibility_from_area = true;
		}
	});

	has_visibility_from_area.subscribe((visibility_from_area) => {
		if (visibility_from_area == null) {
			$has_visibility_from_within = null;
		} else if (!visibility_from_area) {
			$has_visibility_from_within = false;
		}
	});

	has_shelter.subscribe((shelter) => {
		if (shelter == null && !shelter) {
			$has_visibility_from_within = null;
		}
	});

	function addTag() {
		let entry = document.getElementById('tag-text');
		let entryValue = entry.value.trim();

		if (entryValue !== '') {
			tags.push(entryValue);
			tags = tags;
		}
		entry.value = '';
	}

	function removeTag(tag) {
		tags.splice(tags.indexOf(tag), 1);
		tags = tags;
	}

	function save() {
		let newMeta = {
			id: id,
			name: name,
			short_name: short_name,
			official_name: official_name,
			official_id: official_id,
			locality: locality,
			street: street,
			door: door,
			tags: tags,
			notes: !notes || notes.trim() === '' ? null : notes.trim(),

			has_crossing: $has_crossing,
			has_accessibility: $has_accessibility,
			has_abusive_parking: $has_abusive_parking,
			has_outdated_info: $has_outdated_info,
			is_damaged: $is_damaged,
			is_vandalized: $is_vandalized,
			has_flag: $has_flag,
			has_schedules: $has_schedules,
			has_sidewalk: $has_sidewalk,
			has_shelter: $has_shelter,
			has_bench: $has_bench,
			has_trash_can: $has_trash_can,
			is_illumination_working: $is_illumination_working,
			illumination_strength: $illumination_strength,
			illumination_position: $illumination_position,
			has_illuminated_path: $has_illuminated_path,
			has_visibility_from_within: $has_visibility_from_within,
			has_visibility_from_area: $has_visibility_from_area,
			is_visible_from_outside: $is_visible_from_outside
		};
		dispatch('save', newMeta);
	}
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
	<div class="flex flex-col gap-1 p-2 overflow-visible w-full">
		<div class="form-control w-full max-w-xs">
			<label class="input-group">
				<span class="label-text w-24">Fonte</span>
				<input
					type="text"
					value={`${$stop.id} - ${$stop.source}`}
					class="input input-bordered w-full input-xs"
					disabled
				/>
			</label>
		</div>
		<div class="form-control w-full max-w-xs">
			<label class="input-group">
				<span class="label-text w-24">OSM</span>
				<input
					type="text"
					bind:value={$stop.osm_name}
					class="input input-bordered w-full input-xs"
					disabled
				/>
			</label>
		</div>
		<div class="form-control w-full max-w-xs">
			<label class="input-group">
				<span class="label-text w-24">Oficial</span>
				<input
					type="text"
					bind:value={official_name}
					placeholder="Vl. Qts. R Pessoa 29"
					disabled
					class="input input-bordered w-full input-sm"
				/>
			</label>
		</div>
		<div class="form-control w-full max-w-xs">
			<label class="input-group">
				<span class="label-text w-24">Opr. Id</span>
				<input
					type="text"
					bind:value={official_id}
					placeholder="15000000"
					disabled={!$decodedToken?.permissions?.is_admin}
					class="input input-bordered w-full input-sm"
				/>
			</label>
		</div>
		<div class="form-control w-full max-w-xs">
			<label class="input-group">
				<span class="label-text w-24">Nome</span>
				<input
					type="text"
					bind:value={name}
					placeholder="Vale das Quintas, Rua Pessoa, 29"
					class="input input-bordered w-full input-sm"
					disabled={!$decodedToken?.permissions?.is_admin}
				/>
			</label>
		</div>
		<div class="form-control w-full max-w-xs">
			<label class="input-group">
				<span class="label-text w-24">Abrev.</span>
				<input
					type="text"
					bind:value={short_name}
					placeholder="Vl. Quintas, Pessoa"
					class="input input-bordered w-full input-sm"
					disabled={!$decodedToken?.permissions?.is_admin}
				/>
			</label>
		</div>
		<div class="form-control w-full max-w-xs">
			<label class="input-group">
				<span class="label-text w-24">Loc.</span>
				<input
					type="text"
					bind:value={locality}
					placeholder="Vale das Quintas"
					class="input input-bordered w-full input-sm"
					disabled={!$decodedToken}
				/>
			</label>
		</div>
		<div class="form-control w-full max-w-xs">
			<label class="input-group">
				<span class="label-text w-24">Via</span>
				<input
					type="text"
					bind:value={street}
					placeholder="Rua Pessoa"
					class="input input-bordered w-full input-sm"
					disabled={!$decodedToken}
				/>
			</label>
		</div>
		<div class="form-control w-full max-w-xs">
			<label class="input-group">
				<span class="label-text w-24">Porta</span>
				<input
					type="text"
					bind:value={door}
					placeholder="29"
					class="input input-bordered w-full input-sm"
					disabled={!$decodedToken}
				/>
			</label>
		</div>
	</div>
	<div>
		<label class="label"><span class="label-text">Carateristicas</span></label>
		<StopCheckbox
			text="Postaletes"
			description="O poste ou abrigo da paragem tem um postalete"
			state={has_flag}
			disabled={!$decodedToken}
		/>
		<StopCheckbox
			text="Horários"
			description="A paragem tem horários atualizados"
			state={has_schedules}
			disabled={!$decodedToken}
		/>
		<StopCheckbox
			text="Passeio"
			description="A paragem encontra-se fora da via de rodagem, berma ou de terreno"
			state={has_sidewalk}
			disabled={!$decodedToken}
		/>
		<StopCheckbox
			text="Abrigo"
			description="A paragem encontra-se inserida num abrigo que resguarde da chuva e do vento"
			state={has_shelter}
			disabled={!$decodedToken}
		/>
		<StopCheckbox
			text="Banco"
			description="A paragem tem bancos onde os passageiros se possam sentar"
			state={has_bench}
			disabled={!$decodedToken}
		/>
		<StopCheckbox
			text="Caixote do lixo"
			description="A paragem dispõe de um caixote do lixo a menos de 20 metros"
			state={has_trash_can}
			disabled={!$decodedToken}
		/>
		<label class="label"><span class="label-text">Defeitos</span></label>
		<StopCheckbox
			text="Estacionamento abusivo"
			description="Alvo recorrente de estacionamento abusivo impeditivo ao bom funcionamento"
			state={has_abusive_parking}
			disabled={!$decodedToken}
		/>
		<StopCheckbox
			text="Informação obsoleta"
			description="A informação prestada na paragem (horários/postaletes) encontra-se obsoleta"
			state={has_outdated_info}
			disabled={!$decodedToken}
		/>
		<StopCheckbox
			text="Danificada"
			description="A infraestrutura encontra-se danificada (ex. banco partido)"
			state={is_damaged}
			disabled={!$decodedToken}
		/>
		<StopCheckbox
			text="Vandalizada"
			description="Existe uma quantidade substâncial de vandalismo (eg. graffitti)"
			state={is_vandalized}
			disabled={!$decodedToken}
		/>
	</div>
	<div>
		<label class="label"><span class="label-text">Acesso</span></label>
		<StopCheckbox
			text="Atravessamento de via"
			description="Existem infraestruturas ou sinalizações que permitam o atravessamento de via"
			state={has_crossing}
			disabled={!$decodedToken}
		/>
		<StopCheckbox
			text="Acesso mobilidade reduzida"
			description="A paragem dispõe de acesso para pessoas com mobilidade reduzida"
			state={has_accessibility}
			disabled={!$decodedToken}
		/>
		<label class="label"><span class="label-text">Iluminação</span></label>
		<select
			class="select select-primary max-w-xs select-xs"
			bind:value={$illumination_position}
			disabled={!$decodedToken}
		>
			<option disabled selected value={null}>Posição</option>
			<option value={0}>Indireta</option>
			<option value={10}>Directa</option>
			<option value={20}>Própria</option>
		</select>
		<select
			class="select select-primary max-w-xs select-xs"
			bind:value={$illumination_strength}
			disabled={!$decodedToken}
		>
			<option disabled selected value={null}>Intensidade</option>
			<option value={0}>Sem iluminação</option>
			<option value={1}>Fraca</option>
			<option value={3}>Moderada</option>
			<option value={5}>Forte</option>
		</select>
		<StopCheckbox
			text="Funcional"
			description="A iluminação não se encontra fundida"
			state={is_illumination_working}
			disabled={!$decodedToken}
		/>
		<StopCheckbox
			text="No acesso"
			description="O acesso para a paragem encontra-se bem iluminado todas as 24 horas"
			state={has_illuminated_path}
			disabled={!$decodedToken}
		/>
		<label class="label"><span class="label-text">Visibilidade</span></label>
		<StopCheckbox
			text="Da paragem para autocarro"
			description="Estando na paragem (+-5 metros) é possível ver autocarros atempadamente"
			state={has_visibility_from_area}
			disabled={!$decodedToken}
		/>
		<StopCheckbox
			text="Do abrigo para autocarro"
			description="Estando sentado no abrigo é possível ver autocarros atempadamente"
			state={has_visibility_from_within}
			disabled={!$decodedToken}
		/>
		<StopCheckbox
			text="Do autocarro para paragem"
			description="Enquanto motorista, é possível ver devidamente a paragem sem abrandar"
			state={is_visible_from_outside}
			disabled={!$decodedToken}
		/>
	</div>
	<div>
		<div class="form-control">
			<label class="label">
				<span class="label-text">Tags</span>
			</label>
			<div class="flex flex-col gap-2">
				<div>
					<input
						id="tag-text"
						type="text"
						class="input input-bordered"
						placeholder="Creche ABC123"
						disabled={!$decodedToken}
					/>
					<input
						class="btn"
						type="button"
						value="Add"
						on:click={addTag}
						disabled={!$decodedToken}
					/>
				</div>
				{#each tags as tag}
					<div class="badge badge-outline badge-lg">
						{tag}
						<div class="btn btn-error btn-circle btn-xs" on:click={() => removeTag(tag)}>✕</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
	<div class="form-control">
		<label class="label">
			<span class="label-text">Notas</span>
		</label>
		<textarea
			class="textarea textarea-bordered h-12"
			placeholder="Falta obter-se uma foto que mostre que a paragem se encontra frente a xyz"
			bind:value={notes}
			disabled={!$decodedToken}
		/>
	</div>
	<div class="form-control">
		<label class="label">
			<span class="label-text">Fotos</span>
		</label>
		<div class="flex gap-2">
			{#if $stopPictures === undefined || $stopPictures.length === 0}
				<span>Sem fotos</span>
			{:else}
				{#each $stopPictures as picture}
					<a
						target="_blank"
						href="https://intermodal-storage-worker.claudioap.workers.dev/ori/{picture.sha1}/{picture.original_filename}"
					>
						<img
							src="https://intermodal-storage-worker.claudioap.workers.dev/medium/{picture.sha1}/preview"
							class="rounded-box transition-all hover:scale-150 h-16"
						/>
					</a>
				{/each}
			{/if}
		</div>
	</div>
</div>
<div class="flex w-full justify-end">
	<button class="btn btn-primary w-20 float-right" on:click={save} disabled={!$decodedToken}
		>Guardar</button
	>
</div>
<!--{#if imageModal}-->
<!--  <StopImageEditor bind:image={openedImage} on:close={close} />-->
<!--{/if}-->
