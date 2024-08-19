<script>
	import { onDestroy, onMount } from 'svelte';
	import Editor from '$lib/content/editor/map/Editor.svelte';
	import { isValidGeoJson } from './utils';
	import { isMapContentValid } from './map/utils';
	import { toast } from '$lib/stores';
	import { error } from '@sveltejs/kit';

	export let data;
	export let canEdit = false;

	let editor;

	const tabs = {
		map: 1,
		data: 2
	};
	let tab = tabs.map;

	function handleMapLoad() {
		if (data != null && data != undefined && Object.keys(data).length > 0) {
			if (isMapContentValid(data)) {
				editor.setMapData(data);
			} else {
				console.error('Invalid data', data);
				toast.add('Dados invalido no mapa', 'error');
				error(0, 'Invalid map data');
			}
		}
	}

	function handleDataChange() {
		data = editor.getContent();
	}
</script>

<div role="tablist" class="tabs tabs-boxed pr-32">
	<button
		role="tab"
		class="tab"
		class:tab-active={tab == tabs.map}
		on:click={() => (tab = tabs.map)}>Mapa</button
	>
	<button
		role="tab"
		class="tab"
		class:tab-active={tab == tabs.data}
		on:click={() => (tab = tabs.data)}>Dados</button
	>
	<!-- <button
		role="tab"
		class="tab"
		class:tab-active={tab == tabs.hybrid}
		on:click={() => (tab = tabs.hybrid)}>Lado-a-Lado</button
	> -->
</div>
<div class="flex gap-1 h-[max(50dvh,400px)]">
	<Editor bind:this={editor} on:load={handleMapLoad} on:change={handleDataChange} {canEdit}>
		<div
			class="absolute top-0 left-0 right-0 bottom-0 bg-base-100 z-30"
			class:hidden={tab != tabs.data}
		>
			<textarea class="w-full h-full textarea textarea-bordered" disabled
				>{JSON.stringify(data, null, 2)}</textarea
			>
		</div>
	</Editor>
</div>
