<script lang="ts">
	import ConsentAnswer from '$lib/components/ConsentAnswer.svelte';
	import IntrestRating from '$lib/components/IntrestRating.svelte';

	export let data = {
		name: '',
		age: '',
		presentation: '',
		intrests: {
			publicTransit: null,
			pedestrian: null,
			bicycle: null,
			a11y: null,
			urbanism: null,
			ecology: null
		},
		localKnowledge: '',
		deleteData: true
	};

	if (!data.intrests) {
		data.intrests = {
			publicTransit: null,
			pedestrian: null,
			bicycle: null,
			a11y: null,
			urbanism: null,
			ecology: null
		};
	}
</script>

<h3 class="text-lg">Sou...</h3>
<label class="input input-bordered flex items-center gap-2 grow">
	Nome
	<input type="text" class="grow" placeholder="Maria" bind:value={data.name} />
</label>
<label class="input input-bordered flex items-center gap-2 grow">
	Idade
	<input
		type="text"
		class="grow"
		placeholder="'24' ou 'Jovem adulto' ou qualquer outra qualificação"
		bind:value={data.age}
	/>
</label>
<label class="form-control">
	<div class="label">
		<span class="label-text">Sobre mim</span>
	</div>
	<textarea
		bind:value={data.presentation}
		class="textarea textarea-bordered h-32"
		placeholder="Estudante. Estou a querer ajudar os transportes na minha freguesia. Gosto de plantas e era giro se o espaço público tivesse mais. Costumo fazer desporto mas não me sinto seguro a faze-lo na rua."
	></textarea>
</label>

<h3 class="text-lg">O seu interesse por...</h3>
<h4 class="text-md">Transportes públicos</h4>
<IntrestRating bind:value={data.intrests.publicTransit} />
<h4 class="text-md">Mobilidade pedonal</h4>
<IntrestRating bind:value={data.intrests.pedestrian} />
<h4 class="text-md">Mobilidade em velocípedes</h4>
<IntrestRating bind:value={data.intrests.bicycle} />
<h4 class="text-md">Acessibilidades</h4>
<IntrestRating bind:value={data.intrests.a11y} />
<h4 class="text-md">Urbanismo</h4>
<IntrestRating bind:value={data.intrests.urbanism} />
<h4 class="text-md">Ecologia</h4>
<IntrestRating bind:value={data.intrests.ecology} />

<h2 class="text-lg">Conhecimento local</h2>
<label class="form-control">
	<textarea
		bind:value={data.localKnowledge}
		class="textarea textarea-bordered h-24"
		placeholder="Exemplo: Moro no Norte. Conheço bem Braga e Guimarães. Trabalho em Aveiro. Vou frequentemente à Guarda."
	></textarea>
</label>

<h2 class="text-lg">Destruição dos dados</h2>
<div class="flex flex-wrap justify-between items-start">
	<div>
		<p>Prefiro que estes dados sejam apagados deste sistema após leitura.</p>
		<span class="text-xs">(Serão consultáveis e editáveis no perfil até serem apagados)</span>
	</div>
	<ConsentAnswer bind:value={data.deleteData} />
</div>
