'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function JoinTrip() {
  const params = useParams()
  const tripId = params.tripId as string
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'joining' | 'done' | 'error'>('loading')
  const [tripName, setTripName] = useState('')

  useEffect(() => {
    const join = async () => {
      // Vérifie si l'utilisateur est connecté
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Pas connecté → sauvegarde le lien et redirige vers login
        localStorage.setItem('join_trip_id', tripId)
        router.push('/')
        return
      }

      // Récupère le voyage
      const { data: trip } = await supabase
        .from('trips')
        .select('id, name, user_id')
        .eq('id', tripId)
        .single()

      if (!trip) { setStatus('error'); return }

      setTripName(trip.name)

      // Si c'est le propriétaire, redirige directement
      if (trip.user_id === user.id) {
        router.push(`/trip/${tripId}`)
        return
      }

      setStatus('joining')

      // Ajoute comme membre (ignore si déjà membre)
      await supabase.from('trip_members').upsert({
        trip_id: tripId,
        user_id: user.id,
        role: 'member',
      }, { onConflict: 'trip_id,user_id' })

      setStatus('done')
      setTimeout(() => router.push(`/trip/${tripId}`), 1500)
    }

    join()
  }, [tripId])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; background: #0a0a0a; color: #f5f0e8; }
        .join-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .join-card { text-align: center; padding: 3rem; max-width: 400px; }
        .join-logo { font-family: 'Playfair Display', serif; font-size: 1.1rem; letter-spacing: 0.2em; text-transform: uppercase; color: #d4af37; margin-bottom: 3rem; }
        .join-icon { font-size: 3rem; margin-bottom: 1.5rem; }
        .join-title { font-family: 'Playfair Display', serif; font-size: 1.75rem; color: #f5f0e8; margin-bottom: 0.75rem; }
        .join-subtitle { font-size: 0.9rem; color: #8a8070; line-height: 1.6; }
        .join-spinner { width: 32px; height: 32px; border: 2px solid #3a3530; border-top-color: #d4af37; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 1.5rem auto 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="join-page">
        <div className="join-card">
          <div className="join-logo">Roadtrip</div>

          {status === 'loading' && (
            <>
              <div className="join-icon">🗺️</div>
              <div className="join-title">Vérification...</div>
              <div className="join-spinner" />
            </>
          )}

          {status === 'joining' && (
            <>
              <div className="join-icon">✈️</div>
              <div className="join-title">Vous rejoignez</div>
              <div className="join-subtitle" style={{ color: '#d4af37', fontSize: '1.1rem', margin: '0.5rem 0' }}>{tripName}</div>
              <div className="join-subtitle">Redirection en cours...</div>
              <div className="join-spinner" />
            </>
          )}

          {status === 'done' && (
            <>
              <div className="join-icon">🎉</div>
              <div className="join-title">Bienvenue !</div>
              <div className="join-subtitle">Vous avez rejoint <strong style={{ color: '#d4af37' }}>{tripName}</strong>. Redirection...</div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="join-icon">❌</div>
              <div className="join-title">Lien invalide</div>
              <div className="join-subtitle">Ce voyage n'existe pas ou le lien a expiré.</div>
            </>
          )}
        </div>
      </div>
    </>
  )
}