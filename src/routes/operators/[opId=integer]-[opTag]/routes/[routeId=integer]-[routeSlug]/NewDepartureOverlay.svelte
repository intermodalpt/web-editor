<script>
	import { createEventDispatcher } from 'svelte';
	import { writable, derived } from 'svelte/store';
	import { apiServer } from '$lib/settings';
	import { isAuthenticated, uid } from '$lib/stores';
	import { isAdmin } from '$lib/permissions';
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

			let req = $isAuthenticated
				? fetch(`${apiServer}/v1/stops/${$stop.id}/pictures/all`, { credentials: 'include' })
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
						const fixable = !total && (pic.uploader === $uid || isAdmin($permissions));

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
</script>

<div
	class="fixed top-0 bottom-0 left-0 right-0 z-20 grid grid-cols-1 gap-1 bg-base-300 grid-rows-[auto_1fr]"
>
	<div class="flex justify-between bg-base-100 p-1 shadow-sm">
		<span class="px-2 font-semibold text-lg">{$stop?.name}</span>
		<div class="flex gap-3">
			<button class="btn btn-secondary btn-sm" on:click={() => (sendingPictures = true)}
				>Enviar</button
			>
			<button class="btn btn-error btn-sm" on:click={closeEditor}>Fechar</button>
		</div>
	</div>
</div>

<div class="modal" class:modal-open={sendingPictures}>
	<div class="modal-box w-11/12 max-w-3xl">
		<div class="card card-compact self-center">
			<div class="card-body">
				<div class="flex justify-between">
					<h2 class="card-title">Enviar imagens</h2>
					<button class="link link-error" on:click={() => (sendingPictures = false)}>Voltar</button>
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
								<button class="btn btn-success" on:mouseup={addAdditionalTime}>+</button>
							</label>
						</div>

						<div class="flex flex-wrap gap-2">
							{#each additionalNewTimes as time}
								<div class="badge badge-info gap-2">
									{time}
									<button on:click={() => removeAdditionalTime(time)}>
										<Icon name="close" class="inline-block  h-4 w-4 stroke-current" />
									</button>
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
