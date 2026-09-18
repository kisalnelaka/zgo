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
  pitch = 30,
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

    // High-contrast, crystal-clear Dark Matter tile map with zero token DRM
    const darkMatterStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'carto-dark': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
            'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
            'https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
            'https://d.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
        },
      },
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: {
            'background-color': '#00052e',
          },
        },
        {
          id: 'carto-dark-tiles',
          type: 'raster',
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 19,
          paint: {
            'raster-opacity': 0.92,
            'raster-contrast': 0.15,
          },
        },
      ],
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: darkMatterStyle,
      center,
      zoom,
      pitch,
      bearing,
      attributionControl: false,
      interactive,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');

    map.on('load', () => {
      // Add Route Glow and Core layers
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

      // Neon Signal Blue outer glow
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#0428cb',
          'line-width': 9,
          'line-opacity': 0.65,
          'line-blur': 3,
        },
      });

      // Electric Arc Cyan core
      map.addLayer({
        id: 'route-core',
        type: 'line',
        source: 'route-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#34fcff',
          'line-width': 3.5,
          'line-opacity': 0.95,
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

  // Update Driver Marker & smooth camera panning
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (driverCoords) {
      const { lng, lat, heading } = driverCoords;

      if (!driverMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'driver-marker-container';
        el.innerHTML = `
          <div class="relative flex flex-col items-center justify-center group cursor-pointer">
            <div class="absolute -top-7 rounded-[4px] border border-[#34fcff]/50 bg-[#00052e]/90 px-2 py-0.5 font-mono text-[9px] font-bold text-[#34fcff] shadow-cyan-glow whitespace-nowrap">
              CAPTAIN TARIQ
            </div>
            <div class="relative flex items-center justify-center">
              <div class="absolute -inset-3 rounded-full bg-[#34fcff]/25 animate-ping"></div>
              <div class="relative h-10 w-10 rounded-full bg-[#0428cb] border-2 border-[#34fcff] flex items-center justify-center shadow-cyan-glow">
                <svg id="vehicle-heading-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${heading || 0}deg); transition: transform 0.4s ease-out;">
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
          <div class="relative flex flex-col items-center group cursor-pointer">
            <div class="absolute -top-7 rounded-[4px] border border-[#10b981]/60 bg-[#00052e]/95 px-2 py-0.5 font-mono text-[9px] font-bold text-[#10b981] whitespace-nowrap shadow-lg">
              PICKUP: ${pickupCoords.label?.slice(0, 16) || 'ORIGIN'}
            </div>
            <div class="h-8 w-8 rounded-full bg-[#10b981] border-2 border-white flex items-center justify-center shadow-[0_0_12px_#10b981]">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
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
          <div class="relative flex flex-col items-center group cursor-pointer">
            <div class="absolute -top-7 rounded-[4px] border border-[#ef4444]/60 bg-[#00052e]/95 px-2 py-0.5 font-mono text-[9px] font-bold text-[#ef4444] whitespace-nowrap shadow-lg">
              DROPOFF: ${dropoffCoords.label?.slice(0, 16) || 'DESTINATION'}
            </div>
            <div class="h-8 w-8 rounded-full bg-[#ef4444] border-2 border-white flex items-center justify-center shadow-[0_0_12px_#ef4444]">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
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
    <div className="relative h-full w-full overflow-hidden bg-[#00052e]">
      <div ref={mapContainerRef} className={className} />
    </div>
  );
}
