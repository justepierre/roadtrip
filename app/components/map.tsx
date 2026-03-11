'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const transitIcon = (emoji: string) => L.divIcon({
  html: `<div style="font-size:20px;line-height:1">${emoji}</div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

interface Step {
  id: string
  name: string
  latitude: number
  longitude: number
  transport_mode?: string
  transit_lat?: number
  transit_lng?: number
  transit_name?: string
  transit_departure_lat?: number
  transit_departure_lng?: number
  transit_departure_name?: string
}

interface Segment {
  coords: [number, number][]
  mode: string
  label: string
  duration?: number
  distance?: number
}

interface TransitMarker {
  lat: number
  lng: number
  name: string
  emoji: string
}

interface MapProps {
  steps: Step[]
}

function FitBounds({ steps }: { steps: Step[] }) {
  const map = useMap()

  useEffect(() => {
    if (steps.length === 0) return
    if (steps.length === 1) {
      map.setView([steps[0].latitude, steps[0].longitude], 10)
      return
    }
    const bounds = steps.map(s => [s.latitude, s.longitude] as [number, number])
    map.fitBounds(bounds, { padding: [50, 50] })
  }, [steps, map])

  return null
}

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

async function getDrivingRoute(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
    )
    const data = await res.json()

    if (data.code === 'Ok') {
      const route = data.routes[0]
      const distanceKm = Math.round(route.legs[0].distance / 1000)
      const straightKm = calcDistance(fromLat, fromLng, toLat, toLng)

      // Si la route est plus de 3x la distance à vol d'oiseau → traversée impossible, on fait ferry
      if (distanceKm > straightKm * 3) {
        return {
          coords: [[fromLat, fromLng], [toLat, toLng]] as [number, number][],
          duration: Math.round(straightKm / 30 * 60),
          distance: straightKm,
          mode: 'ferry' as const,
        }
      }

      return {
        coords: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
        duration: Math.round(route.legs[0].duration / 60),
        distance: distanceKm,
        mode: 'driving' as const,
      }
    }
  } catch {}

  // Fallback : ligne droite
  const straightKm = calcDistance(fromLat, fromLng, toLat, toLng)
  return {
    coords: [[fromLat, fromLng], [toLat, toLng]] as [number, number][],
    duration: undefined,
    distance: straightKm,
    mode: 'driving' as const,
  }
}

export default function Map({ steps }: MapProps) {
  const [segments, setSegments] = useState<Segment[]>([])
  const [transitMarkers, setTransitMarkers] = useState<TransitMarker[]>([])

  useEffect(() => {
    if (steps.length < 2) { setSegments([]); setTransitMarkers([]); return }

    const fetchSegments = async () => {
      const newSegments: Segment[] = []
      const newMarkers: TransitMarker[] = []

      for (let i = 0; i < steps.length - 1; i++) {
        const from = steps[i]
        const to = steps[i + 1]
        const mode = to.transport_mode || 'driving'

        if (mode === 'plane' || mode === 'ferry') {
          const emoji = mode === 'plane' ? '✈️' : '⛴️'

          const depLat = to.transit_departure_lat || from.latitude
          const depLng = to.transit_departure_lng || from.longitude
          const depName = to.transit_departure_name || from.name

          const arrLat = to.transit_lat || to.latitude
          const arrLng = to.transit_lng || to.longitude
          const arrName = to.transit_name || to.name

          // 1. Route en voiture de la ville de départ vers le point de transit départ
          const driveToTransit = await getDrivingRoute(from.latitude, from.longitude, depLat, depLng)
          if (driveToTransit.distance && driveToTransit.distance > 1) {
            newSegments.push({
              coords: driveToTransit.coords,
              mode: driveToTransit.mode,
              label: `${from.name} → ${depName}`,
              duration: driveToTransit.duration,
              distance: driveToTransit.distance,
            })
          }

          // 2. Ligne pointillée entre les deux points transit (vol ou ferry)
          const distance = calcDistance(depLat, depLng, arrLat, arrLng)
          const duration = mode === 'plane' ? Math.round(distance / 800 * 60) : Math.round(distance / 30 * 60)
          newSegments.push({
            coords: [[depLat, depLng], [arrLat, arrLng]],
            mode,
            label: `${depName} → ${arrName}`,
            duration,
            distance,
          })

          // 3. Route en voiture depuis le point transit arrivée vers la ville de destination
          const driveFromTransit = await getDrivingRoute(arrLat, arrLng, to.latitude, to.longitude)
          if (driveFromTransit.distance && driveFromTransit.distance > 1) {
            newSegments.push({
              coords: driveFromTransit.coords,
              mode: driveFromTransit.mode,
              label: `${arrName} → ${to.name}`,
              duration: driveFromTransit.duration,
              distance: driveFromTransit.distance,
            })
          }

          newMarkers.push({ lat: depLat, lng: depLng, name: depName, emoji })
          newMarkers.push({ lat: arrLat, lng: arrLng, name: arrName, emoji })

        } else {
          // Route terrestre directe
          const route = await getDrivingRoute(from.latitude, from.longitude, to.latitude, to.longitude)
          newSegments.push({
            coords: route.coords,
            mode: route.mode,
            label: `${from.name} → ${to.name}`,
            duration: route.duration,
            distance: route.distance,
          })
        }
      }

      setSegments(newSegments)
      setTransitMarkers(newMarkers)
    }

    fetchSegments()
  }, [steps])

  const modeEmoji: Record<string, string> = { driving: '🚗', plane: '✈️', ferry: '⛴️' }
  const modeColor: Record<string, string> = { driving: '#2563eb', plane: '#7c3aed', ferry: '#0891b2' }

  return (
    <div>
      {segments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '1rem 1rem 0' }}>
          {segments.map((seg, i) => (
            <div key={i} style={{
              background: '#f7f4ef', border: '1px solid #e8e0d0',
              borderRadius: '8px', padding: '0.5rem 0.85rem',
              fontSize: '0.78rem', color: '#1a1612',
            }}>
              <span style={{ marginRight: '0.4rem' }}>{modeEmoji[seg.mode] || '🚗'}</span>
              <strong>{seg.label}</strong>
              {seg.distance && seg.duration && (
                <span style={{ color: '#8a8070', marginLeft: '0.4rem' }}>
                  {seg.distance} km · {seg.duration >= 60
                    ? `${Math.floor(seg.duration / 60)}h${seg.duration % 60 > 0 ? seg.duration % 60 + 'min' : ''}`
                    : `${seg.duration} min`}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <MapContainer
        center={[46.603354, 1.888334]}
        zoom={5}
        style={{ height: '450px', width: '100%' }}
      >
        <TileLayer
          attribution='© OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds steps={steps} />

        {steps.map((step, index) => (
          <Marker key={step.id} position={[step.latitude, step.longitude]}>
            <Popup><strong>{index + 1}. {step.name}</strong></Popup>
          </Marker>
        ))}

        {transitMarkers.map((marker, i) => (
          <Marker key={`transit-${i}`} position={[marker.lat, marker.lng]} icon={transitIcon(marker.emoji)}>
            <Popup><strong>{marker.name}</strong></Popup>
          </Marker>
        ))}

        {segments.map((seg, i) => (
          <Polyline
            key={i}
            positions={seg.coords}
            color={modeColor[seg.mode] || '#2563eb'}
            weight={seg.mode === 'driving' ? 4 : 3}
            dashArray={seg.mode !== 'driving' ? '10, 10' : undefined}
          />
        ))}
      </MapContainer>
    </div>
  )
}