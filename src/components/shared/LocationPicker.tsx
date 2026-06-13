"use client";

/**
 * LocationPicker — Mapbox pin-drop for checkout delivery quotes
 * -------------------------------------------------------------
 * Search (Mapbox Geocoding, Uganda-biased) + draggable pin + "use my
 * location". Emits the chosen coordinates and a human-readable label.
 *
 * Requires:  npm i mapbox-gl
 * Env:       NEXT_PUBLIC_MAPBOX_TOKEN  (pk. token, domain-restricted)
 *
 * Degrades gracefully — if the token is missing or the map fails to load,
 * it renders a note and checkout continues with the fee-on-call fallback.
 */

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
const KAMPALA: [number, number] = [32.5825, 0.3476]; // lng, lat

export interface PickedLocation {
  lat: number;
  lng: number;
}

interface Suggestion {
  id: string;
  placeName: string;
  center: [number, number]; // lng, lat
}

export default function LocationPicker({
  onChange,
}: {
  /** Fires whenever the pin settles somewhere new. */
  onChange: (loc: PickedLocation, label: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);

  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [label, setLabel] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  // Keep the latest onChange without re-initialising the map.
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // ── Commit a pin position: notify parent + reverse-geocode a label ─────────
  async function commit(lng: number, lat: number) {
    onChangeRef.current({ lat, lng }, ""); // fee quote can start immediately
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
        `?access_token=${TOKEN}&country=ug&types=poi,address,neighborhood,locality,place&limit=1`
      );
      const data = await res.json();
      const name: string = data?.features?.[0]?.place_name || "Pinned location";
      setLabel(name);
      onChangeRef.current({ lat, lng }, name);
    } catch {
      setLabel("Pinned location");
      onChangeRef.current({ lat, lng }, "Pinned location");
    }
  }

  // ── Initialise the map once ─────────────────────────────────────────────────
  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled || !containerRef.current) return;
        mapboxgl.accessToken = TOKEN;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: KAMPALA,
          zoom: 11,
          attributionControl: false,
        });
        map.addControl(new mapboxgl.AttributionControl({ compact: true }));
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

        const marker = new mapboxgl.Marker({ draggable: true, color: "#1b7a43" })
          .setLngLat(KAMPALA)
          .addTo(map);

        marker.on("dragend", () => {
          const p = marker.getLngLat();
          commit(p.lng, p.lat);
        });
        map.on("click", (e) => {
          marker.setLngLat(e.lngLat);
          commit(e.lngLat.lng, e.lngLat.lat);
        });
        map.on("error", () => setMapFailed(true));

        mapRef.current = map;
        markerRef.current = marker;
        setMapReady(true);
      } catch (err) {
        console.error("[LocationPicker] Map failed to load:", err);
        if (!cancelled) setMapFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // ── Search-as-you-type (debounced) ──────────────────────────────────────────
  useEffect(() => {
    if (!TOKEN) return;
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
          `?access_token=${TOKEN}&country=ug&proximity=${KAMPALA[0]},${KAMPALA[1]}` +
          `&types=poi,address,neighborhood,locality,place&autocomplete=true&limit=5`,
          { signal: ctrl.signal }
        );
        const data = await res.json();
        setSuggestions(
          (data?.features || []).map((f: { id: string; place_name: string; center: [number, number] }) => ({
            id: f.id,
            placeName: f.place_name,
            center: f.center,
          }))
        );
      } catch {
        /* aborted or offline — ignore */
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query]);

  function pickSuggestion(s: Suggestion) {
    setQuery("");
    setSuggestions([]);
    setLabel(s.placeName);
    const [lng, lat] = s.center;
    markerRef.current?.setLngLat([lng, lat]);
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 900 });
    onChangeRef.current({ lat, lng }, s.placeName);
  }

  function useMyLocation() {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Location is not available in this browser — search or tap the map instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = pos.coords;
        markerRef.current?.setLngLat([lng, lat]);
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 16, duration: 900 });
        commit(lng, lat);
      },
      () => {
        setLocating(false);
        setGeoError("We couldn't read your location — search or tap the map instead.");
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  // ── Token missing / map failed → graceful note, checkout continues ─────────
  if (!TOKEN || mapFailed) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center">
        <MapPin className="h-5 w-5 text-zinc-300 mx-auto mb-1.5" />
        <p className="text-xs text-zinc-500 font-medium">
          Location pinning is unavailable right now. No problem — our team will
          confirm your delivery fee by phone after you order.
        </p>
        {!TOKEN && (
          <p className="mt-1 text-[10px] text-zinc-400">
            (Dev note: set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>.)
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Search + locate */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your area, building or landmark..."
            className="w-full h-11 pl-10 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-red/20 focus:border-primary-red transition-all"
          />
          {(suggestions.length > 0 || searching) && (
            <div className="absolute z-20 left-0 right-0 top-12 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden">
              {searching && (
                <div className="px-4 py-3 text-xs text-zinc-400 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                </div>
              )}
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium text-zinc-700 hover:bg-gray-50 flex items-start gap-2.5 transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-kafunda-green mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{s.placeName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating || !mapReady}
          className="h-11 px-4 rounded-xl border border-gray-200 bg-white hover:border-kafunda-green hover:text-kafunda-green text-zinc-600 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-60 shrink-0"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
          <span className="hidden sm:inline">My location</span>
        </button>
      </div>

      {/* Map */}
      <div
        ref={containerRef}
        className="h-60 w-full rounded-xl overflow-hidden border border-gray-200"
        aria-label="Delivery location map — drag the pin to your exact spot"
      />

      {/* Current pin label / errors */}
      {label && (
        <p className="text-[11px] text-zinc-500 font-medium flex items-start gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-kafunda-green mt-px shrink-0" />
          <span className="line-clamp-2">{label}</span>
        </p>
      )}
      {geoError && (
        <p className="text-[11px] text-amber-700 font-medium">{geoError}</p>
      )}
      <p className="text-[10px] text-zinc-400">
        Drag the green pin (or tap the map) to your exact gate — the closer the
        pin, the more accurate your delivery fee.
      </p>
    </div>
  );
}