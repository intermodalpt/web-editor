<script>
	import { createEventDispatcher, tick } from 'svelte';
	import { apiServer, movementTreshold } from '$lib/settings.js';
	import { writable, derived } from 'svelte/store';
	import { token, decodedToken } from '$lib/stores.js';
	import { isDeepEqual } from '$lib/utils.js';
	import MapLocationPicker from '$lib/editor/MapLocationPicker.svelte';

	const dispatch = createEventDispatcher();

	export let imageId;
	export let stops;

	const image = derived(imageId, ($imageId, set) => {
		if (!$imageId) {
			set(null);
			return;
		}
		fetch(`${apiServer}/v1/stop_pics/${$imageId}`, {
			headers: {
				Authorization: `Bearer ${$token}`
			}
		})
			.then((r) => r.json())
			.then((r) => {
				set(r);
			});
	});

	const editable =
		$image?.uploader === $decodedToken?.permissions?.uid || $decodedToken?.permissions?.is_admin;

	let qualityLabelElem;
	let locationPicker;

	// Provisory state
	let lon;
	let lat;
	let stopIds = writable([]);
	let isSensitive;
	let isPublic;
	let quality;
	let notes;
	$: trimmedNotes = notes?.trim() === '' ? null : notes;
	let tags = [];

	let attrFront;
	let attrBack;
	let attrMovement;
	let attrCounterMovement;

	let attrHasFlag;
	let attrHasSchedule;
	let attrHasDefect;
	let attrHasVehicle;
	let attrHasInfra;
	let attrHasSurroundings;

	$: stopsChanged = !isDeepEqual($stopIds, $image?.stops || []);
	$: posChanged = lon !== $image?.lon || lat !== $image?.lat;
	$: notesChanged = trimmedNotes !== $image?.notes;
	$: tagsChanged = !isDeepEqual(tags, $image?.tags || []);
	$: sensitiveChanged = isSensitive !== $image?.sensitive;
	$: publicChanged = isPublic !== $image?.public;
	$: qualityChanged = quality !== $image?.quality;

	$: attrsChanged =
		$image &&
		(attrFront !== $image.attrs.includes('vFront') ||
			attrBack !== $image.attrs.includes('vBack') ||
			attrMovement !== $image.attrs.includes('vMovement') ||
			attrCounterMovement !== $image.attrs.includes('vCMovement') ||
			attrHasFlag !== $image.attrs.includes('fFlag') ||
			attrHasSchedule !== $image.attrs.includes('fSchedule') ||
			attrHasDefect !== $image.attrs.includes('fDefect') ||
			attrHasVehicle !== $image.attrs.includes('fVehicle') ||
			attrHasInfra !== $image.attrs.includes('fInfra') ||
			attrHasSurroundings !== $image.attrs.includes('fSurroundings'));

	$: changed =
		stopsChanged ||
		posChanged ||
		tagsChanged ||
		attrsChanged ||
		notesChanged ||
		sensitiveChanged ||
		publicChanged ||
		qualityChanged;

	$: dispatch('change', { fromOriginal: changed });

	image.subscribe(async (img) => {
		if (img == null) {
			return;
		} else {
			lon = img.lon;
			lat = img.lat;
			notes = img.notes;
			$stopIds = [...img.tags];
			$stopIds = [...img.stops];
			isPublic = img.public;
			isSensitive = img.sensitive;
			quality = img.quality;

			// Views
			attrFront = (img.attrs || []).includes('vFront');
			attrBack = (img.attrs || []).includes('vBack');
			attrMovement = (img.attrs || []).includes('vMovement');
			attrCounterMovement = (img.attrs || []).includes('vCMovement');
			// Focuses
			attrHasFlag = (img.attrs || []).includes('fFlag');
			attrHasSchedule = (img.attrs || []).includes('fSchedule');
			attrHasDefect = (img.attrs || []).includes('fDefect');
			attrHasVehicle = (img.attrs || []).includes('fVehicle');
			attrHasInfra = (img.attrs || []).includes('fInfra');
			attrHasSurroundings = (img.attrs || []).includes('fSurroundings');

			await tick();
			adjustQualityLabel();
			locationPicker?.setMarkerPosition(lon, lat);
		}
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
				label.textContent = '3 - De dentro de um veiculo (reflexos ou filto no vidro)';
				break;
			case 40:
				label.textContent = '4 - Mal direccionada';
				break;
			case 50:
				label.textContent = '5 - Noturna';
				break;
			case 60:
				label.textContent = '6 - Excesso ou falta de brilho';
				break;
			case 70:
				label.textContent = '7 - Paragem não é sujeito principal';
				break;
			case 80:
				label.textContent = '8 - Pessoas, veículos ou lixo';
				break;
			case 90:
				label.textContent = '9 - Imperfeições menores (seria possivel fazer melhor?)';
				break;
			case 100:
				label.textContent = '10 - Absolutamente nada de assinalável';
				break;
			default:
				label.textContent = '?';
		}
	}

	function removeStop(stopId) {
		$stopIds.splice($stopIds.indexOf(stopId), 1);
		$stopIds = $stopIds;
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
		const savedPic = {
			lat: $image.lat,
			lon: $image.lon,
			stops: [...$stopIds],
			public: isPublic,
			sensitive: isSensitive,
			quality: quality,
			notes: trimmedNotes,
			tags: $image.tags,
			tagged: true
		};

		if (lat != null) {
			if ($image.lat == null || Math.abs($image.lat - lat) > movementTreshold) {
				savedPic.lat = location.lat;
			}
		}

		if (lon != null) {
			if ($image.lon == null || Math.abs($image.lon - lon) > movementTreshold) {
				savedPic.lon = lon;
			}
		}

		fetch(`${apiServer}/v1/stop_pics/${$imageId}`, {
			method: 'PATCH',
			body: JSON.stringify(savedPic),
			headers: {
				'Content-Type': 'application/json',
				authorization: `Bearer ${$token}`
			}
		})
			.catch((e) => alert('Failed to save the stop meta. Error: ' + e.message))
			.then(() => {
				$image.tagged = true;
				$image.lon = savedPic.lon;
				$image.lat = savedPic.lat;
				$image.stops = savedPic.stops;
				$image.public = savedPic.public;
				$image.sensitive = savedPic.sensitive;
				$image.quality = savedPic.quality;
				$image.notes = savedPic.notes;
				$image.tags = savedPic.tags;

				setAttrPresence($image, 'vFront', attrFront);
				setAttrPresence($image, 'vBack', attrBack);
				setAttrPresence($image, 'vMovement', attrMovement);
				setAttrPresence($image, 'vCMovement', attrCounterMovement);
				setAttrPresence($image, 'fFlag', attrHasFlag);
				setAttrPresence($image, 'fSchedule', attrHasSchedule);
				setAttrPresence($image, 'fDefect', attrHasDefect);
				setAttrPresence($image, 'fVehicle', attrHasVehicle);
				setAttrPresence($image, 'fInfra', attrHasInfra);
				setAttrPresence($image, 'fSurroundings', attrHasSurroundings);

				dispatch('save', { id: $imageId });
			});
	}

	function deleteImage() {
		if (confirm('Tem certeza que quer apagar esta imagem?')) {
			fetch(`${apiServer}/v1/stop_pics/${$imageId}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					authorization: `Bearer ${$token}`
				}
			})
				.catch(() => alert('Failed to delete the image'))
				.then(() => {
					dispatch('delete', { id: $imageId });
				});
		}
	}
</script>

<div class="flex flex-col overflow-y-auto">
	{#if $image}
		<div class="relative w-fit self-center">
			<img src={$image?.url_medium} class="rounded-lg w-full max-h-[100em]" />
			<a
				target="_blank"
				href={$image.url_full}
				class="absolute bottom-0 right-0 link link-neutral bg-base-100 rounded-tl-lg px-2"
				>Ver completa</a
			>
			<span
				class="absolute top-0 right-0 btn btn-error btn-sm rounded-tl-none rounded-br-none"
				on:click={deleteImage}>Apagar</span
			>
		</div>
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
				{#each $stopIds as stopId}
					<div class="badge badge-outline badge-lg">
						{stopId} - {stops[stopId]?.short_name || stops[stopId]?.name || stops[stopId]?.osm_name}
						{stops[stopId] ? '' : '(⚠️)'}
						{#if editable}
							<div
								class="btn btn-error btn-circle btn-xs"
								on:click={() => removeStop(stopId)}
								on:keypress={() => removeStop(stopId)}
							>
								✕
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
		<h2 class="text-xl font-bold py-2">Atributos</h2>
		<span>Quais os angulos apanhados?</span>
		<div class="join join-vertical sm:join-horizontal">
			<input
				class="join-item btn btn-outline"
				type="checkbox"
				bind:checked={attrFront}
				aria-label="Frontal"
			/>
			<input
				class="join-item btn btn-outline"
				type="checkbox"
				bind:checked={attrBack}
				aria-label="Traseira"
			/>
			<input
				class="join-item btn btn-outline"
				type="checkbox"
				bind:checked={attrMovement}
				aria-label="Movimento"
			/>
			<input
				class="join-item btn btn-outline"
				type="checkbox"
				bind:checked={attrCounterMovement}
				aria-label="Contra-Movimento"
			/>
		</div>
		<!-- TODO link instructions -->
		<span class="mt-2"
			><span>A imagem foca-se em algum dos seguintes aspectos?</span> (<a
				href="#"
				class="link link-primary text-xs">O que são?</a
			>)</span
		>
		<div class="join join-vertical">
			<input
				class="join-item btn btn-outline"
				type="checkbox"
				bind:checked={attrHasFlag}
				aria-label="Postalete"
			/>
			<input
				class="join-item btn btn-outline"
				type="checkbox"
				bind:checked={attrHasSchedule}
				aria-label="Horário"
			/>
			<input
				class="join-item btn btn-outline"
				type="checkbox"
				bind:checked={attrHasVehicle}
				aria-label="Veiculo TP"
			/>
			<input
				class="join-item btn btn-outline"
				type="checkbox"
				bind:checked={attrHasDefect}
				aria-label="Defeito"
			/>
			<input
				class="join-item btn btn-outline"
				type="checkbox"
				bind:checked={attrHasInfra}
				aria-label="Infraestrutura"
			/>
			<input
				class="join-item btn btn-outline"
				type="checkbox"
				bind:checked={attrHasSurroundings}
				aria-label="Arredores"
			/>
		</div>
		<h2 class="text-xl font-bold py-2">Classificação</h2>
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
		<div class="form-control">
			<label class="label flex-wrap">
				<span class="label-text">Qualidade da imagem</span>
				<span class="label-text" bind:this={qualityLabelElem}>Sem informação</span>
			</label>
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
		<span class="text-xs">
			As qualidades acima descritas são sugestões e não critérios.<br />
			Pontuações acima de 7 indicam uma fotografia boa o suficiente para o utilizador final. Uma pontuação
			de 10 indica uma fotografia de qualidade profissional com excelente iluminação, ausência de individuos
			e veículos na via pública, cosméticamente agradavel...
		</span>
		<h2 class="text-xl font-bold py-2">Informação adicional</h2>
		<div class="form-control">
			<label class="label">
				<span class="label-text">Notas</span>
			</label>
			<textarea
				class="textarea textarea-bordered h-12"
				placeholder="Exemplo: Atrás da paragem encontra-se um gambuzino."
				disabled={!editable}
				bind:value={notes}
			/>
		</div>
		<div>
			<div class="form-control">
				<label class="label"><span class="label-text">Etiquetas</span></label>
				<div>
					{#each tags as tag}
						<div class="badge badge-outline badge-lg">
							{tag}
							<div class="btn btn-error btn-circle btn-xs" on:click={() => removeTag(tag)}>✕</div>
						</div>
					{/each}
					<input
						id="tag-text"
						type="text"
						class="input input-bordered"
						placeholder="Creche ABC123"
					/>
					<input class="btn btn-secondary" type="button" value="Add" on:click={addTag} />
				</div>
			</div>
		</div>

		{#if editable && (!$image.tagged || changed)}
			<input
				type="button"
				class="btn btn-primary w-full my-4"
				value="Guardar"
				on:mouseup={saveChanges}
			/>
		{/if}
	{/if}
</div>
