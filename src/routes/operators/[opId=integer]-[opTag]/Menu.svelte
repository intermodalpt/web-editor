<script lang="ts">
	export let operator;
	export let page: string;
</script>

<div class="card-body">
	<h2 class="card-title text-3xl">
		{#if operator.logo_url}<img class="h-12" src={operator.logo_url} alt={operator.name} />{/if}
		{operator.name}
	</h2>
</div>

<div class="px-4">
	<div role="tablist" class="tabs tabs-bordered tabs-lg mr-4">
		<a
			role="tab"
			class="tab"
			class:tab-active={page == 'root'}
			href="/operators/{operator.id}-{operator.tag}">Sumário</a
		>
		<a
			role="tab"
			class="tab"
			class:tab-active={page == 'attrs'}
			href="/operators/{operator.id}-{operator.tag}/edit">Atributos</a
		>
		<a
			role="tab"
			class="tab"
			class:tab-active={page == 'stops'}
			href="/operators/{operator.id}-{operator.tag}/stops">Paragens</a
		>
		<a
			role="tab"
			class="tab"
			class:tab-active={page == 'routes'}
			href="/operators/{operator.id}-{operator.tag}/routes">Linhas</a
		>
		<a
			role="tab"
			class="tab"
			class:tab-active={page == 'calendars'}
			href="/operators/{operator.id}-{operator.tag}/calendars">Calendários</a
		>
		<a
			role="tab"
			class="tab"
			class:tab-active={page == 'issues'}
			href="/operators/{operator.id}-{operator.tag}/issues">Problemas</a
		>
	</div>
</div>
