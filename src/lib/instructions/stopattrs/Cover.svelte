<script>
	import Cover from '$lib/instructions/artwork/cover.svg';
	import AdCover from '$lib/instructions/artwork/adcover.svg';
</script>

<h2 id="has_cover" class="card-title">
	Cobertura <span class="font-mono text-xs">has_cover</span>
</h2>
<p>
	Uma cobertura é uma estrutura secundária, podendo não fazer parte de uma paragem. É considerada
	cobertura toda a estrutura que oferece proteção contra sol ou chuva <b>em clima típico</b>.
</p>

<p class="pl-2 border-info border-l-2">
	Abrigos, sendo categorizados de forma distinta, não são considerados coberturas.
</p>

<img class="h-64" src={Cover} alt="Cobetura" />

<p class="pl-2 border-warning border-l-2">
	Só é considerada como cobertura, a infraestrutura que consegue servir <b>pelo menos um utente</b>.
	Coberturas diminutas, tal que dificilmente oferecem proteção <b>significativa</b> a um único utente,
	não deverão de ser consideradas.
</p>
<img class="h-64" src={AdCover} alt="Cobetura insuficiente" />
