<script>
	export let value;

	$: position = (0b11000000 & value) >> 6;
	$: service = (0b110000 & value) >> 4;
	$: infra = (0b1100 & value) >> 2;
</script>

<div class="join">
	<span
		class:neutral-content={position === 0}
		class:bg-slate-400={position === 0}
		class:error-content={position === 1}
		class:bg-error={position === 1}
		class:bg-green-300={position === 2}
		class:bg-green-500={position === 3}
		class:success-content={position === 3}
		class="join-item badge badge-outline">Pos</span
	>
	<span
		class:bg-slate-400={infra === 0}
		class:neutral-content={position === 0}
		class:bg-error={infra === 1}
		class:bg-green-300={infra === 2}
		class:bg-green-500={infra === 3}
		class:success-content={position === 3}
		class="join-item badge badge-outline">Infr</span
	>
	<span
		class:bg-slate-400={service === 0}
		class:neutral-content={position === 0}
		class:bg-error={service === 1}
		class:bg-green-300={service === 2}
		class:bg-green-500={service === 3}
		class:success-content={position === 3}
		class="join-item badge badge-outline">Serv</span
	>
</div>
