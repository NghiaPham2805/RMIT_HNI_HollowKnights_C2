'use client'

import { useState, useEffect } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import Link from 'next/link'
import Navbar from '../components/Navbar'

export default function HomePage() {
  const { authenticated, login, getValueFromIdToken, hasRealmRole, getValueFromToken } = useTideCloak()

  const [stats, setStats] = useState({ total: 0, stage: '1. Blind Review' })
  const username = getValueFromIdToken('preferred_username') || 'Guest'
  const hasDecrypt = hasRealmRole('_tide_identity.selfdecrypt')
  const hasEncrypt = hasRealmRole('_tide_identity.selfencrypt')
  const clientRoles = getValueFromToken('resource_access')?.myclient?.roles || []

  useEffect(() => {
    fetch('/api/portfolios')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.portfolios) {
          setStats({ total: data.portfolios.length, stage: data.stage })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentStage={stats.stage} />

      <main style={mainContentStyle}>
        {/* Hero Section */}
        <div style={heroSectionStyle}>
          <div style={statusPillStyle}>
            <span style={pulsingDotStyle} />
            <span>Cryptographic State: <strong>{stats.stage}</strong></span>
          </div>

          <h1 style={heroHeadlineStyle}>
            Bias-Free Evaluation with <br />
            <span style={gradientTextStyle}>Decentralized Confidentiality</span>
          </h1>

          <p style={heroSubtextStyle}>
            Blind Portfolio Review seals candidate names, emails, and academic backgrounds in browser-side
            hardware enclaves using TideCloak tag-based cryptography. Reviewers evaluate purely on merits
            until threshold consensus authorizes unblinding.
          </p>

          <div style={heroActionsStyle}>
            <Link href="/apply" style={primaryActionBtnStyle}>
              <span>📝</span> Apply as Candidate
            </Link>
            <Link href="/review" style={secondaryActionBtnStyle}>
              <span>⚖️</span> Review Portfolios ({stats.total})
            </Link>
            <Link href="/reveal" style={tertiaryActionBtnStyle}>
              <span>🔓</span> Reveal Shortlist
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div style={gridStyle}>
          {/* Card 1 */}
          <div style={featureCardStyle}>
            <div style={cardIconStyle('#06b6d4')}>🔒</div>
            <h3 style={cardTitleStyle}>Zero-Knowledge Submissions</h3>
            <p style={cardDescStyle}>
              Identity fields are encrypted directly in the client browser with Tide tag <code>"identity"</code>.
              The application server and databases store <strong>only ciphertext</strong>.
            </p>
            <Link href="/apply" style={cardLinkStyle('#06b6d4')}>
              Open Candidate Portal →
            </Link>
          </div>

          {/* Card 2 */}
          <div style={featureCardStyle}>
            <div style={cardIconStyle('#6366f1')}>⚖️</div>
            <h3 style={cardTitleStyle}>Cryptographic Blind Review</h3>
            <p style={cardDescStyle}>
              Reviewers assess code quality, architecture reasoning, and test depth. Identity is locked behind
              decentralized ORK nodes and cannot be unlocked by client hacks or database reads.
            </p>
            <Link href="/review" style={cardLinkStyle('#6366f1')}>
              Open Reviewer Board →
            </Link>
          </div>

          {/* Card 3 */}
          <div style={featureCardStyle}>
            <div style={cardIconStyle('#10b981')}>🛡️</div>
            <h3 style={cardTitleStyle}>Role-Gated Unblinding</h3>
            <p style={cardDescStyle}>
              Moving to Stage 3 doesn't flip a UI toggle. Unblinding requires the administrator to grant
              <code>_tide_identity.selfdecrypt</code> in the TideCloak IAM console.
            </p>
            <Link href="/reveal" style={cardLinkStyle('#10b981')}>
              Lead Reveal Console →
            </Link>
          </div>
        </div>

        {/* Current Auth Diagnostic Banner */}
        <div style={diagnosticCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
                Active Identity Token Context
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>
                {authenticated ? `Logged in as: ${username}` : 'Unauthenticated Session'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={infoPillStyle}>
                Client Roles: <strong>{clientRoles.join(', ') || 'none'}</strong>
              </div>
              <div style={infoPillStyle}>
                Tag Encrypt: <strong style={{ color: hasEncrypt ? '#34d399' : '#f87171' }}>{hasEncrypt ? 'YES' : 'NO'}</strong>
              </div>
              <div style={infoPillStyle}>
                Tag Decrypt: <strong style={{ color: hasDecrypt ? '#34d399' : '#f87171' }}>{hasDecrypt ? 'YES' : 'NO'}</strong>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const mainContentStyle: React.CSSProperties = {
  maxWidth: '1280px',
  margin: '0 auto',
  padding: '3rem 1.5rem',
  width: '100%',
}

const heroSectionStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '3rem 1rem 4rem',
  maxWidth: '900px',
  margin: '0 auto',
}

const statusPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.35rem 0.9rem',
  borderRadius: '999px',
  background: 'rgba(99, 102, 241, 0.1)',
  border: '1px solid rgba(99, 102, 241, 0.25)',
  fontSize: '0.8rem',
  color: '#c7d2fe',
  marginBottom: '1.5rem',
}

const pulsingDotStyle: React.CSSProperties = {
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  backgroundColor: '#06b6d4',
  boxShadow: '0 0 10px #06b6d4',
}

const heroHeadlineStyle: React.CSSProperties = {
  fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)',
  fontWeight: 800,
  letterSpacing: '-0.025em',
  lineHeight: 1.15,
  color: '#f8fafc',
  marginBottom: '1.25rem',
}

const gradientTextStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #06b6d4 0%, #818cf8 50%, #c084fc 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}

const heroSubtextStyle: React.CSSProperties = {
  fontSize: '1.05rem',
  color: '#94a3b8',
  lineHeight: 1.6,
  marginBottom: '2.5rem',
}

const heroActionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '1rem',
  flexWrap: 'wrap',
}

const primaryActionBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1.6rem',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
  color: '#ffffff',
  fontSize: '0.92rem',
  fontWeight: 700,
  textDecoration: 'none',
  boxShadow: '0 0 25px rgba(6, 182, 212, 0.35)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
}

const secondaryActionBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1.6rem',
  borderRadius: '10px',
  background: 'rgba(255, 255, 255, 0.05)',
  color: '#f8fafc',
  fontSize: '0.92rem',
  fontWeight: 600,
  textDecoration: 'none',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  backdropFilter: 'blur(10px)',
}

const tertiaryActionBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1.6rem',
  borderRadius: '10px',
  background: 'rgba(16, 185, 129, 0.1)',
  color: '#34d399',
  fontSize: '0.92rem',
  fontWeight: 600,
  textDecoration: 'none',
  border: '1px solid rgba(16, 185, 129, 0.25)',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '1.5rem',
  marginBottom: '3rem',
}

const featureCardStyle: React.CSSProperties = {
  background: 'rgba(18, 24, 38, 0.65)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '16px',
  padding: '2rem',
  boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(12px)',
  display: 'flex',
  flexDirection: 'column',
}

const cardIconStyle = (color: string): React.CSSProperties => ({
  width: '46px',
  height: '46px',
  borderRadius: '12px',
  background: `${color}15`,
  border: `1px solid ${color}40`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.3rem',
  marginBottom: '1.25rem',
})

const cardTitleStyle: React.CSSProperties = {
  fontSize: '1.18rem',
  fontWeight: 700,
  color: '#f8fafc',
  marginBottom: '0.6rem',
}

const cardDescStyle: React.CSSProperties = {
  fontSize: '0.88rem',
  color: '#94a3b8',
  lineHeight: 1.6,
  marginBottom: '1.5rem',
  flexGrow: 1,
}

const cardLinkStyle = (color: string): React.CSSProperties => ({
  fontSize: '0.85rem',
  fontWeight: 600,
  color: color,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
})

const diagnosticCardStyle: React.CSSProperties = {
  background: 'rgba(15, 20, 32, 0.8)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  padding: '1.25rem 1.5rem',
}

const infoPillStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  padding: '0.35rem 0.75rem',
  borderRadius: '6px',
  color: '#94a3b8',
}
