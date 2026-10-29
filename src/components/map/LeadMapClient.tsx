"use client";

import * as LeafletModule from "leaflet";
import type { MarkerClusterGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { industryLabel, WEBSITE_STATUS_LABEL } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { mapTiles, mapTilesLight } from "@/lib/providers/mapsProvider";
import type { Lead } from "@/lib/types";
import { MARKER_COLORS, markerKind } from "./markerStyle";

// Leaflet ships as CommonJS and ESM; normalise to one object.
const L = ((LeafletModule as unknown as { default?: typeof LeafletModule }).default ?? LeafletModule) as typeof LeafletModule;

export interface LeadMapProps {
  leads: Lead[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

function markerIcon(lead: Lead, selected: boolean): L.DivIcon {
  const { color } = MARKER_COLORS[markerKind(lead)];
  const size = selected ? 32 : 28;
  // Only numbers and a fixed colour go into this HTML – no external text.
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<div class="lf-marker${selected ? " is-selected" : ""}" style="width:${size}px;height:${size}px;background:${color}">${Number(lead.score.total)}</div>`,
  });
}

/** Popup built with DOM APIs + textContent, so business data can never inject HTML. */
function popupContent(lead: Lead, onView: () => void): HTMLElement {
  const b = lead.business;
  const root = document.createElement("div");
  root.style.minWidth = "200px";

  const title = document.createElement("div");
  title.className = "lf-popup-title";
  title.textContent = b.name;
  const sub = document.createElement("div");
  sub.className = "lf-popup-sub";
  sub.textContent = `${industryLabel(b.industry)} · ${b.city}`;
  root.append(title, sub);

  const rows: [string, string][] = [
    ["Beoordeling", b.rating !== null ? `★ ${b.rating.toFixed(1)}` : "Onbekend"],
    ["Reviews", b.rating !== null ? formatNumber(b.reviewCount) : "Onbekend"],
    ["Website", WEBSITE_STATUS_LABEL[lead.websiteStatus]],
    ["Leadscore", `${lead.score.total}/100 · ${lead.score.tier.toUpperCase()}`],
  ];
  for (const [label, value] of rows) {
    const row = document.createElement("div");
    row.className = "lf-popup-row";
    const labelNode = document.createElement("span");
    labelNode.className = "lf-popup-label";
    labelNode.textContent = label;
    const valueNode = document.createElement("span");
    valueNode.className = "lf-popup-value";
    valueNode.textContent = value;
    row.append(labelNode, valueNode);
    root.append(row);
  }

  const button = document.createElement("button");
  button.className = "lf-popup-button";
  button.textContent = "Bekijk lead →";
  button.addEventListener("click", onView);
  root.append(button);
  return root;
}

export default function LeadMapClient({ leads, selectedId, onSelect, className }: LeadMapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<MarkerClusterGroup | null>(null);
  const markersRef = useRef(new Map<string, { marker: L.Marker; lead: Lead }>());
  const lastBoundsKey = useRef("");
  const [ready, setReady] = useState(false);

  // Keep the latest callbacks in refs so markers don't need to be rebuilt when they change.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const routerRef = useRef(router);
  routerRef.current = router;

  // 1) Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const map = L.map(containerRef.current, { worldCopyJump: true, zoomControl: true }).setView([35, -20], 3);
    const tiles = document.documentElement.dataset.theme === "light" ? mapTilesLight : mapTiles;
    const layer = L.tileLayer(tiles.url, { attribution: tiles.attribution, maxZoom: tiles.maxZoom, subdomains: "abcd" }).addTo(map);
    mapRef.current = map;

    const syncTiles = () => {
      const next = document.documentElement.dataset.theme === "light" ? mapTilesLight : mapTiles;
      layer.setUrl(next.url);
    };
    const themeObserver = new MutationObserver(syncTiles);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // The cluster plugin expects a global, writable `L`.
    const globalL = Object.isExtensible(L) ? L : { ...L };
    (window as unknown as { L: typeof L }).L = globalL;
    import("leaflet.markercluster").then(() => {
      if (cancelled) return;
      const createCluster = (window as unknown as { L: typeof L }).L.markerClusterGroup;
      const group = createCluster({
        showCoverageOnHover: false,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          const size = count < 10 ? 34 : count < 50 ? 40 : 48;
          return L.divIcon({
            className: "",
            iconSize: [size, size],
            html: `<div class="lf-cluster" style="width:${size}px;height:${size}px">${count}</div>`,
          });
        },
      });
      map.addLayer(group);
      clusterRef.current = group;
      setReady(true);
    });

    // Recalculate the map size when its container changes (e.g. split view).
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);

    return () => {
      cancelled = true;
      themeObserver.disconnect();
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // 2) (Re)build markers whenever the list of leads changes.
  useEffect(() => {
    const map = mapRef.current;
    const group = clusterRef.current;
    if (!ready || !map || !group) return;

    group.clearLayers();
    markersRef.current.clear();

    const markers = leads.map((lead) => {
      const marker = L.marker([lead.business.lat, lead.business.lng], {
        icon: markerIcon(lead, lead.business.id === selectedId),
        title: lead.business.name,
        riseOnHover: true,
      });
      marker.bindPopup(() => popupContent(lead, () => routerRef.current.push(`/leads/${lead.business.id}`)), {
        closeButton: true,
        maxWidth: 260,
      });
      marker.on("click", () => onSelectRef.current?.(lead.business.id));
      markersRef.current.set(lead.business.id, { marker, lead });
      return marker;
    });
    group.addLayers(markers);

    // Only re-fit the view when the set of businesses changes, not on status updates.
    const key = leads.map((l) => l.business.id).sort().join(",");
    if (key !== lastBoundsKey.current && leads.length > 0) {
      lastBoundsKey.current = key;
      const bounds = L.latLngBounds(leads.map((l) => [l.business.lat, l.business.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
    // selectedId is intentionally not a dependency: selection is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, ready]);

  // 3) Highlight + zoom to the selected lead.
  const previousSelected = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    const group = clusterRef.current;
    if (!ready || !map || !group) return;

    const prev = previousSelected.current ? markersRef.current.get(previousSelected.current) : undefined;
    if (prev) prev.marker.setIcon(markerIcon(prev.lead, false));
    previousSelected.current = selectedId ?? null;

    if (!selectedId) return;
    const entry = markersRef.current.get(selectedId);
    if (!entry) return;
    entry.marker.setIcon(markerIcon(entry.lead, true));
    group.zoomToShowLayer(entry.marker, () => {
      const target = entry.marker.getLatLng();
      const zoom = Math.max(map.getZoom(), 14);
      if (map.getZoom() === zoom && map.getCenter().distanceTo(target) < 50) {
        entry.marker.openPopup();
        return;
      }
      map.once("moveend", () => entry.marker.openPopup());
      map.flyTo(target, zoom, { duration: 0.6 });
    });
    // Only react to selection changes – not to every lead update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, ready]);

  return <div ref={containerRef} className={className} style={{ minHeight: 300 }} />;
}
