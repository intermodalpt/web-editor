<script>
	import { createEventDispatcher } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { apiServer } from '$lib/settings.js';
	import { stops, token, decodedToken } from '$lib/stores.js';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import MapLocationPicker from '$lib/editor/MapLocationPicker.svelte';
	import StopPicker from '$lib/editor/StopPicker.svelte';

	export let stop;
	export let stopPictures;
	export let newPictures;

	const dispatch = createEventDispatcher();

	const steps = {
		position: 'position',
		visibility: 'visibility',
		quality: 'quality',
		stops: 'stops',
		notes: 'notes'
	};
	let step = null;

	let stopInput;

	// Uploader vars
	let files = [];
	let uploading = false;
	let uploadDone = false;
	let uploadCount = 0;
	let sendingPictures = false;
	const selectedImage = writable(null);

	// Provisory state
	let tmpLon;
	let tmpLat;
	let tmpNotes;
	let tmpStops;
	let tmpSensitive;
	let tmpPublic;
	let tmpQuality;

	selectedImage.subscribe((img) => {
		if (img == null) {
			return;
		} else {
			tmpLon = img.lon;
			tmpLat = img.lat;
			tmpNotes = img.notes;
			tmpStops = [...img.stops];
			tmpPublic = img.public;
			tmpSensitive = img.sensitive;
			tmpQuality = img.quality;
		}
	});

	const editedStopPictures = derived(stopPictures, ($stopPictures) => {
		if ($stopPictures == null) return [];
		return $stopPictures.map((pic) => {
			const position = !(pic.lon == null || pic.lat == null);
			const visibility = pic.tagged;
			const quality = pic.tagged;
			const stops = pic.stops != null && pic.stops.length > 0;
			const total = position && visibility && quality && stops;
			const fixable =
				!total &&
				(pic.uploader === $decodedToken?.permissions?.uid || $decodedToken?.permissions?.is_admin);

			pic.metaCompleteness = {
				position: position,
				visibility: visibility,
				quality: quality,
				stops: stops,
				total: total,
				fixable: fixable
			};
			pic.modified = false;

			return pic;
		});
	});

	function resetUploader() {
		files = [];
		uploading = false;
		uploadDone = false;
		uploadCount = 0;
	}

	function recalcMetaCompleteness(pic) {
		const position = !(pic.lon == null || pic.lat == null);
		const visibility = pic.tagged || pic.metaCompleteness?.visibility;
		const quality = pic.tagged || pic.metaCompleteness?.quality;
		const stops = pic.stops != null && pic.stops.length > 0;

		pic.metaCompleteness.total = position && visibility && quality && stops;
		// Trigger hasModifiedPictues update
		$newPictures = $newPictures;
	}

	function adjustQualityLabel() {
		let label = document.getElementById('quality-label');
		switch (tmpQuality) {
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
				label.textContent = '8 - Pessoas, veiculos ou lixo';
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

	function addStop() {
		let entryValue = parseInt(stopInput.value);

		if (!isNaN(entryValue)) {
			tmpStops.push(entryValue);
			tmpStops = tmpStops;
		}
		stopInput.value = '';
	}

	function removeStop(stopId) {
		tmpStops.splice(tmpStops.indexOf(stopId), 1);
		tmpStops = tmpStops;
	}

	async function upload() {
		uploadCount = 0;
		uploading = true;
		for (let x = 0; x < files.length; x++) {
			const formData = new FormData();
			formData.append('images[]', files[x]);
			let res = await fetch(`${apiServer}/v1/stop_pics/linked/${$stop.id}`, {
				method: 'POST',
				body: formData,
				headers: {
					authorization: `Bearer ${$token}`
				}
			})
				.then((res) => res.json())
				.then((pic) => {
					uploadCount += 1;

					pic.metaCompleteness = {
						position: false,
						visibility: false,
						quality: false,
						stops: true,
						total: false,
						fixable: true
					};
					$newPictures.push(pic);
					return true;
				})
				.catch((e) => {
					alert('Uma imagem falhou no seu upload');
					uploading = false;
				});
			if (!res) {
				break;
			}
		}
		$newPictures = $newPictures;
		uploading = false;
		uploadDone = true;
	}

	async function save() {
		let pics = $editedStopPictures.concat($newPictures);
		for (const pic of pics) {
			if (!pic.metaCompleteness.total) {
				alert('Uma das imagens tem atributos em falta. Corrija-os antes de guardar.');
				return;
			}
		}

		Promise.all(
			pics
				.filter((pic) => pic.modified)
				.map((pic) => {
					fetch(`${apiServer}/v1/stop_pics/${pic.id}`, {
						method: 'PATCH',
						body: JSON.stringify(pic),
						headers: {
							'Content-Type': 'application/json',
							authorization: `Bearer ${$token}`
						}
					})
						.catch((e) => alert('Falha a guardar..'))
						.then(() => {
							pic.tagged = true;
							pic.modified = false;
						});
				})
		).then(() => {
			// HACK - this is a hack to force the stop pics to update
			$stop.modTimestamp = new Date();
			$stop = $stop;
			dispatch('save');
		});
	}

	function deleteImage() {
		if (confirm('Tem certeza que quer apagar esta imagem?')) {
			fetch(`${apiServer}/v1/stop_pics/${$selectedImage.id}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
					authorization: `Bearer ${$token}`
				}
			})
				.catch(() => alert('Failed to delete the image'))
				.then(() => {
					// HACK - this is a hack to force the stop pics to update
					$stop.modTimestamp = new Date();
					$stop = $stop;
					dispatch('save');
				});
		}
	}

	function closeEditor() {
		if (
			$editedStopPictures.some((pic) => pic.modified) ||
			$newPictures.some((pic) => !pic.metaCompleteness.total)
		) {
			if (!confirm('Tem alterações pendentes. Se sair, estas poderão ser perdidas.')) {
				return;
			}
		}
		dispatch('save');
	}
</script>

<input type="checkbox" id="managing-pics" class="modal-toggle" checked />
<div class="modal">
	<div class="modal-box w-11/12 max-w-5xl">
		<input type="checkbox" id="uploading-pics" class="modal-toggle" checked />
		<div class="card w-full max-w-5xl self-center">
			<div class="flex gap-2 justify-end">
				<input
					type="button"
					class="btn btn-secondary"
					value="Adicionar"
					on:click={() => (sendingPictures = true)}
				/>
				<input type="button" class="btn btn-primary" value="Guardar" on:click={save} />
				<input type="button" class="btn btn-neutral" value="Fechar" on:click={closeEditor} />
			</div>

			<div class="flex gap-2 overflow-x-scroll">
				{#each $editedStopPictures as picture}
					<div class="relative">
						{#if picture.metaCompleteness.total || !picture.metaCompleteness.fixable}
							<span
								class="absolute bottom-0 right-0 text-success-content bg-success rounded-full w-8 h-8 text-center text-lg"
								>✓</span
							>
						{:else if !picture.metaCompleteness.total && picture.metaCompleteness.fixable}
							<span
								class="absolute bottom-0 right-0 text-warning-content bg-warning rounded-full w-8 h-8 text-center text-lg"
								>!</span
							>
						{:else}
							<span
								class="absolute bottom-0 right-0  bg-error text-error-content rounded-full w-8 h-8 text-center text-lg cursor-pointer"
								>X</span
							>
						{/if}
						<img
							src={picture.url_medium}
							class="rounded-box transition-all h-24 border-primary cursor-pointer"
							class:border-b-4={$selectedImage === picture}
							on:click={() => {
								$selectedImage = picture;
								step = null;
							}}
						/>
					</div>
				{/each}
				{#each $newPictures as picture}
					<div class="relative">
						{#if picture.metaCompleteness.total}
							<span
								class="absolute bottom-0 right-0 text-success-content bg-success rounded-full w-8 h-8 text-center text-lg"
								>✓</span
							>
						{:else}
							<span
								class="absolute bottom-0 right-0  bg-error text-error-content rounded-full w-8 h-8 text-center text-lg cursor-pointer"
								>X</span
							>
						{/if}
						<img
							src={picture.url_medium}
							class="rounded-box transition-all h-24 border-primary cursor-pointer"
							class:border-b-4={$selectedImage === picture}
							on:click={() => {
								$selectedImage = picture;
								step = null;
							}}
						/>
					</div>
				{/each}
			</div>
			{#if $selectedImage}
				<hr />
				<div
					class="bg-cover bg-center rounded-lg w-full h-40 sm:h-80 relative"
					style="background-image: url('{$selectedImage.url_medium}');"
				>
					<a
						target="_blank"
						href={$selectedImage.url_full}
						class="absolute bottom-0 right-0 link link-neutral bg-base-100 rounded-tl-lg px-2"
						>Ver completa</a
					>
				</div>
				{#if step === steps.position}
					Onde se encontrava quando tirou esta fotografia? (pin azul)
					<MapLocationPicker
						lat={tmpLat}
						lon={tmpLon}
						on:change={(e) => {
							tmpLat = e.detail.lat;
							tmpLon = e.detail.lon;
						}}
					/>
					<div class="flex justify-end gap-4">
						<input
							type="button"
							class="btn btn-neutral"
							value="Voltar"
							on:click={() => {
								if (!$selectedImage.metaCompleteness.position) {
									$selectedImage.lat = null;
									$selectedImage.lon = null;
								}
								step = null;
								tmpLat = $selectedImage.lat;
								tmpLon = $selectedImage.lon;
							}}
						/>
						<input
							type="button"
							class="btn btn-primary"
							value="Confirmar posição"
							on:click={() => {
								const lat = tmpLat;
								const lon = tmpLon;
								$selectedImage.lat = lat;
								$selectedImage.lon = lon;
								$selectedImage.metaCompleteness.position = true;
								recalcMetaCompleteness($selectedImage);
								step = null;
							}}
							disabled={!tmpLat || !tmpLon}
						/>
					</div>
				{:else if step === steps.visibility}
					<div class="flex gap-4 items-baseline mt-2 flex-wrap">
						<label class="btn btn-success w-40" class:btn-error={tmpSensitive} for="is-sensitive">
							{#if tmpSensitive}Sensivel{:else}Não sensivel{/if}
							<input id="is-sensitive" type="checkbox" class="hidden" bind:checked={tmpSensitive} />
						</label>
						<span class="text-lg">
							{#if tmpSensitive}
								A imagem tem de ser censurada para ser publicada
							{:else}
								A imagem não infinge a privacidade.
							{/if}
						</span>
					</div>
					<div class="flex gap-4 items-baseline mt-2 flex-wrap">
						<label class="btn btn-success w-40 btn-xl" class:btn-error={!tmpPublic} for="is-public">
							{#if tmpPublic}Pública{:else}Privada{/if}
							<input id="is-public" type="checkbox" class="hidden" bind:checked={tmpPublic} />
						</label>
						<span class="text-lg">
							{#if $selectedImage.public}
								A imagem tem condições para ser exibida ao público.
							{:else}
								A imagem destina-se a verificação, não à publicação.
							{/if}
						</span>
					</div>
					<div class="flex justify-end gap-4">
						<input
							type="button"
							class="btn btn-neutral"
							value="Voltar"
							on:click={() => {
								step = null;
								tmpPublic = $selectedImage.public;
								tmpSensitive = $selectedImage.sensitive;
							}}
						/>
						<input
							type="button"
							class="btn btn-primary"
							value="Confirmar visibilidade"
							on:click={() => {
								const isPublic = tmpPublic;
								const sensitive = tmpSensitive;
								$selectedImage.public = isPublic;
								$selectedImage.sensitive = sensitive;
								$selectedImage.modified = true;
								$selectedImage.metaCompleteness.visibility = true;
								recalcMetaCompleteness($selectedImage);
								step = null;
							}}
						/>
					</div>
				{:else if step === steps.quality}
					<div class="form-control">
						<label class="label flex-wrap">
							<span class="label-text">Qualidade da imagem</span>
							<span class="label-text" id="quality-label">Sem informação</span>
						</label>
						<input
							type="range"
							min="0"
							max="100"
							class="range range-sm"
							step="10"
							bind:value={tmpQuality}
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
						Pontuações acima de 7 indicam uma fotografia boa o suficiente para o utilizador final. Uma
						pontuação de 10 indica uma fotografia de qualidade profissional com excelente iluminação,
						ausência de individuos e veiculos na via pública, cosméticamente agradavel...
					</span>
					<div class="flex justify-end gap-4">
						<input
							type="button"
							class="btn btn-neutral"
							value="Voltar"
							on:click={() => {
								step = null;
								tmpQuality = $selectedImage.quality;
								adjustQualityLabel();
							}}
						/>
						<input
							type="button"
							class="btn btn-primary"
							value="Confirmar qualidade"
							on:click={() => {
								$selectedImage.quality = tmpQuality;
								$selectedImage.modified = true;
								$selectedImage.metaCompleteness.quality = true;
								recalcMetaCompleteness($selectedImage);
								step = null;
							}}
						/>
					</div>
				{:else if step === steps.stops}
					<div class="flex flex-wrap sm:flex-nowrap gap-2">
						<StopPicker
							image={selectedImage}
							on:selectStop={(e) => {
								stopInput.value = e.detail;
							}}
						/>
						<div class="form-control">
							<label class="label">
								<span class="label-text">Paragens</span>
							</label>
							<div class="flex flex-col">
								<div class="flex">
									<input
										type="number"
										disabled
										class="input input-bordered"
										id="stop-id"
										placeholder="Escolha no mapa"
										bind:this={stopInput}
									/>
									<input class="btn" type="button" value="Add" on:click={addStop} />
								</div>
								{#each tmpStops as stopId}
									<div class="badge badge-outline badge-lg">
										{stopId} - {$stops[stopId].short_name || $stops[stopId].name}
										<div
											class="btn btn-error btn-circle btn-xs"
											on:click={() => removeStop(stopId)}
										>
											✕
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
					<div class="flex justify-end gap-4">
						<input
							type="button"
							class="btn btn-neutral"
							value="Voltar"
							on:click={() => {
								tmpStops = [...$selectedImage.stops];
								step = null;
							}}
						/>
						<input
							type="button"
							class="btn btn-primary"
							value="Confirmar paragens"
							on:click={() => {
								$selectedImage.stops = tmpStops;
								$selectedImage.modified = true;
								recalcMetaCompleteness($selectedImage);
								step = null;
							}}
						/>
					</div>
				{:else if step === steps.notes}
					<div class="form-control">
						<label class="label">
							<span class="label-text">Notas</span>
						</label>
						<textarea
							class="textarea textarea-bordered h-12"
							placeholder="Exemplo: Atrás da paragem encontra-se um gambuzino."
							bind:value={tmpNotes}
						/>
					</div>
					<div class="flex justify-end gap-4">
						<input
							type="button"
							class="btn btn-neutral"
							value="Voltar"
							on:click={() => {
								tmpNotes = $selectedImage.notes;
								step = null;
							}}
						/>
						<input
							type="button"
							class="btn btn-primary"
							value="Gravar nota"
							on:click={() => {
								$selectedImage.notes = tmpNotes?.trim() === '' ? null : tmpNotes;
								$selectedImage.modified = true;
								recalcMetaCompleteness($selectedImage);
								step = null;
							}}
						/>
					</div>
				{:else}
					<div class="flex justify-center gap-2 mt-2 flex-wrap">
						<input
							type="button"
							class="btn btn-success"
							class:btn-success={$selectedImage.metaCompleteness.position}
							class:btn-error={!$selectedImage.metaCompleteness.position}
							value="Posição"
							on:click={() => (step = steps.position)}
						/>
						<input
							type="button"
							class="btn"
							class:btn-success={$selectedImage.metaCompleteness.stops}
							class:btn-error={!$selectedImage.metaCompleteness.stops}
							value="Paragens"
							on:click={() => (step = steps.stops)}
						/>
						<input
							type="button"
							class="btn"
							class:btn-success={$selectedImage.metaCompleteness.visibility}
							class:btn-error={!$selectedImage.metaCompleteness.visibility}
							value="Visibilidade"
							on:click={() => (step = steps.visibility)}
						/>
						<input
							type="button"
							class="btn btn-success"
							class:btn-success={$selectedImage.metaCompleteness.quality}
							class:btn-error={!$selectedImage.metaCompleteness.quality}
							value="Qualidade"
							on:click={() => (step = steps.quality)}
						/>
						<input
							type="button"
							class="btn btn-success"
							value="Notas"
							on:click={() => (step = steps.notes)}
						/>
						<span class="grow" />
						<input
							class="btn btn-error border-black border-2"
							on:click={deleteImage}
							value="Apagar"
						/>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>

<div class="modal" class:modal-open={sendingPictures}>
	<div class="modal-box w-11/12 max-w-3xl">
		<div class="card card-compact self-center">
			<div class="card-body">
				<div class="flex justify-between">
					<h2 class="card-title">Enviar imagens</h2>
					<span
						class="link link-error"
						on:click={() => {
							resetUploader();
							sendingPictures = false;
						}}>Voltar</span
					>
				</div>
				{#if uploading}
					<span>Envio em progresso</span><br />
					<div class="font-bold">A enviar {uploadCount} de {files.length}</div>
				{:else}
					<div class="flex flex-col gap-1">
						{#if files && files[0]}
							<h3 class="text-md">
								{#if files.length > 1}
									Fotografias escolhidas
								{:else}
									Fotografia escolhida
								{/if}
							</h3>
							{#each files as file, i}
								<div class="flex flex-row justify-between items-center">
									<div class="font-bold">{file.name}</div>
								</div>
							{/each}
						{:else}
							<div class="text-base-content text-bold opacity-50 p-2">
								Escolha a fotografia que quer enviar
							</div>
						{/if}
					</div>
					{#if uploadDone && uploadCount > 0}
						<div class="btn float-right mt-3 btn-secondary" on:click={resetUploader}>
							Enviar mais imagens
						</div>
						<div
							class="btn float-right mt-3 btn-neutral"
							on:click={() => {
								resetUploader();
								sendingPictures = false;
							}}
						>
							Voltar
						</div>
					{:else}
						<div class="flex flex-wrap gap-2">
							<label for="dropzone-file" class="grow mt-3 btn btn-primary">
								{#if files && files[0]}
									📷 Alterar fotografia
								{:else}
									📷 Tirar fotografia
								{/if}
								<input
									bind:files
									multiple
									capture="environment"
									accept="image/*"
									id="dropzone-file"
									type="file"
									class="hidden"
								/>
							</label>
							<label for="dropzone-file-2" class="grow mt-3 btn btn-primary">
								📁 Escolher da galeria
								<input
									bind:files
									multiple
									accept="image/*"
									id="dropzone-file-2"
									type="file"
									class="hidden"
								/>
							</label>
						</div>
						<div
							class="btn float-right mt-3 btn-secondary {files && files[0] ? '' : 'btn-disabled'}"
							on:click={upload}
						>
							Submeter
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div>
