<script>
	import { onDestroy, onMount } from 'svelte';
	import { error } from '@sveltejs/kit';
	import Viewer from './map/Viewer.svelte';
	import { isMapContentValid } from './map/utils';
	import { toast } from '$lib/stores';

	export let data;

	let editor;


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

<div class="flex gap-1 h-[max(50dvh,400px)]">
	<Viewer bind:this={editor} content={data}/>
</div>
