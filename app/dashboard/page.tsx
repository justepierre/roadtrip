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
}

export default function Dashboard() {
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [userEmail, setUserEmail] = useState('')

  const fetchTrips = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserEmail(user.email || '')

    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setTrips(data || [])
    setLoading(false)
  }

  const openCreateForm = () => {
    setEditingTrip(null)
    setName('')
    setDescription('')
    setStartDate('')
    setEndDate('')
    setShowForm(true)
  }

  const openEditForm = (trip: Trip, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTrip(trip)
    setName(trip.name)
    setDescription(trip.description || '')
    setStartDate(trip.start_date || '')
    setEndDate(trip.end_date || '')
    setShowForm(true)
  }

  const saveTrip = async () => {
    if (!name) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editingTrip) {
      await supabase.from('trips').update({
        name, description,
        start_date: startDate || null,
        end_date: endDate || null,
      }).eq('id', editingTrip.id)
    } else {
      await supabase.from('trips').insert({
        user_id: user.id, name, description,
        start_date: startDate || null,
        end_date: endDate || null,
      })
    }

    setShowForm(false)
    setEditingTrip(null)
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; background: #f7f4ef; color: #1a1612; }

        .dashboard { min-height: 100vh; }

        .navbar {
          background: #0a0a0a;
          padding: 1.25rem 3rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-logo {
          font-family: 'Playfair Display', serif;
          font-size: 1.1rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #d4af37;
          cursor: pointer;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .nav-email {
          font-size: 0.8rem;
          color: #8a8070;
          letter-spacing: 0.05em;
        }

        .btn-logout {
          background: transparent;
          border: 1px solid #3a3530;
          color: #8a8070;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.05em;
        }

        .btn-logout:hover { border-color: #d4af37; color: #d4af37; }

        .dashboard-content { padding: 4rem 3rem; max-width: 1200px; margin: 0 auto; }

        .dashboard-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 3rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #e8e0d0;
        }

        .dashboard-title {
          font-family: 'Playfair Display', serif;
          font-size: 3rem;
          color: #1a1612;
          line-height: 1;
        }

        .dashboard-subtitle {
          font-size: 0.85rem;
          color: #8a8070;
          margin-top: 0.5rem;
          letter-spacing: 0.05em;
        }

        .btn-primary {
          background: #0a0a0a;
          color: #f5f0e8;
          border: none;
          padding: 0.85rem 1.75rem;
          border-radius: 4px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.05em;
        }

        .btn-primary:hover { background: #d4af37; color: #0a0a0a; transform: translateY(-1px); }

        .form-card {
          background: #fff;
          border: 1px solid #e8e0d0;
          border-radius: 8px;
          padding: 2rem;
          margin-bottom: 2.5rem;
        }

        .form-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          color: #1a1612;
        }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-full { grid-column: 1 / -1; }

        .form-input {
          width: 100%;
          background: #f7f4ef;
          border: 1px solid #e8e0d0;
          border-radius: 4px;
          padding: 0.85rem 1rem;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          color: #1a1612;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-input:focus { border-color: #d4af37; background: #fff; }

        .form-actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }

        .btn-secondary {
          background: transparent;
          border: 1px solid #e8e0d0;
          color: #8a8070;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover { border-color: #1a1612; color: #1a1612; }

        .trips-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .trip-card {
          background: #fff;
          border: 1px solid #e8e0d0;
          border-radius: 8px;
          padding: 2rem;
          cursor: pointer;
          transition: all 0.25s;
          position: relative;
          overflow: hidden;
        }

        .trip-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 3px; height: 100%;
          background: #d4af37;
          transform: scaleY(0);
          transition: transform 0.25s;
          transform-origin: bottom;
        }

        .trip-card:hover { border-color: #d4af37; transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.08); }
        .trip-card:hover::before { transform: scaleY(1); }

        .trip-number {
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #d4af37;
          margin-bottom: 0.75rem;
        }

        .trip-name {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          color: #1a1612;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }

        .trip-description { font-size: 0.85rem; color: #8a8070; line-height: 1.6; margin-bottom: 1.25rem; }

        .trip-dates {
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          color: #b0a090;
          margin-bottom: 1.25rem;
        }

        .trip-actions {
          display: flex;
          gap: 0.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid #f0ebe0;
        }

        .btn-edit {
          font-size: 0.75rem;
          color: #8a8070;
          background: #f7f4ef;
          border: none;
          padding: 0.4rem 0.85rem;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.05em;
        }

        .btn-edit:hover { background: #1a1612; color: #f5f0e8; }

        .btn-delete {
          font-size: 0.75rem;
          color: #c0706050;
          background: transparent;
          border: none;
          padding: 0.4rem 0.85rem;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-delete:hover { color: #c07060; background: #fdf0ee; }

        .empty-state {
          text-align: center;
          padding: 5rem 2rem;
          color: #8a8070;
        }

        .empty-title {
          font-family: 'Playfair Display', serif;
          font-size: 2rem;
          color: #1a1612;
          margin-bottom: 0.75rem;
        }
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

          {showForm && (
            <div className="form-card">
              <h2 className="form-title">{editingTrip ? 'Modifier le voyage' : 'Nouveau voyage'}</h2>
              <div className="form-grid">
                <input className="form-input form-full" type="text" placeholder="Nom du voyage *" value={name} onChange={e => setName(e.target.value)} />
                <input className="form-input form-full" type="text" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
                <input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <input className="form-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div className="form-actions">
                <button className="btn-primary" onClick={saveTrip}>{editingTrip ? 'Enregistrer' : 'Créer'}</button>
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
              {trips.map((trip, index) => (
                <div key={trip.id} className="trip-card" onClick={() => router.push(`/trip/${trip.id}`)}>
                  <div className="trip-number">Voyage {String(index + 1).padStart(2, '0')}</div>
                  <h2 className="trip-name">{trip.name}</h2>
                  {trip.description && <p className="trip-description">{trip.description}</p>}
                  {trip.start_date && (
                    <p className="trip-dates">{trip.start_date} → {trip.end_date}</p>
                  )}
                  <div className="trip-actions">
                    <button className="btn-edit" onClick={e => openEditForm(trip, e)}>✏ Modifier</button>
                    <button className="btn-delete" onClick={e => deleteTrip(trip.id, e)}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}