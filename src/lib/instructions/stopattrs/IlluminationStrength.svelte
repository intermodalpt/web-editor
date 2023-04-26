<script>
	import LightNone from '$lib/instructions/artwork/lightnone.svg';
	import LightWeak from '$lib/instructions/artwork/lightweak.svg';
	import LightMedium from '$lib/instructions/artwork/lightmedium.svg';
	import LightStrong from '$lib/instructions/artwork/lightstrong.svg';

	import LightNonePow from '$lib/instructions/artwork/lightnonepov.svg';
	import LightWeakPow from '$lib/instructions/artwork/lightweakpov.svg';
	import LightMediumPow from '$lib/instructions/artwork/lightmediumpov.svg';
	import LightStrongPow from '$lib/instructions/artwork/lightstrongpov.svg';

	import LightStrongThenMedium from '$lib/instructions/pictures/lightstrongthenmedium.webp';
</script>

<h2 id="illumination_strength" class="card-title">
	Intensidade da iluminação <span class="font-mono text-xs">illumination_strength</span>
</h2>
<span class="text-xs">Referente à visibilidade noturna.</span>
<p>
	Infraestruturas auto-iluminadas tem <b>iluminação própria</b>. Iluminação posicionada
	imediatamente acima ou proveniente de feixes direcionados (como holofotes) conta como
	<b>iluminação direta</b>. Toda a demais iluminação é contabilizada como
	<b>iluminação indireta</b>. A aplicação ocorre por esta ordem, do mais notório para o menos
	notório.
</p>
<p class="-ml-2 pl-2 border-error border-l-2">
	Este atributo é de difícil preenchimento. A dúvida deverá de levar ao não preenchimento.
</p>
<p class="-ml-2 pl-2 border-info border-l-2">
	Este atributo pode considerar fontes de iluminação fundidas, dado que as mesmas tipicamente
	operam.<br />
	Nesta circunstância também deve de ser colocado o <i>defeito</i> "<i>Iluminação fundida</i>".
</p>
<p class="-ml-2 pl-2 border-info border-l-2">
	A intensidade deverá de dizer respeito à fonte primária de iluminação, mesmo que esta se encontre
	fundida.
</p>

<h3 class="text-lg font-semibold">Quantificação</h3>
<div class="ml-2">
	<h4 class="text-md font-semibold">Iluminação forte</h4>
	<div class="flex flex-wrap gap-4">
		<img class="h-64" src={LightStrongPow} alt="Luz forte" />
		<img class="h-64" src={LightStrong} alt="Luz forte" />
	</div>
	<p class="ml-1">
		Permite a leitura <b>confortável</b> na paragem, uma abundância de visibilidade. (Apóximadamente
		&gt; 100 lux)
	</p>
	<h4 class="text-md font-semibold">Iluminação moderada</h4>
	<div class="flex flex-wrap gap-4">
		<img class="h-64" src={LightMediumPow} alt="Luz moderada" />
		<img class="h-64" src={LightMedium} alt="Luz moderada" />
	</div>
	<p class="ml-1">
		Permite a fácil visibilidade das imediações e relativa facilidade de ser observado por um
		veiculo.<br />
		Uma rua em meio urbano tende a ter iluminação moderada.
	</p>
	<h4 class="text-md font-semibold">Iluminação fraca</h4>
	<div class="flex flex-wrap gap-4">
		<img class="h-64" src={LightWeakPow} alt="Luz fraca" />
		<img class="h-64" src={LightWeak} alt="Luz fraca" />
	</div>
	<p class="ml-1">
		Permite, no máximo, uma leve perceção do traçado da via e não oferece observação fácil dos
		passageiros por um veiculo. (Apóximadamente &lt;0.1 lux)
	</p>
	<h4 class="text-md font-semibold">Sem iluminação</h4>
	<div class="flex flex-wrap gap-4">
		<img class="h-64" src={LightNonePow} alt="Sem luz" />
		<img class="h-64" src={LightNone} alt="Sem luz" />
	</div>
	<p class="ml-1">
		Designa-se sem iluminação à paragem ou meio cujo peão, a olho nu, tem dificuldade a observar o
		meio sem esforço.
	</p>
</div>

<h3 class="text-lg font-semibold">Exemplos</h3>
<div class="ml-2 flex-col">
	<h4 class="text-md font-semibold">Transição de luz forte para moderada:</h4>
	<img class="h-64" src={LightStrongThenMedium} alt="Luz forte passa a moderada" />
</div>
