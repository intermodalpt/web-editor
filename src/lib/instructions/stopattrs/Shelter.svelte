<script>
	import Shelter from '$lib/instructions/artwork/shelter.svg';
	import NonShelter from '$lib/instructions/artwork/nonshelter.svg';
	import ImperfectShelter from '$lib/instructions/artwork/imperfectshelter.svg';
</script>

<h2 id="has_shelter" class="card-title">
	Abrigo <span class="font-mono text-xs">has_shelter</span>
</h2>
<p>
	Um abrigo é uma estrutura <b>dedicada</b> que visa à proteção do peão contra os elementos.
	Tipicamente oferece proteções laterais e um teto <b>próximo</b>. Em casos pontuais também oferece
	proteção frontal contra detritos provenientes da via de rodagem.
</p>

<img class="h-64" src={Shelter} alt="Abrigo" />

<p class="pl-2 border-info border-l-2">
	Abrigos não tem de oferecer proteção plena contra todos os elementos. Por exemplo, a falta de um
	painel lateral ou traseiro não implica que a estrutura não seja um abrigo.
</p>

<img class="h-64" src={ImperfectShelter} alt="Abrigo imperfeito" />

<p class="pl-2 border-error border-l-2">
	Só é considerada como abrigo, a infraestrutura que consegue servir <b>pelo menos um utente</b>.
	Abrigos diminutos, tal que dificilmente oferecem proteção <b>significativa</b> a um único utente, não
	deverão de ser considerados.
</p>
<img class="h-64" src={NonShelter} alt="Abrigo insuficiente" />
