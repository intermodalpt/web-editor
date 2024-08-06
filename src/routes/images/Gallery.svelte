<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { getLatestStopPics } from '$lib/api';
	import { toast } from '$lib/stores';
	import Paginator from '$lib/components/Paginator.svelte';

	const dispatch = createEventDispatcher();
	const PAGE_SIZE = 20;

	type Filters = {
		taggedOnly?: boolean;
		untaggedOnly?: boolean;
	};
	export let galeryFilter: Filters = { untaggedOnly: false };
	export let loadFn = async (page, onSuccess, onError) => {
		await getLatestStopPics(page, galeryFilter, { onSuccess, onError, toJson: true });
	};

	let loaded = false;
	let pictures = [];
	let totalPictures = 0;
	let page = 0;

	function onPageLoadSuccess(pics) {
		pictures = pics.items;
		totalPictures = pics.total;
		loaded = true;
	}

	function onPageLoadError() {
		toast('Incapaz de obter fotografias', 'error');
		pictures = [];
	}

	$: {
		loadFn(page, onPageLoadSuccess, onPageLoadError);
	}

	export async function refresh() {
		loadFn(page, onPageLoadSuccess, onPageLoadError)
	}
</script>

{#if loaded && pictures.length === 0}
	<div class="flex justify-center h-64">
		<span class="text-xl p-4 self-center"><slot name="no-results" /></span>
	</div>
{:else if loaded}
	<div class="h-full overflow-y-auto p-2 grid grid-cols-1" style="grid-template-rows: auto 1fr;">
		<div class="overflow-y-auto grow">
			<div
				class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 overflow-x-hidden"
			>
				{#each pictures as pic (pic.id)}
					<button
						class="flex justify-center items-center cursor-pointer max-h-72 overflow-y-hidden hover:overflow-y-visible"
						on:click={() => dispatch('imageclick', { id: pic.id })}
					>
						<img
							src={pic.url_medium}
							class="rounded-box transition-all hover:scale-105"
							alt="Fotografia do registo"
						/>
					</button>
				{/each}
			</div>
		</div>
		<div class="mt-2">
			<Paginator
				bind:page
				pageSize={PAGE_SIZE}
				itemCount={totalPictures}
				on:goto={(e) => {
					page = e.detail.page;
				}}
			/>
		</div>
	</div>
{/if}
