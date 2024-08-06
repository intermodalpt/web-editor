<script lang="ts">
	import { writable } from 'svelte/store';
	import { isAuthenticated, permissions, toast } from '$lib/stores';
	import SinglePicMetaEditor from '$lib/pics/wrappers/SinglePicMetaEditor.svelte';
	import PicUploader from '$lib/pics/PicUploader.svelte';
	import PicMapViewer from './PicMapViewer.svelte';
	import StopPicsInfo from '$lib/pics/StopPicsInfo.svelte';
	import PicInfo from '$lib/pics/PicInfo.svelte';
	import { getUnpositionedStopPics } from '$lib/api';
	import Gallery from './Gallery.svelte';
	import Icon from '$lib/components/Icon.svelte';

	export let data;
	const stops = data.stops;
	const basePics = data.basePics;

	const stopIndex = Object.fromEntries(stops.map((stop) => [stop.id, stop]));

	const selectedStop = writable(null);
	const selectedPicId = writable(null);

	let taggedGallery;
	let untaggedGallery;
	let unpositionedGallery;

	let uploadDialog;

	const tabs = {
		map: 0,
		tagged: 1,
		untagged: 2,
		unpositioned: 3,
		upload: 4
	};

	const tab = writable(tabs.map);

	let openPicId = writable(null);

	function handleImageClick(e) {
		$openPicId = e.detail.id;
	}

	function closePicEditor() {
		$openPicId = null;
	}

	function selectPicHandler(e) {
		$selectedStop = null;
		$selectedPicId = e.detail.id;
	}

	function selectStopHandler(e) {
		$selectedPicId = null;
		$selectedStop = stopIndex[e.detail.id];
	}

	async function refreshGalleries() {
		switch ($tab) {
			case tabs.tagged:
				await taggedGallery.refresh();
				break;
			case tabs.untagged:
				await untaggedGallery.refresh();
				break;
			case tabs.unpositioned:
				await unpositionedGallery.refresh();
				break;
		}
	}

	async function handlePicSave() {
		await refreshGalleries();
		closePicEditor();
	}

	async function handlePicDelete() {
		await refreshGalleries();
		closePicEditor();
	}
</script>

<PicMapViewer
	pictures={basePics}
	stops={stopIndex}
	on:selectStop={selectStopHandler}
	on:selectPic={selectPicHandler}
>
	<div class="absolute top-1 left-2 z-20">
		<div
			class="tabs tabs-boxed border-2 border-base-200"
			class:border-slate-400={$tab == tabs.map}
			class:border-base-200={$tab != tabs.map}
		>
			<button class="tab" class:tab-active={$tab === tabs.map} on:click={() => ($tab = tabs.map)}
				>Mapa</button
			>
			<button
				class="tab"
				class:tab-active={$tab === tabs.tagged}
				on:click={() => ($tab = tabs.tagged)}>Etiquetadas</button
			>
			<button
				class="tab"
				class:tab-active={$tab === tabs.untagged}
				on:click={() => ($tab = tabs.untagged)}>Por etiquetar</button
			>
			{#if $isAuthenticated}
				<button
					class="tab"
					class:tab-active={$tab === tabs.unpositioned}
					on:click={() => ($tab = tabs.unpositioned)}>Por posicionar</button
				>
			{/if}
		</div>
	</div>

	<div
		class="absolute bottom-0 z-10 flex justify-center w-full transition duration-750"
		class:translate-y-[350px]={!($selectedStop || $selectedPicId)}
	>
		<div class="h-[350px] w-full bg-base-100 lg:w-[95%] lg:rounded-t-xl shadow-md relative">
			<button
				class="btn btn-sm btn-circle btn-error absolute right-2 top-2 z-20"
				on:click={() => {
					$selectedStop = null;
					$selectedPicId = null;
				}}
			>
				<Icon name="close" class="h-4 stroke-current" />
			</button>
			<div class="py-2 px-2 lg:px-4 overflow-y-auto">
				{#if $selectedPicId}
					{#key $selectedPicId}
						<PicInfo
							picId={$selectedPicId}
							on:edit-pic={handleImageClick}
							on:select-stop={(e) => {
								selectStopHandler(e);
								// TODO center
							}}
						/>
					{/key}
				{/if}
				{#if $selectedStop}
					<StopPicsInfo
						stop={$selectedStop}
						on:select-pic={selectPicHandler}
						on:select-stop={selectStopHandler}
					/>
				{/if}
			</div>
		</div>
	</div>

	<button
		class="btn btn-primary absolute bottom-4 left-4 z-30 lg:btn-lg"
		class:hidden={$tab != tabs.map || $selectedStop || $selectedPicId}
		on:click={() => uploadDialog.show()}>Enviar</button
	>

	<div
		class="absolute top-0 bottom-0 left-0 right-0 z-10 bg-base-200"
		class:hidden={$tab == tabs.map}
	>
		<div
			class="absolute top-12 left-2 right-2 bottom-2 lg:left-4 lg:right-4 lg:bottom-4 bg-base-100 rounded-lg shadow-sm"
		>
			{#if $tab === tabs.tagged}
				<Gallery
					bind:this={taggedGallery}
					on:imageclick={handleImageClick}
					galeryFilter={{ taggedOnly: true }}
				>
					<span slot="no-results">Sem imagens etiquetadas</span>
				</Gallery>
			{:else if $tab === tabs.untagged}
				<Gallery
					bind:this={untaggedGallery}
					on:imageclick={handleImageClick}
					galeryFilter={{ untaggedOnly: false }}
				>
					<span slot="no-results">Sem imagens por etiquetar</span>
				</Gallery>
			{:else if $tab === tabs.unpositioned}
				<Gallery
					bind:this={unpositionedGallery}
					on:imageclick={handleImageClick}
					loadFn={async (page, onSuccess, onError) => {
						await getUnpositionedStopPics(page, { onSuccess, onError, toJson: true });
					}}
				>
					<span slot="no-results">Sem imagens por posicionar</span>
				</Gallery>
			{/if}
		</div>
	</div>
</PicMapViewer>

{#if $openPicId}
	<SinglePicMetaEditor
		selectedPicId={$openPicId}
		on:save={handlePicSave}
		on:delete={handlePicDelete}
		on:close={closePicEditor}
	/>
{/if}

<dialog bind:this={uploadDialog} class="modal">
	<div class="modal-box !max-w-[50em]">
		<h2 class="card-title">Enviar imagens</h2>
		{#if $permissions?.stopPics?.upload || $permissions?.stopPics?.contribUpload}
			<PicUploader />
		{:else if $isAuthenticated}
			<p class="text-lg">Não tem as permissões necessárias para enviar imagens.</p>
		{:else}
			<p class="text-lg">Precisa de estar autenticado para enviar imagens.</p>
		{/if}
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
