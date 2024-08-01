<script>
	import { onMount, createEventDispatcher, tick } from 'svelte';
	import { movementTreshold } from '$lib/settings';
	import { writable } from 'svelte/store';
	import { permissions, toast, uid } from '$lib/stores';
	import { isDeepEqual, deepCopy } from '$lib/utils';
	import Icon from '$lib/components/Icon.svelte';
	import MapLocationPicker from './subcomponents/MapLocationPicker.svelte';
	import StopAttrs from './subcomponents/StopAttrs.svelte';
	import { deleteStopPic, getStopPic, updateStopPic } from '$lib/api';

	const dispatch = createEventDispatcher();
	const managedAttrs = ['flag', 'schedule', 'defect', 'vehicle', 'infra', 'nocturnal'];

	export let imageId;
	export let stops;

	let image = null;

	onMount(async () => {
		const res = await fetch(`${apiServer}/v1/stop_pics/${imageId}`, {
			credentials: 'include'
		}).then((r) => r.json());

		image = res;

		lon = image.lon;
		lat = image.lat;
		notes = image.notes;
		$stopIds = [...image.tags];
		$stopRels = deepCopy(image.stops);
		$stopIds = image.stops.map((rel) => rel.id);
		isPublic = image.public;
		isSensitive = image.sensitive;
		quality = image.quality;

		// Focuses
		attrHasFlag = (image.attrs || []).includes('flag');
		attrHasSchedule = (image.attrs || []).includes('schedule');
		attrHasDefect = (image.attrs || []).includes('defect');
		attrHasVehicle = (image.attrs || []).includes('vehicle');
		attrHasInfra = (image.attrs || []).includes('infra');
		attrIsNocturnal = (image.attrs || []).includes('nocturnal');

		await tick();
		adjustQualityLabel();
		locationPicker?.setMarkerPosition(lon, lat);
	});

	const editable = image?.uploader === $uid || isAdmin($permissions);
	let saveInProgress = false;

	let qualityLabelElem;
	let locationPicker;

	// Provisory state
	let lon;
	let lat;
	let stopRels = writable([]);
	// This is a reduction of the former meant to be used in the StopPicker
	let stopIds = writable([]);
	let isSensitive;
	let isPublic;
	let quality;
	let notes;
	$: trimmedNotes = notes?.trim() === '' ? null : notes;
	let tags = [];

	let attrHasFlag;
	let attrHasSchedule;
	let attrHasDefect;
	let attrHasVehicle;
	let attrHasInfra;
	let attrIsNocturnal;

	$: stopsChanged = !isDeepEqual($stopRels, image?.stops || []);
	$: posChanged = lon !== image?.lon || lat !== image?.lat;
	$: notesChanged = trimmedNotes !== image?.notes;
	$: tagsChanged = !isDeepEqual(tags, image?.tags || []);
	$: sensitiveChanged = isSensitive !== image?.sensitive;
	$: publicChanged = isPublic !== image?.public;
	$: qualityChanged = quality !== image?.quality;

	$: globalAttrsChanged =
		image &&
		(attrHasFlag !== image.attrs.includes('flag') ||
			attrHasSchedule !== image.attrs.includes('schedule') ||
			attrHasDefect !== image.attrs.includes('defect') ||
			attrHasVehicle !== image.attrs.includes('vehicle') ||
			attrHasInfra !== image.attrs.includes('infra') ||
			attrIsNocturnal !== image.attrs.includes('nocurnal'));

	$: changed =
		stopsChanged ||
		posChanged ||
		tagsChanged ||
		globalAttrsChanged ||
		notesChanged ||
		sensitiveChanged ||
		publicChanged ||
		qualityChanged;

	$: dispatch('change', { fromOriginal: changed });

	stopIds.subscribe((stopIds) => {
		const newRels = $stopRels.filter((rel) => stopIds.some((id) => rel.id == id));

		stopIds.forEach((id) => {
			if (!newRels.some((rel) => rel.id == id)) {
				newRels.push({ id: id, attrs: [] });
			}
		});
		$stopRels = newRels;
	});

	function adjustQualityLabel() {
		let label = qualityLabelElem;
		if (!label) return;

		switch (quality) {
			case 0:
				label.textContent = '0 - Sem informação';
				break;
			case 10:
				label.textContent = '1 - Desfocada';
				break;
			case 20:
				label.textContent = '2 - De dentro de um veiculo (visível na imagem)';
				break;
			case 30:
				label.textContent = '3 - Mal direccionada';
				break;
			case 40:
				label.textContent = '4 - De dentro de um veiculo (reflexos ou filto no vidro)';
				break;
			case 50:
				label.textContent = '5 - Noturna / Excesso ou falta de brilho';
				break;
			case 60:
				label.textContent = '6 - Ângulos estranhos ou cortes';
				break;
			case 70:
				label.textContent = '7 - Paragem não é sujeito principal';
				break;
			case 80:
				label.textContent = '8 - Pessoas, veículos ou lixo';
				break;
			case 90:
				label.textContent = '9 - Imperfeições menores (é possivel fazer melhor)';
				break;
			case 100:
				label.textContent = '10 - Absolutamente nada de assinalável';
				break;
			default:
				label.textContent = '?';
		}
	}

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

	function setAttrPresence(pic, attr, presence) {
		if (presence) {
			pic.attrs.push(attr);
		} else {
			pic.attrs.splice(pic.attrs.indexOf(attr), 1);
		}
		pic.attrs = pic.attrs;
	}

	async function saveChanges() {
		saveInProgress = true;
		const attrs = image.attrs.filter((attr) => !managedAttrs.includes(attr));

		if (attrHasFlag) attrs.push('flag');
		if (attrHasSchedule) attrs.push('schedule');
		if (attrHasDefect) attrs.push('defect');
		if (attrHasVehicle) attrs.push('vehicle');
		if (attrHasInfra) attrs.push('infra');
		if (attrIsNocturnal) attrs.push('nocturnal');

		const savedPic = {
			attrs,
			lat: image.lat,
			lon: image.lon,
			stops: [...$stopRels],
			public: isPublic,
			sensitive: isSensitive,
			quality: quality,
			notes: trimmedNotes,
			tags: image.tags,
			tagged: true
		};

		if (lat != null) {
			if (image.lat == null || Math.abs(image.lat - lat) > movementTreshold) {
				savedPic.lat = lat;
			}
		}

		if (lon != null) {
			if (image.lon == null || Math.abs(image.lon - lon) > movementTreshold) {
				savedPic.lon = lon;
			}
		}

		fetch(`${apiServer}/v1/stop_pics/${imageId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify(savedPic)
		})
			.catch((e) => {
				alert('Failed to save the stop meta. Error: ' + e.message);
				saveInProgress = false;
			})
			.then(() => {
				image.tagged = true;
				image.lon = savedPic.lon;
				image.lat = savedPic.lat;
				image.stops = savedPic.stops;
				image.public = savedPic.public;
				image.sensitive = savedPic.sensitive;
				image.quality = savedPic.quality;
				image.notes = savedPic.notes;
				image.tags = savedPic.tags;

				setAttrPresence(image, 'flag', attrHasFlag);
				setAttrPresence(image, 'schedule', attrHasSchedule);
				setAttrPresence(image, 'defect', attrHasDefect);
				setAttrPresence(image, 'vehicle', attrHasVehicle);
				setAttrPresence(image, 'infra', attrHasInfra);
				setAttrPresence(image, 'nocturnal', attrIsNocturnal);
				saveInProgress = false;

				dispatch('save', { picture: image });
			});
	}

	function deleteImage() {
		if (confirm('Tem certeza que quer apagar esta imagem?')) {
			fetch(`${apiServer}/v1/stop_pics/${imageId}`, { method: 'DELETE', credentials: 'include' })
				.catch(() => alert('Failed to delete the image'))
				.then(() => {
					dispatch('delete', { id: imageId });
				});
		}
	}
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto">
	{#if image}
		<div class="w-fit">
			<div class="relative w-fit">
				<img alt="Em análise" src={image?.url_medium} class="rounded-lg w-full max-h-[100em]" />
				<a
					target="_blank"
					href={image.url_full}
					class="absolute bottom-0 right-0 link link-neutral bg-base-100 rounded-tl-lg px-2"
					>Ver completa</a
				>
				<button
					class="absolute top-0 right-0 btn btn-error btn-sm rounded-tl-none rounded-br-none"
					on:click={deleteImage}>Apagar</button
				>
			</div>
			<div class="w-full hidden lg:block">
				<table class="w-full table table-compact">
					<tr>
						<td>Ficheiro</td>
						<td>{image?.original_filename}</td>
					</tr>
					<tr>
						<td>Data</td>
						<td>{image?.capture_date}</td>
					</tr>
					<tr>
						<td>Recebido</td>
						<td>{image?.upload_date}</td>
					</tr>
				</table>
			</div>
		</div>

		<div class="flex flex-col">
			<h2 class="text-xl font-bold py-2">
				Localização e paragens
				{#if !lat || !lon}
					<span class="bg-warning text-warning-content rounded-full p-1 text-center text-lg"
						>Incompleto</span
					>
				{/if}
			</h2>
			<span>Onde se encontrava quando tirou esta fotografia?</span>
			<MapLocationPicker
				bind:this={locationPicker}
				{lat}
				{lon}
				{stops}
				selectedStopIds={stopIds}
				canSelectStops={editable}
				on:change={(e) => {
					lat = e.detail.lat;
					lon = e.detail.lon;
				}}
			/>
			<div class="form-control">
				{#if $stopIds.length === 0}
					<span class="text-lg">Escolha paragens seleccionando-as no mapa acima</span>
				{:else}
					<span class="text-xs mt-1">Paragens</span>
				{/if}
				<div class="flex flex-row flex-wrap gap-1">
					{#key imageId}
						{#each $stopRels as rel}
							<StopAttrs
								bind:rel
								{stops}
								{editable}
								on:delete={(e) => {
									$stopIds = $stopIds.filter((id) => id !== e.detail.stop);
								}}
							/>
						{/each}
					{/key}
				</div>
			</div>
			<h2 class="text-xl font-bold py-2">Categorias</h2>
			<span>Em que categorias se insere esta imagem?</span>
			<div class="flex flex-wrap gap-2">
				<input
					class="btn btn-sm"
					type="checkbox"
					bind:checked={attrHasFlag}
					aria-label="Postalete"
				/>
				<input
					class="btn btn-sm border-2"
					type="checkbox"
					bind:checked={attrHasSchedule}
					aria-label="Horário"
				/>
				<input
					class="btn btn-sm"
					type="checkbox"
					bind:checked={attrHasVehicle}
					aria-label="Veiculo TP"
				/>
				<input
					class="btn btn-sm"
					type="checkbox"
					bind:checked={attrHasDefect}
					aria-label="Defeito"
				/>
				<input
					class="btn btn-sm"
					type="checkbox"
					bind:checked={attrHasInfra}
					aria-label="Infraestrutura"
				/>
				<input
					class="btn btn-sm"
					type="checkbox"
					bind:checked={attrIsNocturnal}
					aria-label="Noturna"
				/>
			</div>
			<h2 class="text-xl font-bold py-2">Visibilidade</h2>
			<span>Quão adequada é a fotografia ao público?</span>
			<div class="form-control mb-4">
				<span class="label flex-wrap">
					<span class="label-text">Qualidade da imagem</span>
					<span class="label-text" bind:this={qualityLabelElem}>Sem informação</span>
				</span>
				<input
					type="range"
					min="0"
					max="100"
					class="range range-sm"
					step="10"
					disabled={!editable}
					bind:value={quality}
					on:change={adjustQualityLabel}
				/>
				<div class="w-full flex justify-between text-xs px-2">
					<span>|</span>
					<span>|</span>
					<span>|</span>
					<span>|</span>
					<span>|</span>
					<span>|</span>
					<span>|</span>
					<span>|</span>
					<span>|</span>
					<span>|</span>
					<span>|</span>
				</div>
			</div>
			<div class="flex gap-3 items-baseline flex-wrap">
				<label class="btn btn-success w-40" class:btn-error={isSensitive} for="is-sensitive">
					{#if isSensitive}Sensivel{:else}Não sensivel{/if}
					<input id="is-sensitive" type="checkbox" class="hidden" bind:checked={isSensitive} />
				</label>
				<label class="btn btn-success w-40 btn-xl" class:btn-error={!isPublic} for="is-public">
					{#if isPublic}Pública{:else}Privada{/if}
					<input id="is-public" type="checkbox" class="hidden" bind:checked={isPublic} />
				</label>
			</div>
			<span class="text-lg">
				A imagem
				{#if isSensitive}
					<span class="text-error font-bold">deve de ser censurada</span>
				{:else}
					<span class="text-success font-bold">não infinge a privacidade</span>
				{/if}
				e
				{#if isPublic}
					<span class="text-success font-bold">tem</span>
				{:else}
					<span class="text-error font-bold">não tem</span>
				{/if}
				interesse público.
			</span>
			<h2 class="text-xl font-bold py-2">Informação adicional</h2>
			<div class="form-control">
				<span class="label label-text">Notas</span>
				<textarea
					class="textarea textarea-bordered h-12"
					placeholder="Exemplo: Atrás da paragem encontra-se um gambuzino."
					disabled={!editable}
					bind:value={notes}
				/>
			</div>
			<div>
				<div class="form-control">
					<span class="label label-text"></span>
					<div>
						{#each tags as tag}
							<div class="badge badge-outline badge-lg">
								{tag}
								<button class="btn btn-error btn-circle btn-xs" on:click={() => removeTag(tag)}>
									<Icon name="close" class="h-4 stroke-current" />
								</button>
							</div>
						{/each}
						<input
							id="tag-text"
							type="text"
							class="input input-bordered"
							placeholder="Creche ABC123"
						/>
						<button class="btn btn-secondary" on:click={addTag}>Add</button>
					</div>
				</div>
			</div>

			{#if editable}
				<div class="flex justify-end">
					<button
						class="btn btn-primary my-4"
						disabled={(image.tagged && !changed) || saveInProgress}
						on:mouseup={saveChanges}>Guardar</button
					>
				</div>
			{/if}
		</div>
	{/if}
</div>
