<script>
	import { createEventDispatcher } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	export let picture;

	const dispatch = createEventDispatcher();
</script>

<div class="flex flex-col">
	<div class="self-center relative">
		<a target="_blank" rel="noreferrer" href={picture.url_full}>
			<img src={picture.url_medium} alt="Fotografia da paragem" class="rounded-box" />
		</a>
		<span class="absolute top-0 left-0 btn btn-info btn-sm rounded-tr-none rounded-bl-none">
			#{picture.id}
		</span>
		<div class="absolute bottom-2 right-2 flex gap-3">
			<button class="btn shadow-md" on:click={() => dispatch('expand')}>
				<Icon name="arrows-outwards" class="fill-black h-4" />
			</button>
			<button class="btn shadow-md" on:click={() => dispatch('edit', { id: picture.id })}>
				<Icon name="pencil" class="fill-black h-4" />
			</button>
		</div>
		<div target="_blank" class="absolute bottom-0 left-0 bg-base-100 rounded-tr-lg py-1 px-2">
			<span class="flex gap-3">
				<span class="flex gap-1 items-center">
					<Icon name="camera" class="fill-black h-4" />
					{picture.capture_date ? picture.capture_date.split(' ')[0] : '?'}
				</span>
				<span class="flex gap-1 items-center">
					<Icon name="upload" class="fill-black h-4" />
					{picture.upload_date ? picture.upload_date.split('.')[0] : '?'}
				</span>
			</span>
		</div>
	</div>

	<div class="flex justify-between py-1">
		{#if picture.tagged}
			<div class="flex gap-2">
				<span class="btn btn-xs w-40 btn-success" class:btn-error={picture.sensitive}>
					{#if picture.sensitive}Sensitive{:else}Not sensitive{/if}
				</span>
				<span class="btn btn-xs w-40 btn-success" class:btn-error={!picture.public}>
					{#if picture.public}Can be public{:else}Private{/if}
				</span>
			</div>
		{:else}
			<span>Untagged</span>
		{/if}
		<div class="flex gap-3">
			<span class="flex gap-1 items-center">
				<Icon name="width" class="fill-black h-4" />
				{picture.width} px
			</span>
			<span class="flex gap-1 items-center">
				<Icon name="height" class="fill-black h-4" />
				{picture.height} px
			</span>
		</div>
	</div>
</div>
