<script>
	import FewAds from '$lib/instructions/artwork/fewads.svg';
	import ManyAds from '$lib/instructions/artwork/manyads.svg';
</script>

<h2 id="advertisements" class="card-title">
	Anúncios <span class="font-mono text-xs">advertisements</span>
</h2>
<p>
	Afixação de anúncios que, sejam eles comerciais ou institucionais, não se encontram relacionados à
	prestação do serviço.
</p>
<p>São contabilizados como anúncio:</p>
<ul class="pl-4 list-disc">
	<li>Publicidade comercial (incluindo à própria operação)</li>
	<li>Publicidade institucional (incluindo publicidade partidária)</li>
</ul>
<p>Não são contabilizados como anúncio:</p>
<ul class="pl-4 list-disc">
	<li>Informação a respeito de alterações noutros locais da rede.</li>
	<li>Informação de alteração ou supressão de serviço (ex. linhas futuras, greves, …)</li>
	<li>Afixações ilegais (sendo contabilizadas como dano ou vandalismo)</li>
	<li>
		Afixações que não fazem parte nem da paragem nem da edificação dedicada em que a mesma se insere
		(ex: terminais).
	</li>
</ul>

<h3 class="text-lg font-semibold">Quantificação</h3>
<h4 class="text-md font-semibold">Sem anúncios</h4>
<p>Sem qualquer afixação legal na infraestrutura da paragem.</p>
<h4 class="text-md font-semibold">Pouca área</h4>
<p>
	Afixação de pequeno porte (relativo à paragem).<br />
	Exemplo: Publicidade no painel de horários do abrigo.
</p>
<img class="h-64" src={FewAds} alt="Poucos anúncios" />
<h4 class="text-md font-semibold">Muita área</h4>
<p>
	Afixação de grande porte (relativo à paragem) não intrusiva de um ponto de vista funcional.<br />
	Exemplo: Anúncio de 2m² nas costas de um abrigo.
</p>
<img class="h-64" src={ManyAds} alt="Muitos anúncios" />
<h4 class="text-md font-semibold">Intrusivos</h4>
<p>
	Afixação que ou prejudica o serviço (ex: cortando visibilidade) ou de tal forma volumosa que
	assume mais notoriedade que a paragem (ie. "paragem tem um anúncio" contrasta com "anúncio tem uma
	paragem").
</p>
