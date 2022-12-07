import L from 'leaflet?client';
import {browser} from '$app/environment';

export const sources = ["carris", "cmet", "tcb", "tst", "sf", "mobicascais", "osm", "geoc"];
export const icons = {};
export const picIcon = browser ? L.icon({
  iconUrl: `/markers/pic.svg`,
  iconSize: [32, 32],
  // iconAnchor: [16, 31],
  tooltipAnchor: [16, 0],
}) : null;

if (browser) {
  for (let source of sources) {
    icons[source] = L.icon({
      iconUrl: `/markers/${source}.svg`,
      iconSize: [32, 32],
      tooltipAnchor: [16, 0],
    });
  }
}