<script>
    export let picture;
</script>

<a target="_blank" rel="noreferrer" href={picture.url_full}>
	<img src={picture.url_medium} alt="Fotografia da paragem" class="rounded-box w-full" />
</a>

<div class="flex justify-between">
	<span class="text-lg">#{picture.id}</span>
	<span class="text-xs">{picture.sha1}</span>
</div>

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

<hr />
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
        {picture.upload_date ? picture.upload_date.split(' ')[0] : '?'}
    </span>
</span>

{#if picture.tagged}
	<span class="btn btn-xs w-40 bg-success" class:btn-error={picture.sensitive}>
		{#if picture.sensitive}Sensitive{:else}Not sensitive{/if}
	</span>
	<span class="btn btn-xs w-40 bg-success" class:btn-error={!picture.public}>
		{#if picture.public}Can be public{:else}Private{/if}
	</span>
{:else}
	Untagged
{/if}

<textarea class="w-full">{JSON.stringify(picture, null, 2)}</textarea>