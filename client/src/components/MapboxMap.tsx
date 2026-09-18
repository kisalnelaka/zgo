'use client';

import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapboxMapProps {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  pitch?: number;
  bearing?: number;
  driverCoords?: { lat: number; lng: number; heading?: number } | null;
  pickupCoords?: { lat: number; lng: number; label?: string } | null;
  dropoffCoords?: { lat: number; lng: number; label?: string } | null;
  routeCoordinates?: [number, number][]; // [[lng, lat], ...]
  className?: string;
  interactive?: boolean;
  followDriver?: boolean;
}

export function MapboxMap({
  center = [51.5310, 25.3280], // Doha center: [lng, lat]
  zoom = 12.8,
  pitch = 25,
  bearing = 0,
  driverCoords,
  pickupCoords,
  dropoffCoords,
  routeCoordinates,
  className = 'h-full w-full',
  interactive = true,
  followDriver = false,
}: MapboxMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const driverMarkerRef = useRef<maplibregl.Marker | null>(null);
  const pickupMarkerRef = useRef<maplibregl.Marker | null>(null);
  const dropoffMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Free, official Esri World Dark Canvas tiles with zero API keys and NO watermarks
    const darkMapStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'esri-dark': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: '&copy; Esri &copy; OpenStreetMap contributors',
        },
      },
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: {
            'background-color': '#0f172a',
          },
        },
        {
          id: 'esri-dark-tiles',
          type: 'raster',
          source: 'esri-dark',
          minzoom: 0,
          maxzoom: 18,
          paint: {
            'raster-opacity': 0.95,
            'raster-contrast': 0.1,
          },
        },
      ],
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: darkMapStyle,
      center,
      zoom,
      pitch,
      bearing,
      attributionControl: false,
      interactive,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      // Add route polyline source
      map.addSource('route-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates && routeCoordinates.length > 0 ? routeCoordinates : [],
          },
        },
      });

      // Subtle route outline
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#1e3a8a',
          'line-width': 7,
          'line-opacity': 0.6,
        },
      });

      // Vivid route core
      map.addLayer({
        id: 'route-core',
        type: 'line',
        source: 'route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#38bdf8',
          'line-width': 3.5,
        },
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Route Polyline dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateRoute = () => {
      const source = map.getSource('route-line') as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates && routeCoordinates.length > 0 ? routeCoordinates : [],
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      updateRoute();
    } else {
      map.once('load', updateRoute);
    }
  }, [routeCoordinates]);

  // Update Driver Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (driverCoords) {
      const { lng, lat, heading } = driverCoords;

      if (!driverMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'driver-marker-container cursor-pointer';
        el.innerHTML = `
          <div class="relative flex flex-col items-center">
            <div class="mb-1 rounded bg-slate-900/90 px-2 py-0.5 text-[10px] font-semibold text-sky-400 border border-slate-700 shadow-md whitespace-nowrap">
              Tariq (Driver)
            </div>
            <div class="relative flex items-center justify-center">
              <span class="absolute -inset-1.5 rounded-full bg-sky-400/30 animate-ping"></span>
              <div class="relative h-9 w-9 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center shadow-lg">
                <svg id="vehicle-heading-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${heading || 0}deg); transition: transform 0.3s ease;">
                  <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
                </svg>
              </div>
            </div>
          </div>
        `;

        driverMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
      } else {
        driverMarkerRef.current.setLngLat([lng, lat]);
        const svg = driverMarkerRef.current.getElement().querySelector('#vehicle-heading-icon') as HTMLElement | null;
        if (svg) {
          svg.style.transform = `rotate(${heading || 0}deg)`;
        }
      }

      if (followDriver) {
        map.easeTo({
          center: [lng, lat],
          duration: 1000,
        });
      }
    }
  }, [driverCoords, followDriver]);

  // Update Pickup Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pickupCoords) {
      if (!pickupMarkerRef.current) {
        const el = document.createElement('div');
        el.innerHTML = `
          <div class="relative flex flex-col items-center cursor-pointer">
            <div class="mb-1 rounded bg-slate-900/90 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-slate-700 shadow whitespace-nowrap">
              Pickup: ${pickupCoords.label?.slice(0, 16) || 'Origin'}
            </div>
            <div class="h-7 w-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
            </div>
          </div>
        `;
        pickupMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([pickupCoords.lng, pickupCoords.lat])
          .addTo(map);
      } else {
        pickupMarkerRef.current.setLngLat([pickupCoords.lng, pickupCoords.lat]);
      }
    }
  }, [pickupCoords]);

  // Update Dropoff Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (dropoffCoords) {
      if (!dropoffMarkerRef.current) {
        const el = document.createElement('div');
        el.innerHTML = `
          <div class="relative flex flex-col items-center cursor-pointer">
            <div class="mb-1 rounded bg-slate-900/90 px-2 py-0.5 text-[10px] font-medium text-rose-400 border border-slate-700 shadow whitespace-nowrap">
              Dropoff: ${dropoffCoords.label?.slice(0, 16) || 'Destination'}
            </div>
            <div class="h-7 w-7 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
          </div>
        `;
        dropoffMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([dropoffCoords.lng, dropoffCoords.lat])
          .addTo(map);
      } else {
        dropoffMarkerRef.current.setLngLat([dropoffCoords.lng, dropoffCoords.lat]);
      }
    }
  }, [dropoffCoords]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <div ref={mapContainerRef} className={className} />
    </div>
  );
}
