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

interface Step {
  id: string
  name: string
  latitude: number
  longitude: number
}

interface RouteInfo {
  duration: number
  distance: number
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

export default function Map({ steps }: MapProps) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([])
  const [routeInfos, setRouteInfos] = useState<RouteInfo[]>([])

  useEffect(() => {
    if (steps.length < 2) {
      setRouteCoords([])
      setRouteInfos([])
      return
    }

    const fetchRoute = async () => {
      const coords = steps.map(s => `${s.longitude},${s.latitude}`).join(';')
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`
      )
      const data = await res.json()

      if (data.code !== 'Ok') return

      const route = data.routes[0]
      const geojsonCoords = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
      )
      setRouteCoords(geojsonCoords)

      const infos: RouteInfo[] = route.legs.map((leg: any) => ({
        duration: Math.round(leg.duration / 60),
        distance: Math.round(leg.distance / 1000),
      }))
      setRouteInfos(infos)
    }

    fetchRoute()
  }, [steps])

  return (
    <div>
      {routeInfos.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {routeInfos.map((info, index) => (
            <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
              <span className="font-medium text-blue-700">
                {steps[index].name} → {steps[index + 1].name}
              </span>
              <span className="text-blue-500 ml-2">
                {info.distance} km · {info.duration} min
              </span>
            </div>
          ))}
        </div>
      )}

      <MapContainer
        center={[46.603354, 1.888334]}
        zoom={5}
        style={{ height: '400px', width: '100%', borderRadius: '12px' }}
      >
        <TileLayer
          attribution='© OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds steps={steps} />

        {steps.map((step, index) => (
          <Marker key={step.id} position={[step.latitude, step.longitude]}>
            <Popup>
              <strong>{index + 1}. {step.name}</strong>
            </Popup>
          </Marker>
        ))}

        {routeCoords.length > 0 && (
          <Polyline positions={routeCoords} color="blue" weight={4} />
        )}
      </MapContainer>
    </div>
  )
}