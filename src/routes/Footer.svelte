<script>
	import { page } from '$app/stores';
</script>

<footer class="flex justify-between bg-base-100">
	<div></div>
	<nav>
		<div class="tabs mx-auto">
			<label class="tab tab-bordered">
				<input class="hidden" type="radio" name="mode" />Stops
			</label>
			<label class="tab tab-bordered">
				<input class="hidden" type="radio" name="mode" />Lines
			</label>
			<label class="tab tab-bordered">
				<input class="hidden" type="radio" name="mode" />Images
			</label>
			<label class="tab tab-bordered">
				<input class="hidden" type="radio" name="mode" />Actions
			</label>
		</div>
	</nav>
	<div class="flex">
		<div class="form-control">
			<label class="input-group input-group-xs">
			  <span>User</span>
			  <input type="text" placeholder="Type here" class="input input-bordered input-xs" />
			</label>
		  </div>
		<div class="form-control">
			<label class="input-group input-group-xs">
			  <span>Pwd</span>
			  <input type="text" placeholder="Type here" class="input input-bordered input-xs" />
			</label>
		  </div>
		  <input type="button" class="btn btn-primary input-xs" value="Login"/>
	</div>
</footer>

<style>

	nav {
		display: flex;
		justify-content: center;
		--background: rgba(255, 255, 255, 0.7);
	}

	ul {
		position: relative;
		padding: 0;
		margin: 0;
		height: 3em;
		display: flex;
		justify-content: center;
		align-items: center;
		list-style: none;
		background: var(--background);
		background-size: contain;
	}
</style>
