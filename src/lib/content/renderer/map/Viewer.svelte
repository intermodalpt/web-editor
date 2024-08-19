<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { toast } from '$lib/stores';
	import { compileLayerFeatures } from './utils';
	import Map from './ViewerMap.svelte';

	const dispatch = createEventDispatcher();

	let map: Map;

	export let content: MapContent;

	export function getContent() {
		return structuredClone(content);
	}

	function onMapLoad() {
		loadData(content);
		dispatch('load');
	}

	export function loadData(content: MapContent) {
		let counter = 0;
		content.layers.forEach((layer) => {
			layer.id = ++counter + '';
			layer.visible = true;
			layer = layer;
			map.addLayer(layer.id, layer.spec, compileLayerFeatures(layer.features));
		});
		adjust();
	}

	function adjust() {
		if (content.bounding.length > 2) {
			map.fitToPoints(content.bounding);
		}
	}

	function handleExport() {
		const data = JSON.stringify(content);
		navigator.clipboard.writeText(data);
		toast('Conteúdo copiado', 'info');
	}
</script>

<Map bind:this={map} on:mapload={onMapLoad}>
	<div class="absolute left-2 top-2 z-10 flex gap-2">
		<button class="btn btn-xs btn-neutral" on:click={handleExport}
			>Exportar</button
		>
	</div>
	<div class="absolute left-2 bottom-2 z-10 flex gap-2">
		<button class="btn btn-secondary" on:click={adjust}>Ajustar</button>
	</div>
	<slot />
</Map>
