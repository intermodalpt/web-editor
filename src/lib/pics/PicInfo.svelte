<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { derived } from 'svelte/store';
	import { apiServer } from '$lib/settings';
	import { toast } from '$lib/stores';
	import { getStopList, getStopPic } from '$lib/api';
	import CoordViewer from '$lib/components/CoordViewer.svelte';

	const dispatch = createEventDispatcher();

	export let picId;

	let pic;
	let stops;

	onMount(async () => {
		pic = await getStopPic(picId, {
			onSuccess: async (pic) => {
				console.log(pic.stops);
				stops = await getStopList(
					pic.stops.map((rel) => rel.id),
					{
						onError: () => {
							toast('Erro ao carregar paragens da fotografia', 'error');
						},
						toJson: true
					}
				);
			},
			onError: () => {
				toast('Erro ao carregar fotografia', 'error');
			},
			toJson: true
		});
	});
</script>

{#if pic}
	<div class="flex flex-wrap gap-4">
		<a href={pic.url_full} class="link" target="_blank">
			<img src={pic.url_medium} alt="Fotografia selecionada" class="w-full max-h-96" />
		</a>
		<div class="flex flex-row flex-wrap gap-4">
			<div class="flex flex-col gap-2">
				<span class="flex gap-4">
					<span class="text-xl">#{picId}</span>
					<span>
						<span class="text-lg font-bold">{pic.quality / 10}</span>
						<span class="text-xs">/10</span>
						<span class="text-lg">⭐</span>
					</span>
					<button
						class="btn btn-xs btn-primary"
						on:click={() => {
							dispatch('edit-pic', { id: picId });
						}}>Editar</button
					>
				</span>
				<CoordViewer lat={pic?.lat} lon={pic?.lon} />
				<div class="flex flex-col">
					<span class="label-text">Paragens nesta imagem</span>
					<div class="flex flex-col gap-1 ml-2">
						{#each stops || [] as stop}
							<button
								class="badge badge-md badge-secondary cursor-pointer whitespace-nowrap"
								on:click={() => {
									dispatch('select-stop', { id: stop?.id });
								}}>{stop?.id}: {stop?.short_name || stop?.name}</button
							>
						{/each}
					</div>
				</div>
			</div>
			<div class="flex flex-col gap-2">
				<div class="flex flex-col">
					<span class="label-text">Captura (dispositivo)</span>
					<span class="ml-2"
						>{pic.capture_date
							? new Date(pic.capture_date.split('.')[0]).toLocaleString('pt')
							: '?'} ({pic.camera_ref || '?'})</span
					>
					<span class="label-text">Envio</span>
					<span class="ml-2">{new Date(pic.upload_date.split('.')[0]).toLocaleString('pt')}</span>
				</div>
				<div class="flex flex-col">
					<span class="label-text">Classificação</span>
					<div class="flex gap-1 ml-2">
						{#if pic.tagged}
							<span class="badge badge-md badge-success" class:badge-error={!pic.public}>
								{#if pic.public}Pública{:else}Privada{/if}
							</span>
							<span class="badge badge-md badge-success" class:badge-error={pic.sensitive}>
								{#if pic.sensitive}Sensivel{:else}Não sensivel{/if}
							</span>
						{:else}
							<span class="badge badge-md badge-error"> Untagged </span>
						{/if}
					</div>
				</div>
				{#if pic.notes}
					<div class="flex flex-col">
						<span class="label-text">Notas:</span>
						<textarea class="input input-bordered">{pic.notes}</textarea>
					</div>
				{/if}
				<div class="flex flex-col">
					<span class="label-text">Nome original</span>
					<span class="ml-2">{pic.original_filename}</span>
				</div>
				<div class="flex flex-col">
					<span class="label-text">Formato</span>
					<span class="ml-2">
						{pic.width} x {pic.height} ({Math.round((pic.width * pic.height * 10) / 1_000_000) / 10}
						MPix)
					</span>
				</div>
				<div class="flex flex-col">
					<span class="label-text">SHA-1</span>
					<span class="text-xs ml-2">{pic.sha1}</span>
				</div>
			</div>
		</div>
	</div>
{/if}
