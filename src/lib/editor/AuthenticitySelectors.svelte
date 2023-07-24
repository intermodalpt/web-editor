<script>
	export let value = null;
	export let disabled = false;

	$: position = (0b11000000 & value) >> 6;
	$: service = (0b110000 & value) >> 4;
	$: infra = (0b1100 & value) >> 2;

	function setPosition(newVal) {
		value = (0b00111111 & value) | (newVal << 6);
	}

	function setService(newVal) {
		value = (0b11001111 & value) | (newVal << 4);
	}

	function setInfra(newVal) {
		value = (0b11110011 & value) | (newVal << 2);
	}
</script>

<div class="grid gap-1 grid-cols-2">
	<span class="text-base">Serviço</span>
	<div class="join">
		<button
			class="join-item btn btn-sm border-0 bg-green-50 hover:bg-green-500 w-8"
			class:!bg-green-500={service === 3 && !disabled}
			class:!bg-green-300={service === 3 && disabled}
			class:cursor-not-allowed={disabled}
			on:click={() => {
				if (disabled) return;
				setService(3);
			}}>✔️</button
		>
		<button
			class="join-item btn btn-sm border-0 bg-yellow-50 hover:bg-yellow-500 w-8"
			class:!bg-yellow-500={service === 2 && !disabled}
			class:!bg-yellow-300={service === 2 && disabled}
			class:cursor-not-allowed={disabled}
			on:click={() => {
				if (disabled) return;
				setService(2);
			}}>~</button
		>
		<button
			class="join-item btn btn-sm border-0 bg-red-50 hover:bg-red-500 text-red-900 font-extrabold w-8"
			class:!bg-red-400={service === 1 && !disabled}
			class:!bg-red-300={service === 1 && disabled}
			class:cursor-not-allowed={disabled}
			on:click={() => {
				if (disabled) return;
				setService(1);
			}}>X</button
		>
		<button
			class="join-item btn btn-sm border-0 bg-slate-50 hover:bg-slate-400 w-8"
			class:!bg-slate-500={service === 0 && !disabled}
			class:!bg-slate-300={service === 0 && disabled}
			class:cursor-not-allowed={disabled}
			on:click={() => {
				if (disabled) return;
				setService(0);
			}}>❓</button
		>
	</div>
	<span class="text-base">Infra</span>
	<div class="join">
		<button
			class="join-item btn btn-sm border-0 bg-green-50 hover:bg-green-500 w-8"
			class:!bg-green-500={infra === 3 && !disabled}
			class:!bg-green-300={infra === 3 && disabled}
			class:cursor-not-allowed={disabled}
			on:click={() => {
				if (disabled) return;
				setInfra(3);
			}}>✔️</button
		>
		<button
			class="join-item btn btn-sm border-0 bg-yellow-50 hover:bg-yellow-500 w-8"
			class:!bg-yellow-500={infra === 2 && !disabled}
			class:!bg-yellow-300={infra === 2 && disabled}
			class:cursor-not-allowed={disabled}
			on:click={() => {
				if (disabled) return;
				setInfra(2);
			}}>~</button
		>
		<button
			class="join-item btn btn-sm border-0 bg-red-50 hover:bg-red-500 text-red-900 font-extrabold w-8"
			class:!bg-red-400={infra === 1 && !disabled}
			class:!bg-red-300={infra === 1 && disabled}
			class:cursor-not-allowed={disabled}
			on:click={() => {
				if (disabled) return;
				setInfra(1);
			}}>X</button
		>
		<button
			class="join-item btn btn-sm border-0 bg-slate-50 hover:bg-slate-400 w-8"
			class:!bg-slate-500={infra === 0 && !disabled}
			class:!bg-slate-300={infra === 0 && disabled}
			class:cursor-not-allowed={disabled}
			on:click={() => {
				if (disabled) return;
				setInfra(0);
			}}>❓</button
		>
	</div>
</div>
