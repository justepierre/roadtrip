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
}

interface Step {
  id: string
  name: string
  latitude: number
  longitude: number
  order_index: number
}

interface Expense {
  id: string
  step_id: string
  label: string
  amount: number
  category: string
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
  const [loading, setLoading] = useState(true)
  const [activeStepId, setActiveStepId] = useState<string | null>(null)
  const [expenseLabel, setExpenseLabel] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('transport')

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
    if (!stepName) return
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(stepName)}&format=json&limit=1`)
    const geo = await res.json()
    if (!geo || geo.length === 0) { alert('Ville introuvable'); return }
    await supabase.from('steps').insert({
      trip_id: id, name: stepName,
      latitude: parseFloat(geo[0].lat),
      longitude: parseFloat(geo[0].lon),
      order_index: steps.length,
    })
    setStepName('')
    setShowStepForm(false)
    fetchSteps()
  }

  const deleteStep = async (stepId: string) => {
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

  useEffect(() => { if (id) { fetchTrip(); fetchSteps() } }, [id])
  useEffect(() => { if (steps.length > 0) fetchExpenses() }, [steps])

  const categoryEmoji: Record<string, string> = {
    transport: '🚗', hébergement: '🏨', nourriture: '🍽️', activités: '🎯', autre: '💼'
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; background: #f7f4ef; color: #1a1612; }

        .trip-page { min-height: 100vh; }

        .navbar {
          background: #0a0a0a;
          padding: 1.25rem 3rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .nav-logo {
          font-family: 'Playfair Display', serif;
          font-size: 1.1rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #d4af37;
          cursor: pointer;
        }

        .btn-back {
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

        .btn-back:hover { border-color: #d4af37; color: #d4af37; }

        .trip-content { max-width: 1100px; margin: 0 auto; padding: 3rem; }

        .trip-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 3rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #e8e0d0;
        }

        .trip-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.75rem;
          color: #1a1612;
          line-height: 1.1;
          margin-bottom: 0.5rem;
        }

        .trip-desc { font-size: 0.9rem; color: #8a8070; }

        .budget-badge {
          background: #0a0a0a;
          color: #d4af37;
          border-radius: 8px;
          padding: 1.25rem 1.75rem;
          text-align: right;
          min-width: 160px;
        }

        .budget-label { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: #8a8070; margin-bottom: 0.25rem; }
        .budget-amount { font-family: 'Playfair Display', serif; font-size: 2rem; color: #d4af37; }

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
          margin-top: 1rem;
        }

        .btn-primary:hover { background: #d4af37; color: #0a0a0a; }

        .form-card {
          background: #fff;
          border: 1px solid #e8e0d0;
          border-radius: 8px;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .form-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.35rem;
          margin-bottom: 1.25rem;
        }

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
          margin-bottom: 0.75rem;
        }

        .form-input:focus { border-color: #d4af37; background: #fff; }

        .form-row { display: flex; gap: 0.75rem; }
        .form-row .form-input { margin-bottom: 0; }

        .form-actions { display: flex; gap: 0.75rem; margin-top: 0.75rem; }

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

        .map-section { margin-bottom: 2.5rem; border-radius: 12px; overflow: hidden; border: 1px solid #e8e0d0; }

        .steps-list { display: flex; flex-direction: column; gap: 1rem; }

        .step-card {
          background: #fff;
          border: 1px solid #e8e0d0;
          border-radius: 8px;
          overflow: hidden;
          transition: border-color 0.2s;
        }

        .step-card:hover { border-color: #d4af37; }

        .step-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
        }

        .step-left { display: flex; align-items: center; gap: 1rem; }

        .step-number {
          width: 32px; height: 32px;
          background: #0a0a0a;
          color: #d4af37;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 500;
          flex-shrink: 0;
        }

        .step-name {
          font-family: 'Playfair Display', serif;
          font-size: 1.15rem;
          color: #1a1612;
        }

        .step-right { display: flex; align-items: center; gap: 1rem; }

        .step-total {
          font-size: 0.9rem;
          font-weight: 500;
          color: #d4af37;
        }

        .btn-add-expense {
          background: #f7f4ef;
          border: 1px solid #e8e0d0;
          color: #1a1612;
          padding: 0.4rem 0.85rem;
          border-radius: 4px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-add-expense:hover { background: #0a0a0a; color: #d4af37; border-color: #0a0a0a; }

        .btn-delete-step {
          background: transparent;
          border: none;
          color: #c0a090;
          font-size: 0.75rem;
          cursor: pointer;
          padding: 0.4rem;
          transition: color 0.2s;
        }

        .btn-delete-step:hover { color: #c07060; }

        .expense-form {
          background: #f7f4ef;
          padding: 1.25rem 1.5rem;
          border-top: 1px solid #e8e0d0;
        }

        .expense-form-row { display: flex; gap: 0.75rem; margin-bottom: 0.75rem; }

        .form-select {
          background: #fff;
          border: 1px solid #e8e0d0;
          border-radius: 4px;
          padding: 0.75rem 1rem;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          color: #1a1612;
          outline: none;
          flex: 1;
        }

        .btn-add {
          background: #0a0a0a;
          color: #f5f0e8;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 4px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-add:hover { background: #d4af37; color: #0a0a0a; }

        .expenses-list { padding: 0 1.5rem 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }

        .expense-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 0.85rem;
          background: #f7f4ef;
          border-radius: 4px;
        }

        .expense-left { display: flex; align-items: center; gap: 0.6rem; }
        .expense-emoji { font-size: 0.9rem; }
        .expense-label { font-size: 0.85rem; color: #1a1612; }
        .expense-right { display: flex; align-items: center; gap: 0.75rem; }
        .expense-amount { font-size: 0.85rem; font-weight: 500; color: #1a1612; }

        .btn-delete-expense {
          background: transparent;
          border: none;
          color: #c0a090;
          font-size: 0.7rem;
          cursor: pointer;
          transition: color 0.2s;
          padding: 0.2rem;
        }

        .btn-delete-expense:hover { color: #c07060; }

        .empty-state { text-align: center; padding: 4rem 2rem; color: #8a8070; }
        .empty-title { font-family: 'Playfair Display', serif; font-size: 1.75rem; color: #1a1612; margin-bottom: 0.5rem; }
      `}</style>

      <div className="trip-page">
        <nav className="navbar">
          <div className="nav-logo" onClick={() => router.push('/dashboard')}>Roadtrip</div>
          <button className="btn-back" onClick={() => router.push('/dashboard')}>← Mes voyages</button>
        </nav>

        <div className="trip-content">
          {trip && (
            <>
              <div className="trip-header">
                <div>
                  <h1 className="trip-title">{trip.name}</h1>
                  {trip.description && <p className="trip-desc">{trip.description}</p>}
                  <button className="btn-primary" onClick={() => setShowStepForm(!showStepForm)}>
                    + Ajouter une étape
                  </button>
                </div>
                <div className="budget-badge">
                  <div className="budget-label">Budget total</div>
                  <div className="budget-amount">{totalBudget.toFixed(0)} €</div>
                </div>
              </div>

              {showStepForm && (
                <div className="form-card">
                  <h2 className="form-title">Nouvelle étape</h2>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Nom de la ville (ex: Paris, Lyon...)"
                    value={stepName}
                    onChange={e => setStepName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addStep()}
                  />
                  <div className="form-actions">
                    <button className="btn-primary" onClick={addStep}>Ajouter</button>
                    <button className="btn-secondary" onClick={() => setShowStepForm(false)}>Annuler</button>
                  </div>
                </div>
              )}

              {steps.length > 0 && (
                <div className="map-section">
                  <Map steps={steps} />
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
                            <div className="step-name">{step.name}</div>
                          </div>
                          <div className="step-right">
                            {stepTotal > 0 && <span className="step-total">{stepTotal.toFixed(0)} €</span>}
                            <button className="btn-add-expense" onClick={() => setActiveStepId(activeStepId === step.id ? null : step.id)}>
                              + Dépense
                            </button>
                            <button className="btn-delete-step" onClick={() => deleteStep(step.id)}>✕</button>
                          </div>
                        </div>

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
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default TripPage