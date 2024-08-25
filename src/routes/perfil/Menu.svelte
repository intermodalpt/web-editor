<script>
	import {
		PROFILE_URL,
		PROFILE_SURVEY_URL,
		PROFILE_PERMISSIONS_URL,
		PROFILE_CONTRIBUTIONS_URL,
		PROFILE_SETTINGS_URL
	} from '$lib/urls';

	export let page;
	export let data;
</script>

<h1 class="text-3xl font-bold flex align-top p-4">
	{data.uname}<span class="text-lg font-thin">(#{data.uid})</span>
</h1>

<div role="tablist" class="tabs tabs-bordered tabs-lg overflow-x-auto menu-scroll-shadows">
	<a role="tab" class="tab" class:tab-active={page == 'root'} href={PROFILE_URL}>Sumário</a>
	<a role="tab" class="tab" class:tab-active={page == 'contrib'} href={PROFILE_CONTRIBUTIONS_URL}>
		Contribuições
	</a>
	<a role="tab" class="tab" class:tab-active={page == 'perms'} href={PROFILE_PERMISSIONS_URL}>
		Permissões
	</a>
	<a role="tab" class="tab" class:tab-active={page == 'survey'} href={PROFILE_SURVEY_URL}
		>Inquérito</a
	>
	<a role="tab" class="tab" class:tab-active={page == 'settings'} href={PROFILE_SETTINGS_URL}>
		Definições
	</a>
</div>
