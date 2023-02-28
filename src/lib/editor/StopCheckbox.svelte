<script>
	import { onMount } from 'svelte';

	export let text = 'Missing label';
	export let description = 'Missing description';
	export let state;
	export let disabled = false;

	let box;

	onMount(() => {
		state.subscribe(() => {
			matchState();
		});
		matchState();
	});

	function matchState() {
		if (box) {
			if ($state === null) {
				box.indeterminate = true;
				box.checked = false;
			} else if ($state) {
				box.indeterminate = false;
				box.checked = true;
			} else {
				box.indeterminate = false;
				box.checked = false;
			}
		}
	}

	function rotateState() {
		if ($state === null) {
			box.indeterminate = false;
			box.checked = true;
			$state = true;
		} else if ($state) {
			box.indeterminate = false;
			box.checked = false;
			$state = false;
		} else {
			box.indeterminate = true;
			box.checked = false;
			$state = null;
		}
	}
</script>

<div class="form-control">
	<label class="flex gap-1 cursor-pointer">
		<input
			id="cbox"
			class="checkbox checkbox-error indeterminate:checkbox-warning checked:checkbox-primary"
			{disabled}
			type="checkbox"
			bind:this={box}
			on:click={rotateState}
		/>
		<span class="label-text flex flex-row gap-1 items-center">
			{text}
			<label
				class="btn btn-circle btn-ghost btn-xs text-info"
				on:click={() => alert('Significado:\n' + description)}
				on:keypress={() => alert('Significado:\n' + description)}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					class="w-4 h-4 stroke-current"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</label>
		</span>
	</label>
</div>
