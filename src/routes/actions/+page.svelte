<script>
	import { api_server } from '$lib/settings.js';
	import { token, stops, routes, pictures } from '$lib/stores.js';

	/** @type {import('./$types').PageData} */
	export let data;

	let isDebug = false;
	let osmSyncing = false;
	let cacheRebuilding = false;

	let fromStopId = null;
	let toStopId = null;

	function osmSync() {
		osmSyncing = true;
		fetch(`${api_server}/v1/actions/import_osm`, {
			headers: {
				authorization: `Bearer ${$token}`
			}
		})
			.then((r) => r.json())
			.then((result) => {
				alert(JSON.stringify(result));
			})
			.catch((e) => alert(`Error occurred: ${e}`));
	}

	async function wipeCache() {
		alert('Função temporáriamente desactivada');
		// cacheRebuilding = true;
		// await new Promise((resolve) => setTimeout(resolve, 10));
		// refreshCache($token);
		// cacheRebuilding = false;
	}

	async function migrateStops() {
		if (!fromStopId || !toStopId) {
			alert('Por favor preencha os dois campos');
			return;
		}
		if (fromStopId === toStopId) {
			alert('Os dois campos não podem ser iguais');
			return;
		}

		if (!Number.isInteger(Number(fromStopId)) || !Number.isInteger(Number(toStopId))) {
			alert('Os ids de paragem devem ser números');
			return;
		}

		const response = await fetch(`${api_server}/v1/actions/migrate_stop/${fromStopId}/${toStopId}`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${$token}`,
				'Content-Type': 'application/json'
			}
		});
		if (result.error) {
			alert(result.error);
		} else {
			alert('Paragem migrada com sucesso');
		}
	}
</script>

<svelte:head>
	<title>TODO</title>
	<meta name="description" content="TODO" />
</svelte:head>

<div class="flex flex-col gap-2 w-full max-w-5xl mt-4 self-center">
	<button type="button" class="btn btn-info" on:click={osmSync} disabled={osmSyncing}>
		{#if osmSyncing}
			<svg
				class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				/>
			</svg>
		{/if}
		Sync with OSM
	</button>
	<button type="button" class="btn btn-info" on:click={wipeCache} disabled={cacheRebuilding}>
		{#if cacheRebuilding}
			<svg
				class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				/>
			</svg>
		{/if}
		Wipe cache
	</button>

	<div class="form-control">
		<label class="input-group">
		  <span>Migrar paragem</span>
		  <input type="text" placeholder="Id de paragem" class="input input-bordered" bind:value={fromStopId}/>
		  <span>para</span>
		  <input type="text" placeholder="Id de paragem" class="input input-bordered" bind:value={toStopId} />
		  <input type="button" class="btn btn-primary" value="Aplicar" on:click={migrateStops}>
		</label>
	  </div>

	<span class="justify-center text-center text-lg font-bold">Debug info</span>
	<input
		class="btn btn-error"
		type="button"
		on:click={() => {
			isDebug = true;
		}}
		value="Show debug info"
	/>
	{#if isDebug}
		<span class="justify-center text-center">$stops</span>
		<textarea>{JSON.stringify($stops)}</textarea>
		<span class="justify-center text-center">$routes</span>
		<textarea>{JSON.stringify($routes)}</textarea>
		<span class="justify-center text-center">$pictures</span>
		<textarea>{JSON.stringify($pictures)}</textarea>
		<!-- <span class="justify-center text-center">$picStopRels</span>
	  <textarea>{JSON.stringify($picStopRels)}</textarea>
	  <span class="justify-center text-center">$stopPicRels</span>
	  <textarea>{JSON.stringify($stopPicRels)}</textarea> -->
	{/if}
</div>

<style>
	.line-number {
		padding: 0.2em 10px;
		border-radius: 1em;
		font-weight: 900;
		font-size: 1.2rem;
		display: inline-block;
	}
</style>
