'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Trip {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  budget: number
  cover_image: string
}

interface GlobalStats {
  totalSteps: number
  totalBudget: number
  totalSpent: number
}

export default function Dashboard() {
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [budget, setBudget] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [stats, setStats] = useState<GlobalStats>({ totalSteps: 0, totalBudget: 0, totalSpent: 0 })
  const [tripExpenses, setTripExpenses] = useState<Record<string, number>>({})
  const [tripCompletion, setTripCompletion] = useState<Record<string, { total: number, completed: number }>>({})

  const fetchTrips = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserEmail(user.email || '')

    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const tripList = data || []
    setTrips(tripList)
    setLoading(false)

    const totalBudget = tripList.reduce((sum, t) => sum + (t.budget || 0), 0)

    if (tripList.length > 0) {
      const tripIds = tripList.map(t => t.id)

      const { data: stepsData } = await supabase
        .from('steps')
        .select('id, trip_id, completed')
        .in('trip_id', tripIds)

      const totalSteps = stepsData?.length || 0
      const stepIds = stepsData?.map(s => s.id) || []

      // Calcul completion par voyage
      const completionMap: Record<string, { total: number, completed: number }> = {}
      stepsData?.forEach(s => {
        if (!completionMap[s.trip_id]) completionMap[s.trip_id] = { total: 0, completed: 0 }
        completionMap[s.trip_id].total++
        if (s.completed) completionMap[s.trip_id].completed++
      })
      setTripCompletion(completionMap)

      let totalSpent = 0
      const expensesByTrip: Record<string, number> = {}

      if (stepIds.length > 0) {
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('amount, step_id')
          .in('step_id', stepIds)

        const stepToTrip: Record<string, string> = {}
        stepsData?.forEach(s => { stepToTrip[s.id] = s.trip_id })

        expensesData?.forEach(e => {
          totalSpent += e.amount
          const tripId = stepToTrip[e.step_id]
          if (tripId) expensesByTrip[tripId] = (expensesByTrip[tripId] || 0) + e.amount
        })
      }

      setStats({ totalSteps, totalBudget, totalSpent })
      setTripExpenses(expensesByTrip)
    } else {
      setStats({ totalSteps: 0, totalBudget, totalSpent: 0 })
      setTripExpenses({})
    }
  }

  const fetchCoverImage = async (query: string): Promise<string> => {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY}` } }
      )
      const data = await res.json()
      return data.results?.[0]?.urls?.regular || ''
    } catch { return '' }
  }

  const openCreateForm = () => {
    setEditingTrip(null); setName(''); setDescription('')
    setStartDate(''); setEndDate(''); setBudget('')
    setShowForm(true)
  }

  const openEditForm = (trip: Trip, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTrip(trip); setName(trip.name)
    setDescription(trip.description || ''); setStartDate(trip.start_date || '')
    setEndDate(trip.end_date || ''); setBudget(trip.budget?.toString() || '')
    setShowForm(true)
  }

  const saveTrip = async () => {
    if (!name || saving) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const cover_image = await fetchCoverImage(name)
    if (editingTrip) {
      await supabase.from('trips').update({
        name, description, start_date: startDate || null,
        end_date: endDate || null, budget: parseFloat(budget) || 0, cover_image,
      }).eq('id', editingTrip.id)
    } else {
      await supabase.from('trips').insert({
        user_id: user.id, name, description,
        start_date: startDate || null, end_date: endDate || null,
        budget: parseFloat(budget) || 0, cover_image,
      })
    }
    setShowForm(false); setEditingTrip(null); setSaving(false)
    fetchTrips()
  }

  const deleteTrip = async (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Supprimer ce voyage ?')) return
    await supabase.from('trips').delete().eq('id', tripId)
    fetchTrips()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  useEffect(() => { fetchTrips() }, [])

  useEffect(() => {
    const preset = localStorage.getItem('preset_trip')
    if (!preset) return
    localStorage.removeItem('preset_trip')
    const createPresetTrip = async () => {
      const trip = JSON.parse(preset)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const cover_image = await fetchCoverImage(trip.name)
      const { data: newTrip } = await supabase.from('trips').insert({
        user_id: user.id, name: trip.name, description: trip.description,
        budget: trip.budget, cover_image,
      }).select().single()
      if (!newTrip) return
      for (let i = 0; i < trip.steps.length; i++) {
        const stepName = trip.steps[i]
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(stepName)}&format=json&limit=1`)
        const geo = await res.json()
        if (!geo.length) continue
        await supabase.from('steps').insert({
          trip_id: newTrip.id, name: stepName,
          latitude: parseFloat(geo[0].lat), longitude: parseFloat(geo[0].lon),
          order_index: i, transport_mode: 'driving',
        })
      }
      fetchTrips()
      router.push(`/trip/${newTrip.id}`)
    }
    createPresetTrip()
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; background: #f7f4ef; color: #1a1612; }
        .dashboard { min-height: 100vh; }
        .navbar { background: #0a0a0a; padding: 1.25rem 3rem; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
        .nav-logo { font-family: 'Playfair Display', serif; font-size: 1.1rem; letter-spacing: 0.2em; text-transform: uppercase; color: #d4af37; cursor: pointer; }
        .nav-right { display: flex; align-items: center; gap: 1.5rem; }
        .nav-email { font-size: 0.8rem; color: #8a8070; letter-spacing: 0.05em; }
        .btn-logout { background: transparent; border: 1px solid #3a3530; color: #8a8070; padding: 0.5rem 1rem; border-radius: 4px; font-family: 'DM Sans', sans-serif; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; letter-spacing: 0.05em; }
        .btn-logout:hover { border-color: #d4af37; color: #d4af37; }
        .dashboard-content { padding: 4rem 3rem; max-width: 1200px; margin: 0 auto; }
        .dashboard-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #e8e0d0; }
        .dashboard-title { font-family: 'Playfair Display', serif; font-size: 3rem; color: #1a1612; line-height: 1; }
        .dashboard-subtitle { font-size: 0.85rem; color: #8a8070; margin-top: 0.5rem; letter-spacing: 0.05em; }
        .stats-banner { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2.5rem; }
        .stat-card { background: #fff; border: 1px solid #e8e0d0; border-radius: 8px; padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 0.4rem; }
        .stat-card-label { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: #8a8070; }
        .stat-card-value { font-family: 'Playfair Display', serif; font-size: 2rem; color: #1a1612; line-height: 1; }
        .stat-card-value.gold { color: #d4af37; }
        .stat-card-value.green { color: #6a9e7f; }
        .stat-card-sub { font-size: 0.75rem; color: #b0a090; }
        .btn-primary { background: #0a0a0a; color: #f5f0e8; border: none; padding: 0.85rem 1.75rem; border-radius: 4px; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s; letter-spacing: 0.05em; }
        .btn-primary:hover { background: #d4af37; color: #0a0a0a; transform: translateY(-1px); }
        .btn-primary:disabled { background: #8a8070; cursor: not-allowed; transform: none; }
        .form-card { background: #fff; border: 1px solid #e8e0d0; border-radius: 8px; padding: 2rem; margin-bottom: 2.5rem; }
        .form-title { font-family: 'Playfair Display', serif; font-size: 1.5rem; margin-bottom: 1.5rem; color: #1a1612; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-full { grid-column: 1 / -1; }
        .form-input { width: 100%; background: #f7f4ef; border: 1px solid #e8e0d0; border-radius: 4px; padding: 0.85rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: #1a1612; outline: none; transition: border-color 0.2s; }
        .form-input:focus { border-color: #d4af37; background: #fff; }
        .form-actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }
        .btn-secondary { background: transparent; border: 1px solid #e8e0d0; color: #8a8070; padding: 0.75rem 1.5rem; border-radius: 4px; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
        .btn-secondary:hover { border-color: #1a1612; color: #1a1612; }
        .trips-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; }
        .trip-card { background: #fff; border: 1px solid #e8e0d0; border-radius: 12px; cursor: pointer; transition: all 0.25s; overflow: hidden; position: relative; }
        .trip-card:hover { transform: translateY(-4px); box-shadow: 0 16px 50px rgba(0,0,0,0.1); }
        .trip-cover { width: 100%; height: 180px; object-fit: cover; display: block; background: #e8e0d0; }
        .trip-cover-placeholder { width: 100%; height: 180px; background: linear-gradient(135deg, #1a1612 0%, #3a3530 100%); display: flex; align-items: center; justify-content: center; font-size: 3rem; }
        .trip-body { padding: 1.5rem; }
        .trip-number { font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: #d4af37; margin-bottom: 0.5rem; }
        .trip-name { font-family: 'Playfair Display', serif; font-size: 1.4rem; color: #1a1612; margin-bottom: 0.4rem; line-height: 1.2; }
        .trip-description { font-size: 0.85rem; color: #8a8070; line-height: 1.6; margin-bottom: 1rem; }
        .trip-dates { font-size: 0.75rem; letter-spacing: 0.05em; color: #b0a090; margin-bottom: 1rem; }
        .trip-budget-bar { margin-bottom: 1rem; }
        .budget-bar-header { display: flex; justify-content: space-between; font-size: 0.75rem; color: #8a8070; margin-bottom: 0.4rem; }
        .budget-bar-track { height: 4px; background: #f0ebe0; border-radius: 2px; overflow: hidden; }
        .budget-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease; }
        .trip-actions { display: flex; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid #f0ebe0; }
        .btn-edit { font-size: 0.75rem; color: #8a8070; background: #f7f4ef; border: none; padding: 0.4rem 0.85rem; border-radius: 3px; cursor: pointer; transition: all 0.2s; letter-spacing: 0.05em; }
        .btn-edit:hover { background: #1a1612; color: #f5f0e8; }
        .btn-delete { font-size: 0.75rem; color: #c0706050; background: transparent; border: none; padding: 0.4rem 0.85rem; border-radius: 3px; cursor: pointer; transition: all 0.2s; }
        .btn-delete:hover { color: #c07060; background: #fdf0ee; }
        .empty-state { text-align: center; padding: 5rem 2rem; color: #8a8070; }
        .empty-title { font-family: 'Playfair Display', serif; font-size: 2rem; color: #1a1612; margin-bottom: 0.75rem; }
        .form-label { font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: #8a8070; margin-bottom: 0.4rem; display: block; }

        /* Badge voyage terminé */
        .completed-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: linear-gradient(135deg, #6a9e7f, #4a8a6a);
          color: #fff;
          padding: 0.35rem 0.75rem;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          box-shadow: 0 2px 10px rgba(74,138,106,0.4);
        }

        /* Barre de progression étapes */
        .steps-progress { margin-bottom: 0.75rem; }
        .steps-progress-header { display: flex; justify-content: space-between; font-size: 0.72rem; color: #8a8070; margin-bottom: 0.35rem; }
        .steps-progress-track { height: 3px; background: #f0ebe0; border-radius: 2px; overflow: hidden; }
        .steps-progress-fill { height: 100%; background: #6a9e7f; border-radius: 2px; transition: width 0.3s ease; }

        /* Bordure verte si terminé */
        .trip-card.trip-completed { border-color: #6a9e7f; }
        .trip-card.trip-completed:hover { box-shadow: 0 16px 50px rgba(106,158,127,0.2); }
      `}</style>

      <div className="dashboard">
        <nav className="navbar">
          <div className="nav-logo">Roadtrip</div>
          <div className="nav-right">
            <span className="nav-email">{userEmail}</span>
            <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
          </div>
        </nav>

        <div className="dashboard-content">
          <div className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Mes voyages</h1>
              <p className="dashboard-subtitle">{trips.length} aventure{trips.length !== 1 ? 's' : ''} planifiée{trips.length !== 1 ? 's' : ''}</p>
            </div>
            <button className="btn-primary" onClick={openCreateForm}>+ Nouveau voyage</button>
          </div>

          {!loading && trips.length > 0 && (
            <div className="stats-banner">
              <div className="stat-card">
                <div className="stat-card-label">Voyages</div>
                <div className="stat-card-value">{trips.length}</div>
                <div className="stat-card-sub">aventures planifiées</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Étapes</div>
                <div className="stat-card-value">{stats.totalSteps}</div>
                <div className="stat-card-sub">destinations visitées</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Total dépensé</div>
                <div className="stat-card-value gold">{stats.totalSpent.toFixed(0)} €</div>
                <div className="stat-card-sub">sur tous les voyages</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Budget total</div>
                <div className="stat-card-value green">{stats.totalBudget.toFixed(0)} €</div>
                <div className="stat-card-sub">budgets prévisionnels</div>
              </div>
            </div>
          )}

          {showForm && (
            <div className="form-card">
              <h2 className="form-title">{editingTrip ? 'Modifier le voyage' : 'Nouveau voyage'}</h2>
              <div className="form-grid">
                <div className="form-full">
                  <label className="form-label">Nom du voyage *</label>
                  <input className="form-input" type="text" placeholder="Ex: Road trip en Bretagne" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="form-full">
                  <label className="form-label">Description</label>
                  <input className="form-input" type="text" placeholder="Une courte description" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Date de départ</label>
                  <input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Date de retour</label>
                  <input className="form-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <div className="form-full">
                  <label className="form-label">Budget prévisionnel (€)</label>
                  <input className="form-input" type="number" placeholder="Ex: 2000" value={budget} onChange={e => setBudget(e.target.value)} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-primary" onClick={saveTrip} disabled={saving}>
                  {saving ? 'Création...' : editingTrip ? 'Enregistrer' : 'Créer'}
                </button>
                <button className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
              </div>
            </div>
          )}

          {loading ? (
            <p style={{ color: '#8a8070', letterSpacing: '0.05em' }}>Chargement...</p>
          ) : trips.length === 0 ? (
            <div className="empty-state">
              <h2 className="empty-title">Aucun voyage pour l'instant</h2>
              <p>Commence par créer ton premier itinéraire.</p>
            </div>
          ) : (
            <div className="trips-grid">
              {trips.map((trip, index) => {
                const spent = tripExpenses[trip.id] || 0
                const budgetPercent = trip.budget > 0 ? Math.min((spent / trip.budget) * 100, 100) : 0
                const barColor = budgetPercent > 90 ? '#c07060' : budgetPercent > 70 ? '#d4af37' : '#6a9e7f'
                const completion = tripCompletion[trip.id]
                const isCompleted = completion && completion.total > 0 && completion.completed === completion.total

                return (
                  <div
                    key={trip.id}
                    className={`trip-card ${isCompleted ? 'trip-completed' : ''}`}
                    onClick={() => router.push(`/trip/${trip.id}`)}
                  >
                    {/* Badge voyage terminé */}
                    {isCompleted && (
                      <div className="completed-badge">
                        ✓ Voyage terminé
                      </div>
                    )}

                    {trip.cover_image ? (
                      <img src={trip.cover_image} alt={trip.name} className="trip-cover" />
                    ) : (
                      <div className="trip-cover-placeholder">🗺️</div>
                    )}

                    <div className="trip-body">
                      <div className="trip-number">Voyage {String(index + 1).padStart(2, '0')}</div>
                      <h2 className="trip-name">{trip.name}</h2>
                      {trip.description && <p className="trip-description">{trip.description}</p>}
                      {trip.start_date && <p className="trip-dates">{trip.start_date} → {trip.end_date}</p>}

                      {/* Barre de progression des étapes */}
                      {completion && completion.total > 0 && (
                        <div className="steps-progress">
                          <div className="steps-progress-header">
                            <span>Étapes validées</span>
                            <span>{completion.completed}/{completion.total}</span>
                          </div>
                          <div className="steps-progress-track">
                            <div
                              className="steps-progress-fill"
                              style={{ width: `${(completion.completed / completion.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {trip.budget > 0 && (
                        <div className="trip-budget-bar">
                          <div className="budget-bar-header">
                            <span>{spent > 0 ? `${spent.toFixed(0)} € dépensés` : 'Budget'}</span>
                            <span>{trip.budget} €</span>
                          </div>
                          <div className="budget-bar-track">
                            <div className="budget-bar-fill" style={{ width: `${budgetPercent}%`, background: barColor }} />
                          </div>
                        </div>
                      )}

                      <div className="trip-actions">
                        <button className="btn-edit" onClick={e => openEditForm(trip, e)}>✏ Modifier</button>
                        <button className="btn-delete" onClick={e => deleteTrip(trip.id, e)}>Supprimer</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}