<script>
	import { flip } from 'svelte/animate';

	export let data = [];
	export let removesItems = false;
	export let itemsMap = {};
	export let onHover = () => {};
	export let onClick = () => {};

	let ghost;
	let grabbed;

	let lastTarget;

	let mouseY = 0; // pointer y coordinate within client
	let offsetY = 0; // y distance from top of grabbed element to pointer
	let layerY = 0; // distance from top of list to top of client

	function grab(clientY, element) {
		// modify grabbed element
		grabbed = element;
		grabbed.dataset.grabY = clientY;

		// modify ghost element (which is actually dragged)
		ghost.innerHTML = grabbed.innerHTML;

		// record offset from cursor to top of element
		// (used for positioning ghost)
		offsetY = grabbed.getBoundingClientRect().y - clientY;
		drag(clientY);
	}

	// drag handler updates cursor position
	function drag(clientY) {
		if (grabbed) {
			mouseY = clientY;
			layerY = ghost.parentNode.getBoundingClientRect().y;
		}
	}

	// touchEnter handler emulates the mouseenter event for touch input
	// (more or less)
	function touchEnter(ev) {
		drag(ev.clientY);
		// trigger dragEnter the first time the cursor moves over a list item
		let target = document.elementFromPoint(ev.clientX, ev.clientY).closest('.item');
		if (target && target != lastTarget) {
			lastTarget = target;
			dragEnter(ev, target);
		}
	}

	function dragEnter(ev, target) {
		// swap items in data
		if (grabbed && target != grabbed && target.classList.contains('item')) {
			moveDatum(parseInt(grabbed.dataset.index), parseInt(target.dataset.index));
		}
	}

	// does the actual moving of items in data
	function moveDatum(from, to) {
		let temp = data[from];
		data = [...data.slice(0, from), ...data.slice(from + 1)];
		data = [...data.slice(0, to), temp, ...data.slice(to)];
	}

	function release(ev) {
		grabbed = null;
	}

	function removeDatum(index) {
		data = [...data.slice(0, index), ...data.slice(index + 1)];
	}
</script>

<!-- All the documentation has to go up here, sorry.
     (otherwise it conflicts with the HTML or svelte/animate) 
     The .list has handlers for pointer movement and pointer up/release/end.
     Each .item has a handler for pointer down/click/start, which assigns that
     element as the item currently being "grabbed".  They also have a handler
     for pointer enter (the touchmove handler has extra logic to behave like the
     no longer extant 'touchenter'), which swaps the entered element with the
     grabbed element when triggered.
     You'll also find reactive styling below, which keeps it from being directly
     part of the imperative javascript handlers. -->
<main class="dragdroplist">
	<div
		bind:this={ghost}
		id="ghost"
		class={'item bg-base-200 flex flex-row justify-between w-full border-[1px] rounded-lg px-2 py-1 select-none pointer-events-none ' +
			(grabbed ? 'haunting' : '')}
		style={'top: ' + (mouseY + offsetY - layerY) + 'px'}
	>
		<p />
	</div>
	<div
		class="cursor-grab flex flex-col gap-1"
		on:mousemove={function (ev) {
			ev.stopPropagation();
			drag(ev.clientY);
		}}
		on:touchmove={function (ev) {
			ev.stopPropagation();
			drag(ev.touches[0].clientY);
		}}
		on:mouseup={function (ev) {
			ev.stopPropagation();
			release(ev);
		}}
		on:touchend={function (ev) {
			ev.stopPropagation();
			release(ev.touches[0]);
		}}
	>
		{#each data as datum, i (datum.id ? datum.id : JSON.stringify(datum))}
			{@const item = itemsMap[datum]}
			<div
				id={grabbed && (datum.id ? datum.id : JSON.stringify(datum)) == grabbed.dataset.id
					? 'grabbed'
					: ''}
				class="item flex flex-row justify-between w-full border-[1px] rounded-lg px-2 py-1 select-none group transition-colors"
				class:hover:bg-base-200={!grabbed}
				class:opacity-0={grabbed &&
					(datum.id ? datum.id : JSON.stringify(datum)) == grabbed.dataset.id}
				data-index={i}
				data-id={datum.id || JSON.stringify(datum)}
				data-grabY="0"
				on:mousedown={function (ev) {
					grab(ev.clientY, this);
				}}
				on:click={function (ev) {
					onClick(datum, ev);
				}}
				on:touchstart={function (ev) {
					grab(ev.touches[0].clientY, this);
				}}
				on:mouseenter={function (ev) {
					ev.stopPropagation();
					if (!grabbed) {
						onHover(datum, ev);
					}
					dragEnter(ev, ev.target);
				}}
				on:mouseleave={function (ev) {
					ev.stopPropagation();
					onHover(null, ev);
				}}
				on:touchmove={function (ev) {
					ev.stopPropagation();
					ev.preventDefault();
					touchEnter(ev.touches[0]);
				}}
				animate:flip={{ duration: 200 }}
			>
				<div class="flex items-center gap-4">
					<svg
						class="fill-base-content opacity-40 w-4"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 448 512"
						><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path
							d="M32 288c-17.7 0-32 14.3-32 32s14.3 32 32 32l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 288zm0-128c-17.7 0-32 14.3-32 32s14.3 32 32 32l384 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 160z"
						/></svg
					>

					<div class="content">
						<slot />
						<p class="text-base-content">
							({('' + item?.id).padStart(5, 0)}) {item?.official_name ||
								item?.name ||
								item?.osm_name}
						</p>
					</div>
				</div>

				{#if removesItems}
					<!-- show X by default in devices without hover -->
					<button
						class="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition p-1"
						on:click={function (ev) {
							removeDatum(i);
						}}
					>
						<svg
							class="fill-base-content opacity-80"
							xmlns="http://www.w3.org/2000/svg"
							height="16"
							viewBox="0 0 24 24"
							width="16"
							><path d="M0 0h24v24H0z" fill="none" /><path
								d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
							/></svg
						>
					</button>
				{/if}
			</div>
		{/each}
	</div>
</main>

<style>
	main {
		position: relative;
	}

	.item:last-child {
		margin-bottom: 0;
	}

	.item:not(#grabbed):not(#ghost) {
		z-index: 10;
	}

	.buttons {
		width: 32px;
		min-width: 32px;
		margin: auto 0;
		display: flex;
		flex-direction: column;
	}

	#grabbed {
		opacity: 0;
	}

	#ghost {
		pointer-events: none;
		z-index: -5;
		position: absolute;
		top: 0;
		left: 0;
		opacity: 0;
	}

	#ghost * {
		pointer-events: none;
	}

	#ghost.haunting {
		z-index: 20;
		opacity: 1;
	}
</style>
