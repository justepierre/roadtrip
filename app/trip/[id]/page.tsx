'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'

const Map = dynamic(() => import('@/app/components/map'), { ssr: false })

interface Trip {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  budget: number
  cover_image: string
}

interface Step {
  id: string
  name: string
  latitude: number
  longitude: number
  order_index: number
  transport_mode: string
  transit_lat?: number
  transit_lng?: number
  transit_name?: string
  transit_departure_lat?: number
  transit_departure_lng?: number
  transit_departure_name?: string
}

interface Expense {
  id: string
  step_id: string
  label: string
  amount: number
  category: string
}

const CDG = { lat: 49.0097, lng: 2.5479, name: 'Aéroport Paris CDG' }

const MAJOR_AIRPORTS = [
  { lat: -8.7482, lng: 115.1675, name: 'Bali Ngurah Rai Airport' },
  { lat: -6.1256, lng: 106.6559, name: 'Jakarta Soekarno-Hatta Airport' },
  { lat: 3.5917, lng: 98.8910, name: 'Medan Kualanamu Airport' },
  { lat: 14.5086, lng: 121.0194, name: 'Manila Ninoy Aquino Airport' },
  { lat: -33.9249, lng: 18.4241, name: 'Cape Town International Airport' },
  { lat: 59.6498, lng: 17.9238, name: 'Stockholm Arlanda Airport' },
  { lat: 59.9139, lng: 10.7522, name: 'Oslo Gardermoen Airport' },
  { lat: 55.6180, lng: 12.6560, name: 'Copenhagen Airport' },
  { lat: 60.3196, lng: 24.9633, name: 'Helsinki Vantaa Airport' },
  { lat: 48.1103, lng: 16.5697, name: 'Vienna International Airport' },
  { lat: 50.1008, lng: 14.2600, name: 'Prague Vaclav Havel Airport' },
  { lat: 52.1657, lng: 20.9671, name: 'Warsaw Chopin Airport' },
  { lat: -34.8222, lng: -56.0308, name: 'Montevideo Carrasco Airport' },
  { lat: -12.0219, lng: -77.1143, name: 'Lima Jorge Chavez Airport' },
  { lat: -0.1292, lng: -78.3576, name: 'Quito Mariscal Sucre Airport' },
  { lat: 33.3675, lng: 44.2353, name: 'Baghdad International Airport' },
  { lat: 35.4161, lng: 50.8520, name: 'Tehran Imam Khomeini Airport' },
  { lat: 24.4331, lng: 54.6511, name: 'Abu Dhabi International Airport' },
  { lat: 26.2710, lng: 50.6337, name: 'Bahrain International Airport' },
  { lat: -1.3192, lng: 36.9275, name: 'Nairobi Jomo Kenyatta Airport' },
  { lat: 6.5774, lng: 3.3215, name: 'Lagos Murtala Muhammed Airport' },
  { lat: 40.6413, lng: -73.7781, name: 'JFK International Airport' },
  { lat: 33.9425, lng: -118.4081, name: 'LAX International Airport' },
  { lat: 41.9742, lng: -87.9073, name: "O'Hare International Airport" },
  { lat: 25.7959, lng: -80.2870, name: 'Miami International Airport' },
  { lat: 43.6777, lng: -79.6248, name: 'Toronto Pearson Airport' },
  { lat: 45.4706, lng: -73.7408, name: 'Montréal-Trudeau Airport' },
  { lat: 51.4700, lng: -0.4543, name: 'London Heathrow Airport' },
  { lat: 40.4983, lng: -3.5676, name: 'Madrid Barajas Airport' },
  { lat: 41.2971, lng: 2.0785, name: 'Barcelona El Prat Airport' },
  { lat: 52.3105, lng: 4.7683, name: 'Amsterdam Schiphol Airport' },
  { lat: 50.0379, lng: 8.5622, name: 'Frankfurt Airport' },
  { lat: 52.3667, lng: 13.5033, name: 'Berlin Brandenburg Airport' },
  { lat: 41.8003, lng: 12.2389, name: 'Rome Fiumicino Airport' },
  { lat: 45.6306, lng: 8.7281, name: 'Milan Malpensa Airport' },
  { lat: 35.7720, lng: 140.3929, name: 'Tokyo Narita Airport' },
  { lat: 34.4320, lng: 135.2304, name: 'Osaka Kansai Airport' },
  { lat: 40.0801, lng: 116.5846, name: 'Beijing Capital Airport' },
  { lat: 31.1443, lng: 121.8083, name: 'Shanghai Pudong Airport' },
  { lat: 25.2532, lng: 55.3657, name: 'Dubai International Airport' },
  { lat: 1.3644, lng: 103.9915, name: 'Singapore Changi Airport' },
  { lat: -33.9399, lng: 151.1753, name: 'Sydney Airport' },
  { lat: -37.6690, lng: 144.8410, name: 'Melbourne Airport' },
  { lat: -23.4356, lng: -46.4731, name: 'São Paulo Guarulhos Airport' },
  { lat: -34.8222, lng: -58.5358, name: 'Buenos Aires Ezeiza Airport' },
  { lat: 19.4363, lng: -99.0721, name: 'Mexico City Airport' },
  { lat: -26.1392, lng: 28.2460, name: 'Johannesburg OR Tambo Airport' },
  { lat: 30.1219, lng: 31.4056, name: 'Cairo International Airport' },
  { lat: 41.2753, lng: 28.7519, name: 'Istanbul Airport' },
  { lat: 55.9736, lng: 37.4125, name: 'Moscow Sheremetyevo Airport' },
  { lat: 13.6900, lng: 100.7501, name: 'Bangkok Suvarnabhumi Airport' },
  { lat: 22.3080, lng: 113.9185, name: 'Hong Kong International Airport' },
  { lat: 37.4602, lng: 126.4407, name: 'Seoul Incheon Airport' },
  { lat: 19.0896, lng: 72.8656, name: 'Mumbai Chhatrapati Shivaji Airport' },
  { lat: 28.5562, lng: 77.1000, name: 'Delhi Indira Gandhi Airport' },
  { lat: 2.7456, lng: 101.7099, name: 'Kuala Lumpur International Airport' },
]

async function findNearestAirport(cityName: string): Promise<{ lat: number, lng: number, name: string } | null> {
  const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1&addressdetails=1`)
  const geoData = await geoRes.json()
  if (!geoData.length) return null

  const countryCode = geoData[0].address?.country_code?.toLowerCase()
  if (countryCode === 'fr') return CDG

  const cityLat = parseFloat(geoData[0].lat)
  const cityLng = parseFloat(geoData[0].lon)

  let nearest = null
  let minDist = Infinity

  for (const airport of MAJOR_AIRPORTS) {
    const dist = Math.sqrt(Math.pow(airport.lat - cityLat, 2) + Math.pow(airport.lng - cityLng, 2))
    if (dist < minDist) { minDist = dist; nearest = airport }
  }

  return nearest
}

async function findNearestFerryTerminal(cityName: string): Promise<{ lat: number, lng: number, name: string } | null> {
  const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`)
  const geoData = await geoRes.json()
  if (!geoData.length) return null

  const lat = parseFloat(geoData[0].lat)
  const lng = parseFloat(geoData[0].lon)

  const query = `[out:json][timeout:10];(node["amenity"="ferry_terminal"](around:100000,${lat},${lng});way["amenity"="ferry_terminal"](around:100000,${lat},${lng}););out center 5;`
  try {
    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query })
    const overpassData = await overpassRes.json()
    if (overpassData.elements?.length > 0) {
      const t = overpassData.elements[0]
      return { lat: t.lat || t.center?.lat, lng: t.lon || t.center?.lon, name: t.tags?.name || 'Terminal ferry' }
    }
  } catch {}
  return null
}

function TripPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showStepForm, setShowStepForm] = useState(false)
  const [stepName, setStepName] = useState('')
  const [transportMode, setTransportMode] = useState('driving')
  const [addingStep, setAddingStep] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeStepId, setActiveStepId] = useState<string | null>(null)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editingStepName, setEditingStepName] = useState('')
  const [editingTransportMode, setEditingTransportMode] = useState('driving')
  const [expenseLabel, setExpenseLabel] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('transport')
  const [pickMode, setPickMode] = useState(false)
  const [pickedCoords, setPickedCoords] = useState<{ lat: number, lng: number } | null>(null)

  const fetchTrip = async () => {
    const { data } = await supabase.from('trips').select('*').eq('id', id).single()
    setTrip(data)
  }

  const fetchSteps = async () => {
    const { data } = await supabase.from('steps').select('*').eq('trip_id', id).order('order_index', { ascending: true })
    setSteps(data || [])
    setLoading(false)
  }

  const fetchExpenses = async () => {
    const stepIds = steps.map(s => s.id)
    if (stepIds.length === 0) return
    const { data } = await supabase.from('expenses').select('*').in('step_id', stepIds)
    setExpenses(data || [])
  }

  const addStep = async () => {
    if (!stepName || addingStep) return
    setAddingStep(true)

    let finalLat: number
    let finalLng: number

    if (pickedCoords) {
      finalLat = pickedCoords.lat
      finalLng = pickedCoords.lng
    } else {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(stepName)}&format=json&limit=1`)
      const geo = await res.json()
      if (!geo || geo.length === 0) { alert('Ville introuvable'); setAddingStep(false); return }
      finalLat = parseFloat(geo[0].lat)
      finalLng = parseFloat(geo[0].lon)
    }

    let transitLat = null, transitLng = null, transitName = null
    let transitDepartureLat = null, transitDepartureLng = null, transitDepartureName = null

    if (transportMode === 'plane') {
      transitDepartureLat = CDG.lat
      transitDepartureLng = CDG.lng
      transitDepartureName = CDG.name
      const arrAirport = await findNearestAirport(stepName)
      if (arrAirport) { transitLat = arrAirport.lat; transitLng = arrAirport.lng; transitName = arrAirport.name }
    }

    if (transportMode === 'ferry') {
      const arrTerminal = await findNearestFerryTerminal(stepName)
      if (arrTerminal) { transitLat = arrTerminal.lat; transitLng = arrTerminal.lng; transitName = arrTerminal.name }
      if (steps.length > 0) {
        const prevStep = steps[steps.length - 1]
        const depTerminal = await findNearestFerryTerminal(prevStep.name)
        if (depTerminal) { transitDepartureLat = depTerminal.lat; transitDepartureLng = depTerminal.lng; transitDepartureName = depTerminal.name }
      }
    }

    await supabase.from('steps').insert({
      trip_id: id, name: stepName,
      latitude: finalLat, longitude: finalLng,
      order_index: steps.length, transport_mode: transportMode,
      transit_lat: transitLat, transit_lng: transitLng, transit_name: transitName,
      transit_departure_lat: transitDepartureLat, transit_departure_lng: transitDepartureLng, transit_departure_name: transitDepartureName,
    })

    setStepName('')
    setTransportMode('driving')
    setShowStepForm(false)
    setAddingStep(false)
    setPickedCoords(null)
    setPickMode(false)
    fetchSteps()
  }

  const updateStep = async (stepId: string) => {
    if (!editingStepName || addingStep) return
    setAddingStep(true)

    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(editingStepName)}&format=json&limit=1`)
    const geo = await res.json()
    if (!geo || geo.length === 0) { alert('Ville introuvable'); setAddingStep(false); return }

    let transitLat = null, transitLng = null, transitName = null
    let transitDepartureLat = null, transitDepartureLng = null, transitDepartureName = null

    if (editingTransportMode === 'plane') {
      transitDepartureLat = CDG.lat
      transitDepartureLng = CDG.lng
      transitDepartureName = CDG.name
      const arrAirport = await findNearestAirport(editingStepName)
      if (arrAirport) { transitLat = arrAirport.lat; transitLng = arrAirport.lng; transitName = arrAirport.name }
    }

    if (editingTransportMode === 'ferry') {
      const arrTerminal = await findNearestFerryTerminal(editingStepName)
      if (arrTerminal) { transitLat = arrTerminal.lat; transitLng = arrTerminal.lng; transitName = arrTerminal.name }
      const stepIndex = steps.findIndex(s => s.id === stepId)
      if (stepIndex > 0) {
        const prevStep = steps[stepIndex - 1]
        const depTerminal = await findNearestFerryTerminal(prevStep.name)
        if (depTerminal) { transitDepartureLat = depTerminal.lat; transitDepartureLng = depTerminal.lng; transitDepartureName = depTerminal.name }
      }
    }

    await supabase.from('steps').update({
      name: editingStepName,
      latitude: parseFloat(geo[0].lat), longitude: parseFloat(geo[0].lon),
      transport_mode: editingTransportMode,
      transit_lat: transitLat, transit_lng: transitLng, transit_name: transitName,
      transit_departure_lat: transitDepartureLat, transit_departure_lng: transitDepartureLng, transit_departure_name: transitDepartureName,
    }).eq('id', stepId)

    setEditingStepId(null)
    setEditingStepName('')
    setEditingTransportMode('driving')
    setAddingStep(false)
    fetchSteps()
  }

  const deleteStep = async (stepId: string) => {
    if (!confirm('Supprimer cette étape ? Les dépenses associées seront aussi supprimées.')) return
    await supabase.from('steps').delete().eq('id', stepId)
    fetchSteps()
  }

  const addExpense = async (stepId: string) => {
    if (!expenseLabel || !expenseAmount) return
    await supabase.from('expenses').insert({
      step_id: stepId, label: expenseLabel,
      amount: parseFloat(expenseAmount),
      category: expenseCategory,
    })
    setExpenseLabel('')
    setExpenseAmount('')
    setExpenseCategory('transport')
    setActiveStepId(null)
    fetchExpenses()
  }

  const deleteExpense = async (expenseId: string) => {
    await supabase.from('expenses').delete().eq('id', expenseId)
    fetchExpenses()
  }

  const totalBudget = expenses.reduce((sum, e) => sum + e.amount, 0)
  const budgetPercent = trip?.budget ? Math.min((totalBudget / trip.budget) * 100, 100) : 0
  const budgetRestant = trip?.budget ? trip.budget - totalBudget : 0
  const barColor = budgetPercent > 90 ? '#c07060' : budgetPercent > 70 ? '#d4af37' : '#6a9e7f'

  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount
    return acc
  }, {} as Record<string, number>)

  useEffect(() => { if (id) { fetchTrip(); fetchSteps() } }, [id])
  useEffect(() => { if (steps.length > 0) fetchExpenses() }, [steps])

  const categoryEmoji: Record<string, string> = {
    transport: '🚗', hébergement: '🏨', nourriture: '🍽️', activités: '🎯', autre: '💼'
  }

  const modeEmoji: Record<string, string> = {
    driving: '🚗', plane: '✈️', ferry: '⛴️'
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; background: #f7f4ef; color: #1a1612; }
        .trip-page { min-height: 100vh; }

        .trip-hero { position: relative; height: 280px; background: #1a1612; overflow: hidden; }
        .trip-hero-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.5; }
        .trip-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%);
          display: flex; flex-direction: column;
          justify-content: space-between; padding: 1.5rem 3rem;
        }

        .navbar { display: flex; align-items: center; justify-content: space-between; }
        .nav-logo {
          font-family: 'Playfair Display', serif; font-size: 1.1rem;
          letter-spacing: 0.2em; text-transform: uppercase; color: #d4af37; cursor: pointer;
        }
        .btn-back {
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
          color: #fff; padding: 0.5rem 1rem; border-radius: 4px;
          font-family: 'DM Sans', sans-serif; font-size: 0.8rem;
          cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px);
        }
        .btn-back:hover { background: rgba(255,255,255,0.2); }

        .trip-title {
          font-family: 'Playfair Display', serif; font-size: 2.75rem;
          color: #fff; line-height: 1.1; margin-bottom: 0.4rem;
        }
        .trip-desc { font-size: 0.9rem; color: rgba(255,255,255,0.7); }
        .trip-content { max-width: 1100px; margin: 0 auto; padding: 2rem 3rem; }

        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
        .stat-card { background: #fff; border: 1px solid #e8e0d0; border-radius: 8px; padding: 1.25rem; }
        .stat-label { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: #8a8070; margin-bottom: 0.4rem; }
        .stat-value { font-family: 'Playfair Display', serif; font-size: 1.75rem; color: #1a1612; }
        .stat-value.gold { color: #d4af37; }
        .stat-value.green { color: #6a9e7f; }
        .stat-value.red { color: #c07060; }

        .budget-section { background: #fff; border: 1px solid #e8e0d0; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; }
        .budget-section-title { font-family: 'Playfair Display', serif; font-size: 1.1rem; margin-bottom: 1.25rem; }
        .budget-bar-track { height: 8px; background: #f0ebe0; border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem; }
        .budget-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
        .budget-bar-labels { display: flex; justify-content: space-between; font-size: 0.8rem; color: #8a8070; }

        .category-grid {
          display: grid; grid-template-columns: repeat(5, 1fr);
          gap: 0.75rem; margin-top: 1.25rem;
          padding-top: 1.25rem; border-top: 1px solid #f0ebe0;
        }
        .category-item { text-align: center; }
        .category-emoji { font-size: 1.25rem; margin-bottom: 0.25rem; }
        .category-name { font-size: 0.7rem; color: #8a8070; margin-bottom: 0.2rem; text-transform: capitalize; }
        .category-amount { font-size: 0.85rem; font-weight: 500; color: #1a1612; }

        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
        .section-title { font-family: 'Playfair Display', serif; font-size: 1.5rem; }

        .btn-primary {
          background: #0a0a0a; color: #f5f0e8; border: none;
          padding: 0.75rem 1.5rem; border-radius: 4px;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem;
          font-weight: 500; cursor: pointer; transition: all 0.2s; letter-spacing: 0.05em;
        }
        .btn-primary:hover { background: #d4af37; color: #0a0a0a; }
        .btn-primary:disabled { background: #8a8070; cursor: not-allowed; }

        .form-card { background: #fff; border: 1px solid #e8e0d0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }

        .form-input {
          width: 100%; background: #f7f4ef; border: 1px solid #e8e0d0;
          border-radius: 4px; padding: 0.75rem 1rem;
          font-family: 'DM Sans', sans-serif; font-size: 0.9rem;
          color: #1a1612; outline: none; transition: border-color 0.2s; margin-bottom: 0.75rem;
        }
        .form-input:focus { border-color: #d4af37; background: #fff; }
        .form-actions { display: flex; gap: 0.75rem; margin-top: 0.75rem; }

        .btn-secondary {
          background: transparent; border: 1px solid #e8e0d0; color: #8a8070;
          padding: 0.75rem 1.5rem; border-radius: 4px;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
        }
        .btn-secondary:hover { border-color: #1a1612; color: #1a1612; }

        .transport-selector { margin-bottom: 0.75rem; }
        .transport-label { font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: #8a8070; display: block; margin-bottom: 0.5rem; }
        .transport-options { display: flex; gap: 0.75rem; }
        .loading-indicator { font-size: 0.85rem; color: #8a8070; font-style: italic; margin-top: 0.5rem; }

        .map-section { margin-bottom: 2rem; border-radius: 12px; overflow: hidden; border: 1px solid #e8e0d0; }

        .steps-list { display: flex; flex-direction: column; gap: 1rem; }
        .step-card { background: #fff; border: 1px solid #e8e0d0; border-radius: 8px; overflow: hidden; transition: border-color 0.2s; }
        .step-card:hover { border-color: #d4af37; }

        .step-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; }
        .step-left { display: flex; align-items: center; gap: 1rem; }
        .step-number {
          width: 32px; height: 32px; background: #0a0a0a; color: #d4af37;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 500; flex-shrink: 0;
        }
        .step-name { font-family: 'Playfair Display', serif; font-size: 1.15rem; color: #1a1612; }
        .step-mode { font-size: 0.75rem; color: #8a8070; margin-top: 0.2rem; }
        .step-right { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; justify-content: flex-end; }
        .step-total { font-size: 0.9rem; font-weight: 500; color: #d4af37; }

        .btn-add-expense {
          background: #f7f4ef; border: 1px solid #e8e0d0; color: #1a1612;
          padding: 0.4rem 0.85rem; border-radius: 4px;
          font-family: 'DM Sans', sans-serif; font-size: 0.75rem; cursor: pointer; transition: all 0.2s;
        }
        .btn-add-expense:hover { background: #0a0a0a; color: #d4af37; border-color: #0a0a0a; }

        .btn-delete-step { background: transparent; border: none; color: #c0a090; font-size: 0.75rem; cursor: pointer; padding: 0.4rem; transition: color 0.2s; }
        .btn-delete-step:hover { color: #c07060; }

        .expense-form { background: #f7f4ef; padding: 1.25rem 1.5rem; border-top: 1px solid #e8e0d0; }
        .expense-form-row { display: flex; gap: 0.75rem; margin-bottom: 0.75rem; }

        .form-select {
          background: #fff; border: 1px solid #e8e0d0; border-radius: 4px;
          padding: 0.75rem 1rem; font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem; color: #1a1612; outline: none; flex: 1;
        }

        .btn-add {
          background: #0a0a0a; color: #f5f0e8; border: none;
          padding: 0.75rem 1.25rem; border-radius: 4px;
          font-family: 'DM Sans', sans-serif; font-size: 0.8rem;
          cursor: pointer; transition: all 0.2s; white-space: nowrap;
        }
        .btn-add:hover { background: #d4af37; color: #0a0a0a; }

        .expenses-list { padding: 0 1.5rem 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .expense-item { display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; background: #f7f4ef; border-radius: 4px; }
        .expense-left { display: flex; align-items: center; gap: 0.6rem; }
        .expense-emoji { font-size: 0.9rem; }
        .expense-label { font-size: 0.85rem; color: #1a1612; }
        .expense-right { display: flex; align-items: center; gap: 0.75rem; }
        .expense-amount { font-size: 0.85rem; font-weight: 500; color: #1a1612; }

        .btn-delete-expense { background: transparent; border: none; color: #c0a090; font-size: 0.7rem; cursor: pointer; transition: color 0.2s; padding: 0.2rem; }
        .btn-delete-expense:hover { color: #c07060; }

        .empty-state { text-align: center; padding: 4rem 2rem; color: #8a8070; }
        .empty-title { font-family: 'Playfair Display', serif; font-size: 1.75rem; color: #1a1612; margin-bottom: 0.5rem; }
      `}</style>

      <div className="trip-page">
        {trip && (
          <>
            <div className="trip-hero">
              {trip.cover_image && <img src={trip.cover_image} alt={trip.name} className="trip-hero-img" />}
              <div className="trip-hero-overlay">
                <nav className="navbar">
                  <div className="nav-logo" onClick={() => router.push('/dashboard')}>Roadtrip</div>
                  <button className="btn-back" onClick={() => router.push('/dashboard')}>← Mes voyages</button>
                </nav>
                <div>
                  <h1 className="trip-title">{trip.name}</h1>
                  {trip.description && <p className="trip-desc">{trip.description}</p>}
                </div>
              </div>
            </div>

            <div className="trip-content">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Étapes</div>
                  <div className="stat-value">{steps.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Dépensé</div>
                  <div className="stat-value gold">{totalBudget.toFixed(0)} €</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Budget restant</div>
                  <div className={`stat-value ${budgetRestant < 0 ? 'red' : 'green'}`}>
                    {trip.budget > 0 ? `${budgetRestant.toFixed(0)} €` : '—'}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Budget prévu</div>
                  <div className="stat-value">{trip.budget > 0 ? `${trip.budget} €` : '—'}</div>
                </div>
              </div>

              {trip.budget > 0 && (
                <div className="budget-section">
                  <div className="budget-section-title">Suivi du budget</div>
                  <div className="budget-bar-track">
                    <div className="budget-bar-fill" style={{ width: `${budgetPercent}%`, background: barColor }} />
                  </div>
                  <div className="budget-bar-labels">
                    <span>{totalBudget.toFixed(0)} € dépensés</span>
                    <span>{budgetPercent.toFixed(0)}% du budget</span>
                    <span>{trip.budget} € prévu</span>
                  </div>
                  {Object.keys(categoryTotals).length > 0 && (
                    <div className="category-grid">
                      {Object.entries(categoryTotals).map(([cat, amount]) => (
                        <div key={cat} className="category-item">
                          <div className="category-emoji">{categoryEmoji[cat] || '💼'}</div>
                          <div className="category-name">{cat}</div>
                          <div className="category-amount">{amount.toFixed(0)} €</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="section-header">
                <h2 className="section-title">Itinéraire</h2>
                <button className="btn-primary" onClick={() => { setShowStepForm(!showStepForm); setPickMode(false); setPickedCoords(null) }}>
                  + Ajouter une étape
                </button>
              </div>

              {/* Carte toujours visible, avec pickMode si le formulaire est ouvert */}
              <div className="map-section">
                <Map
                  steps={steps}
                  pickMode={pickMode}
                  onPick={(lat, lng, name) => {
                    setStepName(name)
                    setPickedCoords({ lat, lng })
                    setPickMode(false)
                    setShowStepForm(true)
                  }}
                />
              </div>

              {showStepForm && (
                <div className="form-card">
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Nom de la ville (ex: Paris, New York...)"
                    value={stepName}
                    onChange={e => { setStepName(e.target.value); setPickedCoords(null) }}
                    onKeyDown={e => e.key === 'Enter' && addStep()}
                  />
                  <button
                    type="button"
                    onClick={() => setPickMode(p => !p)}
                    style={{
                      width: '100%', padding: '0.75rem', marginBottom: '0.75rem',
                      background: pickMode ? '#d4af37' : '#f7f4ef',
                      color: pickMode ? '#0a0a0a' : '#8a8070',
                      border: `1px solid ${pickMode ? '#d4af37' : '#e8e0d0'}`,
                      borderRadius: '4px', fontFamily: 'DM Sans, sans-serif',
                      fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    {pickMode ? '✓ Mode placement activé — cliquez sur la carte ci-dessus' : '📍 Ou placer sur la carte'}
                  </button>
                  {pickedCoords && (
                    <div style={{ fontSize: '0.8rem', color: '#6a9e7f', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                      ✓ Point placé : {stepName} ({pickedCoords.lat.toFixed(4)}, {pickedCoords.lng.toFixed(4)})
                    </div>
                  )}
                  <div className="transport-selector">
                    <label className="transport-label">Mode de transport pour rejoindre cette étape</label>
                    <div className="transport-options">
                      {[
                        { value: 'driving', label: '🚗 Route' },
                        { value: 'plane', label: '✈️ Avion' },
                        { value: 'ferry', label: '⛴️ Ferry' },
                      ].map(mode => (
                        <button
                          key={mode.value}
                          onClick={() => setTransportMode(mode.value)}
                          style={{
                            padding: '0.6rem 1.25rem', borderRadius: '4px',
                            border: `1px solid ${transportMode === mode.value ? '#0a0a0a' : '#e8e0d0'}`,
                            background: transportMode === mode.value ? '#0a0a0a' : '#f7f4ef',
                            color: transportMode === mode.value ? '#d4af37' : '#8a8070',
                            fontFamily: 'DM Sans, sans-serif', fontSize: '0.85rem',
                            cursor: 'pointer', transition: 'all 0.2s',
                          }}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {addingStep && <p className="loading-indicator">🔍 Recherche en cours...</p>}
                  <div className="form-actions">
                    <button className="btn-primary" onClick={addStep} disabled={addingStep}>
                      {addingStep ? 'Recherche...' : 'Ajouter'}
                    </button>
                    <button className="btn-secondary" onClick={() => { setShowStepForm(false); setPickMode(false); setPickedCoords(null) }}>Annuler</button>
                  </div>
                </div>
              )}

              {loading ? (
                <p style={{ color: '#8a8070' }}>Chargement...</p>
              ) : steps.length === 0 ? (
                <div className="empty-state">
                  <h2 className="empty-title">Aucune étape pour l'instant</h2>
                  <p>Ajoute ta première destination pour commencer l'itinéraire.</p>
                </div>
              ) : (
                <div className="steps-list">
                  {steps.map((step, index) => {
                    const stepExpenses = expenses.filter(e => e.step_id === step.id)
                    const stepTotal = stepExpenses.reduce((sum, e) => sum + e.amount, 0)

                    return (
                      <div key={step.id} className="step-card">
                        <div className="step-header">
                          <div className="step-left">
                            <div className="step-number">{index + 1}</div>
                            <div>
                              <div className="step-name">{step.name}</div>
                              {step.transport_mode && step.transport_mode !== 'driving' && (
                                <div className="step-mode">
                                  {modeEmoji[step.transport_mode]} {step.transport_mode === 'plane' ? 'Avion' : 'Ferry'}
                                  {step.transit_departure_name && ` · ${step.transit_departure_name}`}
                                  {step.transit_departure_name && step.transit_name && ' → '}
                                  {step.transit_name && `${step.transit_name}`}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="step-right">
                            {stepTotal > 0 && <span className="step-total">{stepTotal.toFixed(0)} €</span>}
                            <button className="btn-add-expense" onClick={() => setActiveStepId(activeStepId === step.id ? null : step.id)}>
                              + Dépense
                            </button>
                            <button className="btn-add-expense" onClick={() => {
                              setEditingStepId(step.id)
                              setEditingStepName(step.name)
                              setEditingTransportMode(step.transport_mode || 'driving')
                            }}>
                              ✏ Modifier
                            </button>
                            <button className="btn-delete-step" onClick={() => deleteStep(step.id)}>✕</button>
                          </div>
                        </div>

                        {editingStepId === step.id && (
                          <div className="expense-form">
                            <input
                              className="form-input"
                              type="text"
                              placeholder="Nouveau nom de ville..."
                              value={editingStepName}
                              onChange={e => setEditingStepName(e.target.value)}
                            />
                            <div className="transport-selector" style={{ marginBottom: '0.75rem' }}>
                              <label className="transport-label">Mode de transport</label>
                              <div className="transport-options">
                                {[
                                  { value: 'driving', label: '🚗 Route' },
                                  { value: 'plane', label: '✈️ Avion' },
                                  { value: 'ferry', label: '⛴️ Ferry' },
                                ].map(mode => (
                                  <button
                                    key={mode.value}
                                    onClick={() => setEditingTransportMode(mode.value)}
                                    style={{
                                      padding: '0.4rem 0.85rem', borderRadius: '4px',
                                      border: `1px solid ${editingTransportMode === mode.value ? '#0a0a0a' : '#e8e0d0'}`,
                                      background: editingTransportMode === mode.value ? '#0a0a0a' : '#fff',
                                      color: editingTransportMode === mode.value ? '#d4af37' : '#8a8070',
                                      fontFamily: 'DM Sans, sans-serif', fontSize: '0.75rem',
                                      cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                  >
                                    {mode.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {addingStep && <p style={{ fontSize: '0.8rem', color: '#8a8070', fontStyle: 'italic', marginBottom: '0.5rem' }}>🔍 Recherche en cours...</p>}
                            <div className="form-actions">
                              <button className="btn-primary" onClick={() => updateStep(step.id)} disabled={addingStep}>
                                {addingStep ? 'Recherche...' : 'Enregistrer'}
                              </button>
                              <button className="btn-secondary" onClick={() => setEditingStepId(null)}>Annuler</button>
                            </div>
                          </div>
                        )}

                        {activeStepId === step.id && (
                          <div className="expense-form">
                            <input
                              className="form-input"
                              type="text"
                              placeholder="Libellé (ex: Hôtel, Essence...)"
                              value={expenseLabel}
                              onChange={e => setExpenseLabel(e.target.value)}
                            />
                            <div className="expense-form-row">
                              <input
                                className="form-input"
                                style={{ margin: 0, flex: 1 }}
                                type="number"
                                placeholder="Montant (€)"
                                value={expenseAmount}
                                onChange={e => setExpenseAmount(e.target.value)}
                              />
                              <select className="form-select" value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)}>
                                <option value="transport">🚗 Transport</option>
                                <option value="hébergement">🏨 Hébergement</option>
                                <option value="nourriture">🍽️ Nourriture</option>
                                <option value="activités">🎯 Activités</option>
                                <option value="autre">💼 Autre</option>
                              </select>
                              <button className="btn-add" onClick={() => addExpense(step.id)}>Ajouter</button>
                            </div>
                          </div>
                        )}

                        {stepExpenses.length > 0 && (
                          <div className="expenses-list">
                            {stepExpenses.map(expense => (
                              <div key={expense.id} className="expense-item">
                                <div className="expense-left">
                                  <span className="expense-emoji">{categoryEmoji[expense.category] || '💼'}</span>
                                  <span className="expense-label">{expense.label}</span>
                                </div>
                                <div className="expense-right">
                                  <span className="expense-amount">{expense.amount.toFixed(2)} €</span>
                                  <button className="btn-delete-expense" onClick={() => deleteExpense(expense.id)}>✕</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default TripPage