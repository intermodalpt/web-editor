export class SearchControl {
	onAdd(map) {
		this._map = map;
		this._container = document.createElement('div');
		this._container.className =
			'maplibregl-ctrl maplibregl-ctrl-group mapboxgl-ctrl mapboxgl-ctrl-group';

		// Create a child button
		this._button = document.createElement('button');
		// this._button.className = 'maplibregl-ctrl-icon mapboxgl-ctrl-icon mapboxgl-ctrl-search';
		this._button.textContent = '🔍';
		this._container.appendChild(this._button);

		// Seach for the element "stop-search-modal" inside the map
		this._modal = this._map.getContainer().querySelector('#stop-search-modal');

		// When the button is clicked, show the modal
		this._button.addEventListener('click', () => {
			this._modal.checked = true;
		});

		return this._container;
	}

	onRemove() {
		this._container.parentNode.removeChild(this._container);
		this._map = undefined;
	}
}
