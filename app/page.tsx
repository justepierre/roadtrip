'use client'

import { supabase } from '@/lib/supabase'

export default function Home() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    })
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: #0a0a0a;
          color: #f5f0e8;
          min-height: 100vh;
          overflow: hidden;
        }

        .login-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .login-left {
          position: relative;
          background: #0a0a0a;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 3rem;
          overflow: hidden;
        }

        .login-left::before {
          content: '';
          position: absolute;
          top: -200px;
          left: -200px;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .logo {
          font-family: 'Playfair Display', serif;
          font-size: 1.2rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #d4af37;
        }

        .hero-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 2rem 0;
        }

        .hero-eyebrow {
          font-size: 0.75rem;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #d4af37;
          margin-bottom: 1.5rem;
        }

        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(3rem, 5vw, 5rem);
          line-height: 1.05;
          color: #f5f0e8;
          margin-bottom: 2rem;
        }

        .hero-title em {
          font-style: italic;
          color: #d4af37;
        }

        .hero-subtitle {
          font-size: 1rem;
          font-weight: 300;
          color: #8a8070;
          max-width: 380px;
          line-height: 1.7;
        }

        .login-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .btn-google {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #f5f0e8;
          color: #0a0a0a;
          border: none;
          padding: 1rem 1.5rem;
          border-radius: 4px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          width: fit-content;
        }

        .btn-google:hover {
          background: #d4af37;
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(212, 175, 55, 0.3);
        }

        .footer-text {
          font-size: 0.75rem;
          color: #3a3530;
          letter-spacing: 0.05em;
        }

        .login-right {
          position: relative;
          background: #111;
          overflow: hidden;
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(212, 175, 55, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212, 175, 55, 0.05) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .destination-cards {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          padding: 2rem;
        }

        .dest-card {
          background: rgba(245, 240, 232, 0.04);
          border: 1px solid rgba(212, 175, 55, 0.15);
          border-radius: 8px;
          padding: 1.25rem 1.75rem;
          width: 280px;
          backdrop-filter: blur(10px);
          animation: float 6s ease-in-out infinite;
        }

        .dest-card:nth-child(2) { animation-delay: -2s; transform: translateX(40px); }
        .dest-card:nth-child(3) { animation-delay: -4s; transform: translateX(-20px); }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .dest-card:nth-child(2) {
          animation: float2 6s ease-in-out infinite;
          animation-delay: -2s;
        }

        @keyframes float2 {
          0%, 100% { transform: translateX(40px) translateY(0px); }
          50% { transform: translateX(40px) translateY(-10px); }
        }

        .dest-name {
          font-family: 'Playfair Display', serif;
          font-size: 1.1rem;
          color: #f5f0e8;
          margin-bottom: 0.25rem;
        }

        .dest-meta {
          font-size: 0.75rem;
          color: #8a8070;
          letter-spacing: 0.05em;
        }

        .dest-budget {
          margin-top: 0.75rem;
          font-size: 0.85rem;
          color: #d4af37;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .login-page { grid-template-columns: 1fr; }
          .login-right { display: none; }
        }
      `}</style>

      <div className="login-page">
        <div className="login-left">
          <div className="logo">Roadtrip</div>

          <div className="hero-text">
            <p className="hero-eyebrow">Planificateur de voyages</p>
            <h1 className="hero-title">
              Chaque route<br />
              raconte une<br />
              <em>histoire.</em>
            </h1>
            <p className="hero-subtitle">
              Planifiez vos itinéraires, suivez vos dépenses
              et visualisez vos aventures sur une carte interactive.
            </p>
          </div>

          <div className="login-actions">
            <button className="btn-google" onClick={handleGoogleLogin}>
              <img src="https://www.google.com/favicon.ico" alt="Google" width={16} height={16} />
              Continuer avec Google
            </button>
            <p className="footer-text">Vos voyages. Votre histoire.</p>
          </div>
        </div>

        <div className="login-right">
          <div className="grid-overlay" />
          <div className="destination-cards">
            <div className="dest-card">
              <div className="dest-name">Route des Alpes</div>
              <div className="dest-meta">8 étapes · 14 jours</div>
              <div className="dest-budget">2 340 €</div>
            </div>
            <div className="dest-card">
              <div className="dest-name">Côte Atlantique</div>
              <div className="dest-meta">5 étapes · 7 jours</div>
              <div className="dest-budget">1 180 €</div>
            </div>
            <div className="dest-card">
              <div className="dest-name">Tour de Bretagne</div>
              <div className="dest-meta">6 étapes · 10 jours</div>
              <div className="dest-budget">890 €</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}