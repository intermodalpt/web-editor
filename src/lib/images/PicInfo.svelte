<script>
	import { createEventDispatcher } from 'svelte';
	import { derived } from 'svelte/store';
	import { token } from '$lib/stores';
	import { apiServer } from '$lib/settings';

	const dispatch = createEventDispatcher();

	export let stops;
	export let picId;

	const data = derived(picId, ($picId, set) => {
		if (!$picId) {
			return;
		}

		fetch(`${apiServer}/v1/stop_pics/${$picId}`, {
			headers: {
				authorization: `Bearer ${$token}`
			}
		})
			.then((r) => r.json())
			.then((r) => {
				set(r);
			});
	});

	const picStops = derived(data, ($data) => {
		if (!$data) {
			return [];
		}

		return $data.stops.map((stopId) => $stops[stopId]);
	});
</script>

{#if $data}
	<span class="card-title">Imagem selecionada</span>
	<div class="flex flex-wrap gap-4">
		<a href={$data.url_full} class="link" target="_blank">
			<img src={$data.url_medium} alt="Fotografia selecionada" class="w-full max-h-96" />
		</a>

		<div class="flex flex-col gap-2 grow">
			<span class="flex gap-4">
				<span class="text-xl">#{$data.id}</span>
				<span>
					<span class="text-lg font-bold">{$data.quality / 10}</span>
					<span class="text-xs">/10</span>
					<span class="text-lg">⭐</span>
				</span>
				<button
					class="btn btn-xs btn-primary"
					disabled={!$token}
					on:click={() => {
						dispatch('edit-pic', { id: $data.id });
					}}>Editar</button
				>
			</span>
			<div class="flex gap-2">
				<div class="flex">
					<input
						class="btn btn-neutral btn-xs rounded-r-none"
						type="button"
						value={$data?.lat.toFixed(6)}
						on:click={() => {
							navigator.clipboard.writeText($data?.lat.toFixed(6));
						}}
					/>
					<input
						class="btn btn-neutral btn-xs rounded-l-none"
						type="button"
						value={$data?.lon.toFixed(6)}
						on:click={() => {
							navigator.clipboard.writeText($data?.lon.toFixed(6));
						}}
					/>
				</div>
				<input
					class="btn btn-secondary btn-xs"
					type="button"
					value="Copiar"
					on:click={() => {
						navigator.clipboard.writeText($data?.lat.toFixed(6) + '\t' + $data?.lon.toFixed(6));
					}}
				/>
			</div>
			<div class="flex flex-col">
				<span class="label-text">Paragens</span>
				<div class="flex flex-col gap-1 ml-2">
					{#each $picStops as stop}
						<span
							class="badge badge-md badge-secondary cursor-pointer whitespace-nowrap"
							on:click={() => {
								dispatch('select-stop', { id: stop?.id });
							}}
						>
							{stop?.id}:
							{stop?.short_name || stop?.name || stop?.official_name || stop?.osm_name}
						</span>
					{/each}
				</div>
			</div>
			<div class="flex flex-col">
				<span class="label-text">Captura (dispositivo)</span>
				<span class="ml-2"
					>{$data.capture_date
						? new Date($data.capture_date.split('.')[0]).toLocaleString('pt')
						: '?'} ({$data.camera_ref || '?'})</span
				>
				<span class="label-text">Envio</span>
				<span class="ml-2">{new Date($data.upload_date.split('.')[0]).toLocaleString('pt')}</span>
			</div>
			<div class="flex flex-col">
				<span class="label-text">Classificação</span>
				<div class="flex gap-1 ml-2">
					{#if $data.tagged}
						<span class="badge badge-md badge-success" class:badge-error={!$data.public}>
							{#if $data.public}Pública{:else}Privada{/if}
						</span>
						<span class="badge badge-md badge-success" class:badge-error={$data.sensitive}>
							{#if $data.sensitive}Sensivel{:else}Não sensivel{/if}
						</span>
					{:else}
						<span class="badge badge-md badge-error"> Untagged </span>
					{/if}
				</div>
			</div>
			{#if $data.notes}
				<div class="flex flex-col">
					<span class="label-text">Notas:</span>
					<textarea class="input input-bordered">{$data.notes}</textarea>
				</div>
			{/if}
			<div class="flex flex-col">
				<span class="label-text">Nome original</span>
				<span class="ml-2">{$data.original_filename}</span>
			</div>
			<div class="flex flex-col">
				<span class="label-text">Formato</span>
				<span class="ml-2">
					{$data.width} x {$data.height} ({Math.round(
						($data.width * $data.height * 10) / 1_000_000
					) / 10} MPix)
				</span>
			</div>
			<div class="flex flex-col">
				<span class="label-text">SHA-1</span>
				<span class="text-xs ml-2">{$data.sha1}</span>
			</div>
		</div>
	</div>
{/if}
