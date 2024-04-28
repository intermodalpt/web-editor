<script>
	import { marked } from 'marked';

	export let content;

	$: content_html = marked(content);
</script>

<div class="border-l-2 ml-2 p-2 border-info bg-base-200 md">{@html content_html}</div>

<style>
	.md :global(h1),
	.md :global(h2),
	.md :global(h3),
	.md :global(h4),
	.md :global(h5),
	.md :global(h6) {
		font-size: revert;
		font-weight: revert;
		line-height: revert;
	}

	.md :global(ul),
	.md :global(ol) {
		list-style-type: revert;
		padding: revert;
		margin: revert;
	}

	.md :global(a) {
		color: hsl(var(--pf) / var(--tw-text-opacity));
		cursor: pointer;
		text-decoration-line: underline;
	}

	.md :global(a:hover) {
		text-decoration: underline;
	}

	.md :global(table) {
		width: 100%;
		font-size: 0.875rem;
		line-height: 1.25rem;
		border-collapse: collapse;
	}

	.md :global(.table :where(thead, tfoot)) {
		white-space: nowrap;
		font-size: 0.75rem;
		line-height: 1rem;
		font-weight: 700;
		color: hsl(var(--bc) / 0.6);
	}

	.md :global(.table :where(th, td)) {
		padding-left: 1rem;
		padding-right: 1rem;
		padding-top: 0.75rem;
		padding-bottom: 0.75rem;
		vertical-align: middle;
	}

	.md :global(.table :where(thead, tbody) :where(tr:not(:last-child))),
	.md :global(.table :where(thead, tbody) :where(tr:first-child:last-child)) {
		border-bottom-width: 1px;
		--tw-border-opacity: 1;
		border-bottom-color: hsl(var(--b2) / var(--tw-border-opacity));
	}

	.md :global(blockquote) {
		padding: 0.5rem;
		border-color: hsl(var(--in) / var(--tw-border-opacity));
		background-color: hsl(var(--b2) / var(--tw-bg-opacity));
		border-left-width: 2px;
		margin-left: 0.5rem;
	}
</style>
