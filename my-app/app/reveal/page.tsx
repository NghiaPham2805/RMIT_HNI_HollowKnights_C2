'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import Link from 'next/link'
import type { AppState, PortfolioSubmission } from '../api/portfolios/route'

const TAG = 'identity'

export default function RevealPage() {
  const { authenticated, login, doDecrypt, hasRealmRole, hasClientRole, getValueFromIdToken, getValueFromToken } = useTideCloak()

  const [state, setState] = useState<AppState>({ stage: '3. Reveal', portfolios: [] })
  const [loading, setLoading] = useState(true)

  // Decryption state map: portfolioId -> { loading, data, error }
  const [decryptions, setDecryptions] = useState<
    Record<string, { loading?: boolean; data?: any; error?: string }>
  >({})
  const [decryptAllRunning, setDecryptAllRunning] = useState(false)

  const username = getValueFromIdToken('preferred_username') || 'Lead'
  const isHiringLead = hasClientRole('hiring-lead')
  const hasDecryptRole = hasRealmRole(`_tide_${TAG}.selfdecrypt`)

  const loadPortfolios = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolios')
      if (res.ok) {
        const data = await res.json()
        setState(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPortfolios()
  }, [loadPortfolios])

  const decryptItem = async (portfolio: PortfolioSubmission) => {
    setDecryptions((prev) => ({ ...prev, [portfolio.id]: { loading: true } }))
    try {
      const [pt] = await doDecrypt([
        {
          encrypted: portfolio.encryptedIdentity,
          tags: [TAG],
        },
      ])
      let parsed: any = null
      try {
        parsed = JSON.parse(String(pt))
      } catch {
        parsed = { raw: String(pt) }
      }
      setDecryptions((prev) => ({
        ...prev,
        [portfolio.id]: { loading: false, data: parsed },
      }))
    } catch (err: any) {
      setDecryptions((prev) => ({
        ...prev,
        [portfolio.id]: { loading: false, error: err.message || String(err) },
      }))
    }
  }

  const handleRevealAll = async () => {
    setDecryptAllRunning(true)
    for (const p of state.portfolios) {
      await decryptItem(p)
    }
    setDecryptAllRunning(false)
  }

  return (
    <div style={pageContainerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Hiring Lead Dashboard — /reveal</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.88rem' }}>
            Final Candidate Unblinding: Decrypt shortlisted applicant identities once authorized.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/apply" style={navLinkStyle}>+ Apply</Link>
          <Link href="/review" style={navLinkStyle}>← Reviewer Board</Link>
        </div>
      </header>

      {/* Stage & Authorization Status */}
      <div style={statusCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>
              Current Stage: <strong>{state.stage}</strong>
            </div>
            <div style={{ fontSize: '1rem', marginTop: '0.2rem' }}>
              Logged in as: <strong>{username}</strong> (Client Role hiring-lead:{' '}
              {isHiringLead ? <span style={{ color: '#137333' }}>✓ YES</span> : <span style={{ color: '#c5221f' }}>✗ NO</span>})
            </div>
          </div>

          <div>
            <button
              onClick={handleRevealAll}
              disabled={decryptAllRunning || state.portfolios.length === 0}
              style={{ ...primaryBtnStyle, background: '#137333' }}
            >
              {decryptAllRunning ? 'Decrypting via TideCloak...' : '🔓 Reveal All Shortlisted Identities'}
            </button>
          </div>
        </div>

        {/* Step-by-step role admin guide */}
        <div style={adminGuideStyle}>
          <div style={{ fontWeight: 600, color: '#1a73e8', marginBottom: '0.3rem' }}>
            📋 TideCloak Admin Console Role Switch Procedure:
          </div>
          <ol style={{ margin: 0, paddingLeft: '1.2rem', color: '#444', lineHeight: 1.5, fontSize: '0.82rem' }}>
            <li>
              <strong>Stage 1 & 2 (Blind Review):</strong> Ensure Reviewers & Hiring Leads hold <em>NO</em>{' '}
              <code>_tide_identity.selfdecrypt</code>. Decryption fails client-side & in enclave.
            </li>
            <li>
              <strong>Stage 3 (Reveal Stage):</strong> Admin logs into TideCloak (<code>http://localhost:8080</code>),
              assigns realm role <code>_tide_identity.selfdecrypt</code> to the hiring lead user (e.g. <code>lead1</code>).
            </li>
            <li>
              Lead re-authenticates (logs out & logs in) to receive the updated token claim.
            </li>
            <li>
              Clicking <strong>"Reveal"</strong> now decrypts the applicant names, emails, and institutions!
            </li>
          </ol>
        </div>
      </div>

      {/* Candidate List */}
      {loading ? (
        <p>Loading candidate portfolios...</p>
      ) : state.portfolios.length === 0 ? (
        <div style={cardStyle}>
          <p style={{ color: '#666' }}>No portfolios available to reveal.</p>
          <Link href="/apply" style={primaryBtnStyle}>Go to /apply to submit portfolios</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {state.portfolios.map((portfolio, idx) => {
            const dec = decryptions[portfolio.id]
            const avgScore = portfolio.scores?.length
              ? (
                  portfolio.scores.reduce(
                    (acc, s) => acc + (s.codeQuality + s.designReasoning + s.testing) / 3,
                    0
                  ) / portfolio.scores.length
                ).toFixed(1)
              : 'N/A'

            return (
              <div key={portfolio.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={badgeStyle}>Candidate #{idx + 1}</span>
                    <h3 style={{ margin: '0.3rem 0', fontSize: '1.15rem' }}>{portfolio.portfolioTitle}</h3>
                    <p style={{ margin: 0, color: '#555', fontSize: '0.88rem' }}>
                      {portfolio.portfolioDescription || 'No description'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#777' }}>Average Review Score:</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1a73e8' }}>
                      ★ {avgScore} / 10
                    </div>
                  </div>
                </div>

                {/* Identity Reveal Area */}
                <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '0.75rem' }}>
                  {dec?.data ? (
                    <div style={unblindedBoxStyle}>
                      <div style={{ fontWeight: 700, color: '#137333', marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                        🎉 Unblinded Identity (Decrypted from Tide):
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <div><strong>Candidate Name:</strong> {dec.data.name || dec.data.raw}</div>
                        <div><strong>Email:</strong> {dec.data.email || '—'}</div>
                        <div><strong>Institution:</strong> {dec.data.school || '—'}</div>
                      </div>
                    </div>
                  ) : dec?.error ? (
                    <div style={errorBoxStyle}>
                      <strong>❌ Decryption Denied by TideCloak:</strong>
                      <div style={{ marginTop: '0.2rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {dec.error}
                      </div>
                      <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#666' }}>
                        Grant <code>_tide_identity.selfdecrypt</code> in TideCloak Admin Console to authorize reveal.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.82rem', color: '#666' }}>
                        🔒 Identity is currently encrypted ciphertext on disk.
                      </div>
                      <button
                        onClick={() => decryptItem(portfolio)}
                        disabled={dec?.loading}
                        style={secondaryBtnStyle}
                      >
                        {dec?.loading ? 'Decrypting...' : 'Reveal Candidate Identity'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const pageContainerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem 1rem',
  fontFamily: 'system-ui, -apple-system, sans-serif',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.25rem',
  borderBottom: '1px solid #e0e0e0',
  paddingBottom: '1rem',
}

const navLinkStyle: React.CSSProperties = {
  padding: '0.4rem 0.8rem',
  fontSize: '0.85rem',
  color: '#0070f3',
  background: '#fff',
  border: '1px solid #d0d7de',
  borderRadius: '4px',
  textDecoration: 'none',
}

const statusCardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '8px',
  border: '1px solid #d0d7de',
  padding: '1.25rem',
  marginBottom: '1.25rem',
  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
}

const adminGuideStyle: React.CSSProperties = {
  marginTop: '0.85rem',
  padding: '0.75rem 1rem',
  background: '#f8f9fa',
  borderRadius: '6px',
  border: '1px solid #e9ecef',
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '8px',
  border: '1px solid #e1e4e8',
  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
  padding: '1.25rem',
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  background: '#e8f0fe',
  color: '#1a73e8',
  fontWeight: 600,
  fontSize: '0.75rem',
  padding: '0.15rem 0.5rem',
  borderRadius: '4px',
}

const unblindedBoxStyle: React.CSSProperties = {
  background: '#e6f4ea',
  border: '1px solid #b7e1cd',
  padding: '0.85rem',
  borderRadius: '6px',
}

const errorBoxStyle: React.CSSProperties = {
  background: '#fce8e6',
  border: '1px solid #f5c2c7',
  color: '#c5221f',
  padding: '0.75rem',
  borderRadius: '6px',
  fontSize: '0.85rem',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '0.55rem 1.1rem',
  fontSize: '0.88rem',
  fontWeight: 600,
  background: '#0070f3',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '0.45rem 0.85rem',
  fontSize: '0.82rem',
  fontWeight: 500,
  background: '#fff',
  color: '#333',
  border: '1px solid #d0d7de',
  borderRadius: '4px',
  cursor: 'pointer',
}

