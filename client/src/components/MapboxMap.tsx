'use client';

import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface MapboxMapProps {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  driverCoords?: { lat: number; lng: number; heading?: number } | null;
  pickupCoords?: { lat: number; lng: number; label?: string } | null;
  dropoffCoords?: { lat: number; lng: number; label?: string } | null;
  routeCoordinates?: [number, number][]; // [[lng, lat], ...]
  className?: string;
  interactive?: boolean;
}

export function MapboxMap({
  center = [51.5310, 25.3280], // Doha center: [lng, lat]
  zoom = 12.5,
  driverCoords,
  pickupCoords,
  dropoffCoords,
  routeCoordinates,
  className = 'h-full w-full',
  interactive = true,
}: MapboxMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarkerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Use token if provided, or use Carto Dark Matter style for 100% token-free reliability
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    if (token) {
      mapboxgl.accessToken = token;
    }

    // High-contrast dark matter raster/vector style matching Ameba #00052e
    const darkMatterStyle: mapboxgl.Style = {
      version: 8,
      sources: {
        'carto-dark': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          ],
          tileSize: 256,
          attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors',
        },
      },
      layers: [
        {
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 20,
        },
      ],
    };

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: token ? 'mapbox://styles/mapbox/dark-v11' : darkMatterStyle,
      center,
      zoom,
      attributionControl: false,
      interactive,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      // Add route polyline source and layer if coordinates exist
      map.addSource('route-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates || [],
          },
        },
      });

      // Neon cyan route casing & glow
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0428cb',
          'line-width': 8,
          'line-opacity': 0.5,
        },
      });

      map.addLayer({
        id: 'route-core',
        type: 'line',
        source: 'route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#34fcff',
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
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('route-line') as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeCoordinates || [],
        },
      });
    }
  }, [routeCoordinates]);

  // Update Driver Marker & smooth camera panning
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (driverCoords) {
      const { lng, lat, heading } = driverCoords;

      if (!driverMarkerRef.current) {
        // Create custom vehicle marker
        const el = document.createElement('div');
        el.className = 'driver-marker-container';
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div class="absolute -inset-2 rounded-full bg-[#34fcff]/20 animate-ping"></div>
            <div class="h-9 w-9 rounded-full bg-[#0428cb] border-2 border-[#34fcff] flex items-center justify-center shadow-cyan-glow">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${heading || 0}deg);">
                <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
              </svg>
            </div>
          </div>
        `;

        driverMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map);
      } else {
        // Move smoothly
        driverMarkerRef.current.setLngLat([lng, lat]);
        const svg = driverMarkerRef.current.getElement().querySelector('svg');
        if (svg) {
          svg.style.transform = `rotate(${heading || 0}deg)`;
        }
      }
    }
  }, [driverCoords]);

  // Update Pickup Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pickupCoords) {
      if (!pickupMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'pickup-marker';
        el.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        `;
        pickupMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([pickupCoords.lng, pickupCoords.lat])
          .setPopup(new mapboxgl.Popup({ offset: 15 }).setHTML(`<div style="color:#000;font-size:12px;font-weight:600;">Pickup: ${pickupCoords.label || 'Origin'}</div>`))
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
        el.className = 'dropoff-marker';
        el.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        `;
        dropoffMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([dropoffCoords.lng, dropoffCoords.lat])
          .setPopup(new mapboxgl.Popup({ offset: 15 }).setHTML(`<div style="color:#000;font-size:12px;font-weight:600;">Dropoff: ${dropoffCoords.label || 'Destination'}</div>`))
          .addTo(map);
      } else {
        dropoffMarkerRef.current.setLngLat([dropoffCoords.lng, dropoffCoords.lat]);
      }
    }
  }, [dropoffCoords]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[8px] border border-[#131e5c]">
      <div ref={mapContainerRef} className={className} />
    </div>
  );
}
