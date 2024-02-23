<script>
	import { createEventDispatcher } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { apiServer } from '$lib/settings.js';
	import { token, decodedToken } from '$lib/stores.js';
	import PicMetaEditor from '$lib/pics/PicMetaEditor.svelte';
	import PicUploader from '$lib/pics/PicUploader.svelte';

	const POSITION_REQUIRED = false;

	export let stops;

	export let stop;

	const dispatch = createEventDispatcher();

	let sendingPictures = false;
	let selectedImageId = null;

	let currentImageHasChanges = false;

	const stopPicturesNonce = writable(Date.now());
	const editedStopPictures = derived(
		[stop, stopPicturesNonce],
		([$stop, $stopPicturesNonce], set) => {
			if (!$stop) {
				return [];
			}

			let req = $decodedToken
				? fetch(`${apiServer}/v1/stops/${$stop.id}/pictures/all`, {
						headers: { authorization: `Bearer ${$token}` }
				  })
				: fetch(`${apiServer}/v1/stops/${$stop.id}/pictures`);

			req
				.then((r) => r.json())
				.then((pictureList) => {
					pictureList = pictureList.map((pic) => {
						const position = !(pic.lon == null || pic.lat == null);
						const visibility = pic.tagged;
						const quality = pic.tagged;
						const stops = pic.stops != null && pic.stops.length > 0;
						const total = !(POSITION_REQUIRED && !position) && visibility && quality && stops;
						const fixable =
							!total &&
							(pic.uploader === $decodedToken?.permissions?.uid ||
								$decodedToken?.permissions?.is_admin);

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
					if (selectedImageId && pictureList.find((pic) => pic.id === selectedImageId) == null) {
						selectedImageId = null;
						currentImageHasChanges = false;
					}
					set(pictureList);
				});
		}
	);

	function closeEditor() {
		if ($editedStopPictures?.some((pic) => pic.modified)) {
			if (!confirm('Tem alterações pendentes. Se sair, estas poderão ser perdidas.')) {
				return;
			}
		}
		dispatch('close');
	}

	function gotoPicture(picture) {
		if (currentImageHasChanges) {
			if (!confirm('Descartar alterações à imagem atual?')) {
				return;
			}
		}

		currentImageHasChanges = false;
		selectedImageId = picture.id;
	}
</script>

<div
	class="fixed top-0 bottom-0 left-0 right-0 z-20 grid grid-cols-1 gap-1 bg-base-300 grid-rows-[auto_1fr]"
>
	<div class="flex justify-between bg-base-100 p-1 shadow-sm">
		<span class="px-2 font-semibold text-lg">{$stop?.name || $stop?.osm_name}</span>
		<div class="flex gap-3">
			<input
				type="button"
				class="btn btn-secondary btn-sm"
				value="Enviar"
				on:click={() => (sendingPictures = true)}
			/>
			<input type="button" class="btn btn-error btn-sm" value="Fechar" on:click={closeEditor} />
		</div>
	</div>
	<div
		class="p-2 grid gap-2 bg-base-300 grid-rows-[auto_1fr] md:grid-cols-[auto_1fr] overflow-y-scroll"
	>
		
</div>

<div class="modal" class:modal-open={sendingPictures}>
	<div class="modal-box w-11/12 max-w-3xl">
		<div class="card card-compact self-center">
			<div class="card-body">
				<div class="flex justify-between">
					<h2 class="card-title">Enviar imagens</h2>
					<span
						class="link link-error"
						on:click={() => (sendingPictures = false)}
						on:keypress={() => (sendingPictures = false)}>Voltar</span
					>
				</div>
				<PicUploader
					stopId={$stop?.id}
					on:new-pic={() => ($stopPicturesNonce = Date.now())}
					on:upload-end={() => {
						dispatch('upload');
					}}
				/>
			</div>
		</div>
	</div>
</div>

{#if data.calendars && subroute && canEditSchedules}
<div class="modal" class:modal-open={sendingPictures}>
	<div class="modal-box w-11/12 max-w-3xl">
		<div class="card card-compact self-center">
			<div class="card-body">
				<h2 class="card-title">Nova partida em {subroute.flag}</h2>
				<div class="flex flex-col gap-4 text-lg">
					<div class="form-control">
						<label class="input-group">
							<span>Início</span>
							<input
								type="time"
								class="input input-bordered"
								bind:this={newTimeInput}
								bind:value={newTime}
							/>
							<input
								type="button"
								class="btn btn-success"
								value="+"
								on:mouseup={addAdditionalTime}
							/>
						</label>
					</div>

					<div class="flex flex-wrap gap-2">
						{#each additionalNewTimes as time}
							<div class="badge badge-info gap-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									class="inline-block w-4 h-4 stroke-current"
									on:mouseup={() => removeAdditionalTime(time)}
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
								{time}
							</div>
						{/each}
					</div>
					Em
					<select class="select select-bordered w-fit" bind:value={newCalendarId}>
						{#each Object.values(data.calendars) as calendar}
							<option value={calendar.id}>{calendar.name}</option>
						{/each}
					</select>
				</div>
				<div class="card-actions justify-end">
					<label>
						Limpar ao adicionar
						<input type="checkbox" bind:checked={cleanOnAdd} />
					</label>

					<button class="btn btn-primary" on:mouseup={createDeparture}>Adicionar</button>
				</div>
			</div>
		</div>
	</div>
</div>
{/if}