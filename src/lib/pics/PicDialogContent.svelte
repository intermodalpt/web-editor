<script>
	import { createEventDispatcher } from 'svelte';

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
			<button
				class="btn shadow-md"
				on:click={() => dispatch('expand')}
				on:keypress={() => dispatch('expand')}
			>
				<!-- Font Awesome Free 6.4.0 https://fontawesome.com/license/free (Free License). -->
				<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
					<path
						d="M344 0H488c13.3 0 24 10.7 24 24V168c0 9.7-5.8 18.5-14.8 22.2s-19.3
                        1.7-26.2-5.2l-39-39-87 87c-9.4 9.4-24.6 9.4-33.9 0l-32-32c-9.4-9.4-9.4-24.6
                        0-33.9l87-87L327 41c-6.9-6.9-8.9-17.2-5.2-26.2S334.3 0 344 0zM168 512H24c-13.3
                        0-24-10.7-24-24V344c0-9.7 5.8-18.5 14.8-22.2s19.3-1.7 26.2 5.2l39 39 87-87c9.4-9.4
                        24.6-9.4 33.9 0l32 32c9.4 9.4 9.4 24.6 0 33.9l-87 87 39 39c6.9 6.9 8.9 17.2 5.2
                        26.2s-12.5 14.8-22.2 14.8z"
					/>
				</svg>
			</button>
			<button
				class="btn shadow-md"
				on:click={() => dispatch('edit', { id: picture.id })}
				on:keypress={() => dispatch('edit', { id: picture.id })}
			>
				<!-- Font Awesome Free 6.4.0 https://fontawesome.com/license/free (Free License). -->
				<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
					<path
						d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4
                        10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2
                        27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4
                        452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2
                        325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5
                        0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4
                        0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"
					/></svg
				>
			</button>
		</div>
		<div target="_blank" class="absolute bottom-0 left-0 bg-base-100 rounded-tr-lg py-1 px-2">
			<span class="flex gap-3">
				<span class="flex gap-1">
					<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
						<!-- Font Awesome Free 6.4.0 https://fontawesome.com/license/free (Free License). -->
						<path
							d="M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7
                    64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39
                    13.2-45.5 32.8zM256 192a96 96 0 1 1 0 192 96 96 0).toISOString().split('T')[0] 1 1 0-192z"
						/>
					</svg>
					{picture.capture_date ? picture.capture_date.split(' ')[0] : '?'}
				</span>
				<span class="flex gap-1">
					<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
						<!-- Font Awesome Free 6.4.0 https://fontawesome.com/license/free (Free License). -->
						<path
							d="M288 109.3V352c0 17.7-14.3 32-32 32s-32-14.3-32-32V109.3l-73.4 73.4c-12.5 12.5-32.8 12.5-45.3
                0s-12.5-32.8 0-45.3l128-128c12.5-12.5 32.8-12.5 45.3 0l128 128c12.5 12.5 12.5 32.8 0 45.3s-32.8
                12.5-45.3 0L288 109.3zM64 352H192c0 35.3 28.7 64 64 64s64-28.7 64-64H448c35.3 0 64 28.7 64 64v32c0
                35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V416c0-35.3 28.7-64 64-64zM432 456a24 24 0 1 0 0-48 24
                24 0 1 0 0 48z"
						/>
					</svg>
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
			<span class="flex gap-1">
				<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 640 512">
					<!-- Font Awesome Free 6.4.0 https://fontawesome.com/license/free (Free License). -->
					<path
						d="M32 64c17.7 0 32 14.3 32 32l0 320c0 17.7-14.3 32-32 32s-32-14.3-32-32V96C0 78.3 14.3 64 32 
                64zm214.6 73.4c12.5 12.5 12.5 32.8 0 45.3L205.3 224l229.5 0-41.4-41.4c-12.5-12.5-12.5-32.8 
                0-45.3s32.8-12.5 45.3 0l96 96c12.5 12.5 12.5 32.8 0 45.3l-96 96c-12.5 12.5-32.8 12.5-45.3 
                0s-12.5-32.8 0-45.3L434.7 288l-229.5 0 41.4 41.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 
                0l-96-96c-12.5-12.5-12.5-32.8 0-45.3l96-96c12.5-12.5 32.8-12.5 45.3 0zM640 96V416c0 17.7-14.3 
                32-32 32s-32-14.3-32-32V96c0-17.7 14.3-32 32-32s32 14.3 32 32z"
					/>
				</svg>
				{picture.width} px
			</span>
			<span class="flex gap-1">
				<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 320 512">
					<!-- Font Awesome Free 6.4.0 https://fontawesome.com/license/free (Free License). -->
					<path
						d="M182.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-96 96c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 
            0L128 109.3V402.7L86.6 361.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l96 96c12.5 12.5 32.8
            12.5 45.3 0l96-96c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 402.7V109.3l41.4 41.4c12.5 
            12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-96-96z"
					/>
				</svg>
				{picture.height} px
			</span>
		</div>
	</div>
</div>
