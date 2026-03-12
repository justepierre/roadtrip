'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const Map = dynamic(() => import('@/app/components/map'), { ssr: false })

interface Trip {
  id: string; name: string; description: string
  start_date: string; end_date: string; budget: number; cover_image: string
}

interface Step {
  id: string; name: string; latitude: number; longitude: number
  order_index: number; transport_mode: string; completed: boolean
  transit_lat?: number; transit_lng?: number; transit_name?: string
  transit_departure_lat?: number; transit_departure_lng?: number; transit_departure_name?: string
}

interface Expense {
  id: string; step_id: string; label: string; amount: number; category: string
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
  let nearest = null, minDist = Infinity
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

function SortableStepCard({
  step, index, expenses, activeStepId, editingStepId, editingStepName,
  editingTransportMode, addingStep, expenseLabel, expenseAmount, expenseCategory,
  modeEmoji, categoryEmoji, weather,
  onToggleExpense, onStartEdit, onDelete, onToggleComplete,
  onEditNameChange, onEditModeChange, onUpdateStep, onCancelEdit,
  onExpenseLabelChange, onExpenseAmountChange, onExpenseCategoryChange,
  onAddExpense, onDeleteExpense,
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id })
  const stepExpenses = expenses.filter((e: Expense) => e.step_id === step.id)
  const stepTotal = stepExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0)
  const weatherEmoji = (code: number) => {
    if (code === 0) return '☀️'
    if (code <= 2) return '⛅'
    if (code <= 49) return '🌫️'
    if (code <= 67) return '🌧️'
    if (code <= 77) return '❄️'
    if (code <= 82) return '🌦️'
    return '⛈️'
  }
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="step-card"
    >
      <div className="step-header">
        <div className="step-left">
          {}
          <div
            {...attributes}
            {...listeners}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              color: '#c0b090', fontSize: '1rem',
              padding: '0 0.3rem', flexShrink: 0,
              touchAction: 'none', userSelect: 'none',
            }}
            title="Glisser pour réordonner"
          >
            ⠿
          </div>

          {}
          <div
            onClick={() => onToggleComplete(step.id, step.completed)}
            title={step.completed ? 'Marquer comme non complété' : 'Marquer comme complété'}
            style={{
              width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${step.completed ? '#6a9e7f' : '#e8e0d0'}`,
              background: step.completed ? '#6a9e7f' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              fontSize: '0.65rem', color: '#fff',
            }}
          >
            {step.completed ? '✓' : ''}
          </div>

          <div className="step-number">{index + 1}</div>
          <div style={{ minWidth: 0 }}>
            <div
              className="step-name"
              style={{
                textDecoration: step.completed ? 'line-through' : 'none',
                opacity: step.completed ? 0.45 : 1,
                transition: 'all 0.2s',
              }}
            >
              {step.name}
            </div>
          {weather && (
            <div style={{ fontSize: '0.7rem', color: '#8a8070', marginTop: '0.15rem' }}>
              {weatherEmoji(weather.code)} {weather.temp}°C
            </div>
          )}
          {step.transport_mode && step.transport_mode !== 'driving' && (
            <div className="step-mode">
              {modeEmoji[step.transport_mode]} {step.transport_mode === 'plane' ? 'Avion' : 'Ferry'}
              {step.transit_name && ` → ${step.transit_name}`}
            </div>
          )}
          </div>
        </div>

        <div className="step-right">
          {stepTotal > 0 && <span className="step-total">{stepTotal.toFixed(0)} €</span>}
          <button className="btn-add-expense" onClick={() => onToggleExpense(step.id)}>+ €</button>
          <button className="btn-add-expense" onClick={() => onStartEdit(step)}>✏</button>
          <button className="btn-delete-step" onClick={() => onDelete(step.id)}>✕</button>
        </div>
      </div>

      {editingStepId === step.id && (
        <div className="expense-form">
          <input
            className="form-input"
            type="text"
            placeholder="Nouveau nom..."
            value={editingStepName}
            onChange={e => onEditNameChange(e.target.value)}
          />
          <div className="transport-selector">
            <label className="transport-label">Transport</label>
            <div className="transport-options">
              {[
                { value: 'driving', label: '🚗' },
                { value: 'plane', label: '✈️' },
                { value: 'ferry', label: '⛴️' },
              ].map(mode => (
                <button
                  key={mode.value}
                  onClick={() => onEditModeChange(mode.value)}
                  style={{
                    padding: '0.4rem 0.75rem', borderRadius: '4px',
                    border: `1px solid ${editingTransportMode === mode.value ? '#0a0a0a' : '#e8e0d0'}`,
                    background: editingTransportMode === mode.value ? '#0a0a0a' : '#fff',
                    color: editingTransportMode === mode.value ? '#d4af37' : '#8a8070',
                    fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          {addingStep && <p style={{ fontSize: '0.75rem', color: '#8a8070', fontStyle: 'italic', margin: '0.4rem 0' }}>🔍 Recherche...</p>}
          <div className="form-actions">
            <button className="btn-primary" onClick={() => onUpdateStep(step.id)} disabled={addingStep}>
              {addingStep ? '...' : 'Enregistrer'}
            </button>
            <button className="btn-secondary" onClick={onCancelEdit}>Annuler</button>
          </div>
        </div>
      )}

      {activeStepId === step.id && (
        <div className="expense-form">
          <input
            className="form-input"
            type="text"
            placeholder="Libellé..."
            value={expenseLabel}
            onChange={e => onExpenseLabelChange(e.target.value)}
          />
          <div className="expense-form-row">
            <input
              className="form-input"
              style={{ margin: 0, flex: 1 }}
              type="number"
              placeholder="Montant €"
              value={expenseAmount}
              onChange={e => onExpenseAmountChange(e.target.value)}
            />
            <select className="form-select" value={expenseCategory} onChange={e => onExpenseCategoryChange(e.target.value)}>
              <option value="transport">🚗</option>
              <option value="hébergement">🏨</option>
              <option value="nourriture">🍽️</option>
              <option value="activités">🎯</option>
              <option value="autre">💼</option>
            </select>
            <button className="btn-add" onClick={() => onAddExpense(step.id)}>+</button>
          </div>
        </div>
      )}

      {stepExpenses.length > 0 && (
        <div className="expenses-list">
          {stepExpenses.map((expense: Expense) => (
            <div key={expense.id} className="expense-item">
              <div className="expense-left">
                <span className="expense-emoji">{categoryEmoji[expense.category] || '💼'}</span>
                <span className="expense-label">{expense.label}</span>
              </div>
              <div className="expense-right">
                <span className="expense-amount">{expense.amount.toFixed(2)} €</span>
                <button className="btn-delete-expense" onClick={() => onDeleteExpense(expense.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
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
  const [editingTitle, setEditingTitle] = useState(false)
  interface Weather {
    temp: number
    code: number
  }

  const [stepWeather, setStepWeather] = useState<Record<string, Weather>>({})
  const [editingTitleValue, setEditingTitleValue] = useState('')
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchWeatherForSteps = async (stepsData: Step[], startDate: string) => {
    if (!startDate) return
    const today = new Date()
    const start = new Date(startDate)
    const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays > 14 || diffDays < -1) return // hors fenêtre météo

    const weather: Record<string, Weather> = {}
    await Promise.all(stepsData.map(async (step, i) => {
      try {
        const date = new Date(start)
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${step.latitude}&longitude=${step.longitude}&daily=temperature_2m_max,weathercode&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`
        )
        const data = await res.json()
        if (data.daily?.temperature_2m_max?.[0] !== undefined) {
          weather[step.id] = {
            temp: Math.round(data.daily.temperature_2m_max[0]),
            code: data.daily.weathercode[0],
          }
        }
      } catch {}
    }))
    setStepWeather(weather)
  }
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = steps.findIndex(s => s.id === active.id)
    const newIndex = steps.findIndex(s => s.id === over.id)
    const newSteps = arrayMove(steps, oldIndex, newIndex)
    setSteps(newSteps)
    await Promise.all(newSteps.map((step, i) =>
      supabase.from('steps').update({ order_index: i }).eq('id', step.id)
    ))
  }

  const updateTripName = async () => {
    if (!editingTitleValue.trim()) return
    await supabase.from('trips').update({ name: editingTitleValue }).eq('id', id)
    setTrip(t => t ? { ...t, name: editingTitleValue } : t)
    setEditingTitle(false)
  }

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

  const toggleStepComplete = async (stepId: string, current: boolean) => {
    await supabase.from('steps').update({ completed: !current }).eq('id', stepId)
    fetchSteps()
  }

  const addStep = async () => {
    if (!stepName || addingStep) return
    setAddingStep(true)
    let finalLat: number, finalLng: number
    if (pickedCoords) {
      finalLat = pickedCoords.lat; finalLng = pickedCoords.lng
    } else {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(stepName)}&format=json&limit=1`)
      const geo = await res.json()
      if (!geo || geo.length === 0) { alert('Ville introuvable'); setAddingStep(false); return }
      finalLat = parseFloat(geo[0].lat); finalLng = parseFloat(geo[0].lon)
    }
    let transitLat = null, transitLng = null, transitName = null
    let transitDepartureLat = null, transitDepartureLng = null, transitDepartureName = null
    if (transportMode === 'plane') {
      transitDepartureLat = CDG.lat; transitDepartureLng = CDG.lng; transitDepartureName = CDG.name
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
      trip_id: id, name: stepName, latitude: finalLat, longitude: finalLng,
      order_index: steps.length, transport_mode: transportMode,
      transit_lat: transitLat, transit_lng: transitLng, transit_name: transitName,
      transit_departure_lat: transitDepartureLat, transit_departure_lng: transitDepartureLng,
      transit_departure_name: transitDepartureName, completed: false,
    })
    setStepName(''); setTransportMode('driving'); setShowStepForm(false)
    setAddingStep(false); setPickedCoords(null); setPickMode(false)
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
      transitDepartureLat = CDG.lat; transitDepartureLng = CDG.lng; transitDepartureName = CDG.name
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
      name: editingStepName, latitude: parseFloat(geo[0].lat), longitude: parseFloat(geo[0].lon),
      transport_mode: editingTransportMode,
      transit_lat: transitLat, transit_lng: transitLng, transit_name: transitName,
      transit_departure_lat: transitDepartureLat, transit_departure_lng: transitDepartureLng,
      transit_departure_name: transitDepartureName,
    }).eq('id', stepId)
    setEditingStepId(null); setEditingStepName(''); setEditingTransportMode('driving')
    setAddingStep(false); fetchSteps()
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
      amount: parseFloat(expenseAmount), category: expenseCategory,
    })
    setExpenseLabel(''); setExpenseAmount(''); setExpenseCategory('transport')
    setActiveStepId(null); fetchExpenses()
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

  const allCompleted = steps.length > 0 && steps.every(s => s.completed)
  const completedCount = steps.filter(s => s.completed).length

  useEffect(() => { if (id) { fetchTrip(); fetchSteps() } }, [id])
  useEffect(() => {
    if (steps.length > 0) {
      fetchExpenses()
      if (trip) fetchWeatherForSteps(steps, trip.start_date)
    }
  }, [steps, trip])

  const categoryEmoji: Record<string, string> = {
    transport: '🚗', hébergement: '🏨', nourriture: '🍽️', activités: '🎯', autre: '💼'
  }
  const modeEmoji: Record<string, string> = { driving: '🚗', plane: '✈️', ferry: '⛴️' }

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
    display: flex; flex-direction: column; justify-content: space-between; padding: 1.5rem 3rem;
  }
  .navbar { display: flex; align-items: center; justify-content: space-between; }
  .nav-logo { font-family: 'Playfair Display', serif; font-size: 1.1rem; letter-spacing: 0.2em; text-transform: uppercase; color: #d4af37; cursor: pointer; }
  .btn-back { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 0.5rem 1rem; border-radius: 4px; font-family: 'DM Sans', sans-serif; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px); }
  .btn-back:hover { background: rgba(255,255,255,0.2); }
  .trip-title { font-family: 'Playfair Display', serif; font-size: 2.75rem; color: #fff; line-height: 1.1; margin-bottom: 0.4rem; }
  .trip-desc { font-size: 0.9rem; color: rgba(255,255,255,0.7); }
  .trip-content { max-width: 1300px; margin: 0 auto; padding: 2rem 3rem; }
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
  .category-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid #f0ebe0; }
  .category-item { text-align: center; }
  .category-emoji { font-size: 1.25rem; margin-bottom: 0.25rem; }
  .category-name { font-size: 0.7rem; color: #8a8070; margin-bottom: 0.2rem; text-transform: capitalize; }
  .category-amount { font-size: 0.85rem; font-weight: 500; color: #1a1612; }
  .itinerary-layout { display: grid; grid-template-columns: 1fr 420px; gap: 1.5rem; align-items: start; }
  .map-column { position: sticky; top: 1.5rem; }
  .map-section { border-radius: 12px; overflow: hidden; border: 1px solid #e8e0d0; margin-bottom: 1rem; }
  .steps-column { display: flex; flex-direction: column; gap: 0; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
  .section-title { font-family: 'Playfair Display', serif; font-size: 1.5rem; }
  .btn-primary { background: #0a0a0a; color: #f5f0e8; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s; letter-spacing: 0.05em; }
  .btn-primary:hover { background: #d4af37; color: #0a0a0a; }
  .btn-primary:disabled { background: #8a8070; cursor: not-allowed; }
  .form-card { background: #fff; border: 1px solid #e8e0d0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; }
  .form-input { width: 100%; background: #f7f4ef; border: 1px solid #e8e0d0; border-radius: 4px; padding: 0.75rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: #1a1612; outline: none; transition: border-color 0.2s; margin-bottom: 0.75rem; }
  .form-input:focus { border-color: #d4af37; background: #fff; }
  .form-actions { display: flex; gap: 0.75rem; margin-top: 0.75rem; }
  .btn-secondary { background: transparent; border: 1px solid #e8e0d0; color: #8a8070; padding: 0.75rem 1.5rem; border-radius: 4px; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
  .btn-secondary:hover { border-color: #1a1612; color: #1a1612; }
  .transport-selector { margin-bottom: 0.75rem; }
  .transport-label { font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: #8a8070; display: block; margin-bottom: 0.5rem; }
  .transport-options { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .loading-indicator { font-size: 0.85rem; color: #8a8070; font-style: italic; margin-top: 0.5rem; }
  .steps-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .step-card { background: #fff; border: 1px solid #e8e0d0; border-radius: 8px; overflow: hidden; transition: border-color 0.2s; }
  .step-card:hover { border-color: #d4af37; }
  .step-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; }
  .step-left { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
  .step-number { width: 28px; height: 28px; background: #0a0a0a; color: #d4af37; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 500; flex-shrink: 0; }
  .step-name { font-family: 'Playfair Display', serif; font-size: 1rem; color: #1a1612; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .step-mode { font-size: 0.7rem; color: #8a8070; margin-top: 0.15rem; }
  .step-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
  .step-total { font-size: 0.85rem; font-weight: 500; color: #d4af37; }
  .btn-add-expense { background: #f7f4ef; border: 1px solid #e8e0d0; color: #1a1612; padding: 0.35rem 0.7rem; border-radius: 4px; font-family: 'DM Sans', sans-serif; font-size: 0.7rem; cursor: pointer; transition: all 0.2s; }
  .btn-add-expense:hover { background: #0a0a0a; color: #d4af37; border-color: #0a0a0a; }
  .btn-delete-step { background: transparent; border: none; color: #c0a090; font-size: 0.7rem; cursor: pointer; padding: 0.3rem; transition: color 0.2s; }
  .btn-delete-step:hover { color: #c07060; }
  .expense-form { background: #f7f4ef; padding: 1rem 1.25rem; border-top: 1px solid #e8e0d0; }
  .expense-form-row { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
  .form-select { background: #fff; border: 1px solid #e8e0d0; border-radius: 4px; padding: 0.6rem 0.75rem; font-family: 'DM Sans', sans-serif; font-size: 0.8rem; color: #1a1612; outline: none; flex: 1; }
  .btn-add { background: #0a0a0a; color: #f5f0e8; border: none; padding: 0.6rem 1rem; border-radius: 4px; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
  .btn-add:hover { background: #d4af37; color: #0a0a0a; }
  .expenses-list { padding: 0 1.25rem 1rem; display: flex; flex-direction: column; gap: 0.4rem; }
  .expense-item { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: #f7f4ef; border-radius: 4px; }
  .expense-left { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
  .expense-emoji { font-size: 0.85rem; flex-shrink: 0; }
  .expense-label { font-size: 0.8rem; color: #1a1612; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .expense-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
  .expense-amount { font-size: 0.8rem; font-weight: 500; color: #1a1612; }
  .btn-delete-expense { background: transparent; border: none; color: #c0a090; font-size: 0.65rem; cursor: pointer; transition: color 0.2s; padding: 0.2rem; }
  .btn-delete-expense:hover { color: #c07060; }
  .empty-state { text-align: center; padding: 4rem 2rem; color: #8a8070; }
  .empty-title { font-family: 'Playfair Display', serif; font-size: 1.75rem; color: #1a1612; margin-bottom: 0.5rem; }
  .progress-bar-track { height: 6px; background: #f0ebe0; border-radius: 4px; overflow: hidden; margin-top: 0.5rem; }
  .progress-bar-fill { height: 100%; background: #6a9e7f; border-radius: 4px; transition: width 0.4s ease; }

  /* ── TABLETTE (≤ 1024px) ── */
  @media (max-width: 1024px) {
    .trip-hero-overlay { padding: 1.25rem 1.5rem; }
    .trip-content { padding: 1.5rem; }
    .itinerary-layout { grid-template-columns: 1fr; }
    .map-column { position: static; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .category-grid { grid-template-columns: repeat(3, 1fr); }
  }

  /* ── MOBILE (≤ 640px) ── */
  @media (max-width: 640px) {
    .trip-hero { height: 220px; }
    .trip-hero-overlay { padding: 1rem; }
    .trip-title { font-size: 1.75rem; }
    .trip-content { padding: 1rem; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
    .stat-value { font-size: 1.35rem; }
    .budget-bar-labels { flex-direction: column; gap: 0.25rem; }
    .category-grid { grid-template-columns: repeat(3, 1fr); }
    .itinerary-layout { grid-template-columns: 1fr; gap: 1rem; }
    .map-column { position: static; }
    .section-header { flex-wrap: wrap; gap: 0.75rem; }
    .step-header { padding: 0.75rem 1rem; }
    .step-right { gap: 0.3rem; }
    .btn-add-expense { padding: 0.3rem 0.5rem; font-size: 0.65rem; }
  }
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
              {editingTitle ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    autoFocus
                    value={editingTitleValue}
                    onChange={e => setEditingTitleValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') updateTripName(); if (e.key === 'Escape') setEditingTitle(false) }}
                    style={{
                      fontFamily: 'Playfair Display, serif', fontSize: '2.75rem',
                      background: 'transparent', border: 'none',
                      borderBottom: '2px solid #d4af37', color: '#fff',
                      outline: 'none', lineHeight: 1.1, width: '100%',
                    }}
                  />
                  <button onClick={updateTripName} style={{ background: '#d4af37', border: 'none', color: '#0a0a0a', padding: '0.4rem 0.85rem', borderRadius: '4px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    ✓ OK
                  </button>
                  <button onClick={() => setEditingTitle(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '0.4rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    ✕
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h1 className="trip-title">{trip.name}</h1>
                  <button
                    onClick={() => { setEditingTitle(true); setEditingTitleValue(trip.name) }}
                    style={{
                      background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.6)', padding: '0.3rem 0.6rem',
                      borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem',
                      transition: 'all 0.2s', backdropFilter: 'blur(10px)',
                    }}
                    title="Modifier le nom"
                  >
                     ✏
                   </button>
                 </div>
              )}
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

              {/* Bandeau voyage terminé */}
              {allCompleted && (
                <div style={{
                  background: 'linear-gradient(135deg, #6a9e7f, #4a8a6a)',
                  color: '#fff', borderRadius: '8px',
                  padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  boxShadow: '0 4px 20px rgba(106,158,127,0.3)',
                }}>
                  <span style={{ fontSize: '2rem' }}>🎉</span>
                  <div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.2rem', fontWeight: 700 }}>
                      Voyage terminé !
                    </div>
                    <div style={{ fontSize: '0.82rem', opacity: 0.9, marginTop: '0.2rem' }}>
                      Toutes les {steps.length} étapes ont été validées. Bravo !
                    </div>
                  </div>
                </div>
              )}

              <div className="itinerary-layout">
                <div className="map-column">
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
                </div>

                <div className="steps-column">
                  <div className="section-header">
                    <div>
                      <h2 className="section-title">Itinéraire</h2>
                      {steps.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#8a8070', marginTop: '0.2rem' }}>
                          {completedCount}/{steps.length} étapes validées
                        </div>
                      )}
                      {steps.length > 0 && (
                        <div className="progress-bar-track" style={{ width: '120px' }}>
                          <div className="progress-bar-fill" style={{ width: `${(completedCount / steps.length) * 100}%` }} />
                        </div>
                      )}
                    </div>
                    <button className="btn-primary" onClick={() => { setShowStepForm(!showStepForm); setPickMode(false); setPickedCoords(null) }}>
                      + Étape
                    </button>
                  </div>

                  {showStepForm && (
                    <div className="form-card">
                      <input
                        className="form-input"
                        type="text"
                        placeholder="Nom de la ville..."
                        value={stepName}
                        onChange={e => { setStepName(e.target.value); setPickedCoords(null) }}
                        onKeyDown={e => e.key === 'Enter' && addStep()}
                      />
                      <button
                        type="button"
                        onClick={() => setPickMode(p => !p)}
                        style={{
                          width: '100%', padding: '0.6rem', marginBottom: '0.75rem',
                          background: pickMode ? '#d4af37' : '#f7f4ef',
                          color: pickMode ? '#0a0a0a' : '#8a8070',
                          border: `1px solid ${pickMode ? '#d4af37' : '#e8e0d0'}`,
                          borderRadius: '4px', fontFamily: 'DM Sans, sans-serif',
                          fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        {pickMode ? '✓ Cliquez sur la carte ←' : '📍 Placer sur la carte'}
                      </button>
                      {pickedCoords && (
                        <div style={{ fontSize: '0.78rem', color: '#6a9e7f', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                          ✓ {stepName} ({pickedCoords.lat.toFixed(3)}, {pickedCoords.lng.toFixed(3)})
                        </div>
                      )}
                      <div className="transport-selector">
                        <label className="transport-label">Transport</label>
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
                                padding: '0.5rem 1rem', borderRadius: '4px',
                                border: `1px solid ${transportMode === mode.value ? '#0a0a0a' : '#e8e0d0'}`,
                                background: transportMode === mode.value ? '#0a0a0a' : '#f7f4ef',
                                color: transportMode === mode.value ? '#d4af37' : '#8a8070',
                                fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem',
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
                      <h2 className="empty-title">Aucune étape</h2>
                      <p>Ajoute ta première destination.</p>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        <div className="steps-list">
                          {steps.map((step, index) => (
                            <SortableStepCard
                              weather={stepWeather[step.id]}
                              key={step.id}
                              step={step}
                              index={index}
                              expenses={expenses}
                              activeStepId={activeStepId}
                              editingStepId={editingStepId}
                              editingStepName={editingStepName}
                              editingTransportMode={editingTransportMode}
                              addingStep={addingStep}
                              expenseLabel={expenseLabel}
                              expenseAmount={expenseAmount}
                              expenseCategory={expenseCategory}
                              modeEmoji={modeEmoji}
                              categoryEmoji={categoryEmoji}
                              onToggleExpense={(sid: string) => setActiveStepId(activeStepId === sid ? null : sid)}
                              onStartEdit={(s: Step) => { setEditingStepId(s.id); setEditingStepName(s.name); setEditingTransportMode(s.transport_mode || 'driving') }}
                              onDelete={deleteStep}
                              onToggleComplete={toggleStepComplete}
                              onEditNameChange={setEditingStepName}
                              onEditModeChange={setEditingTransportMode}
                              onUpdateStep={updateStep}
                              onCancelEdit={() => setEditingStepId(null)}
                              onExpenseLabelChange={setExpenseLabel}
                              onExpenseAmountChange={setExpenseAmount}
                              onExpenseCategoryChange={setExpenseCategory}
                              onAddExpense={addExpense}
                              onDeleteExpense={deleteExpense}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default TripPage