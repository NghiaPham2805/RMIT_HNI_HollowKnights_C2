'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import type { AppState, PortfolioSubmission } from '../api/portfolios/route'

const TAG = 'identity'

export default function ReviewPage() {
  const { authenticated, login, doDecrypt, hasRealmRole, getValueFromIdToken, getValueFromToken } = useTideCloak()

  const [state, setState] = useState<AppState>({ stage: '1. Blind Review', portfolios: [] })
  const [loading, setLoading] = useState(true)

  // Decryption state map: portfolioId -> { loading, data, error }
  const [decryptions, setDecryptions] = useState<
    Record<string, { loading?: boolean; data?: any; error?: string }>
  >({})

  // Scoring state
  const [scoringFor, setScoringFor] = useState<string | null>(null)
  const [scores, setScores] = useState({
    codeQuality: 8,
    designReasoning: 8,
    testing: 8,
    notes: '',
  })
  const [scoreSaving, setScoreSaving] = useState(false)

  const username = getValueFromIdToken('preferred_username') || 'Reviewer'
  const clientRoles = getValueFromToken('resource_access')?.myclient?.roles || []
  const hasDecryptRole = hasRealmRole(`_tide_${TAG}.selfdecrypt`)

  const loadPortfolios = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolios')
      if (res.ok) {
        const data = await res.json()
        setState(data)
      }
    } catch (err) {
      console.error('Failed to load portfolios:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPortfolios()
  }, [loadPortfolios])

  const handleRevealIdentity = async (portfolio: PortfolioSubmission) => {
    setDecryptions((prev) => ({
      ...prev,
      [portfolio.id]: { loading: true },
    }))

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
      console.error('[ReviewPage] Real TideCloak error:', err)
      // Never fake failure - display exact Tide error message
      setDecryptions((prev) => ({
        ...prev,
        [portfolio.id]: { loading: false, error: err.message || String(err) },
      }))
    }
  }

  const handleChangeStage = async (newStage: AppState['stage']) => {
    try {
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setStage', stage: newStage }),
      })
      if (res.ok) {
        setState((prev) => ({ ...prev, stage: newStage }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scoringFor) return
    setScoreSaving(true)
    try {
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'score',
          portfolioId: scoringFor,
          score: {
            reviewer: username,
            codeQuality: Number(scores.codeQuality),
            designReasoning: Number(scores.designReasoning),
            testing: Number(scores.testing),
            notes: scores.notes,
          },
        }),
      })
      if (res.ok) {
        await loadPortfolios()
        setScoringFor(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setScoreSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentStage={state.stage} />

      <main style={mainContentStyle}>
        {/* Header with Stage Controller */}
        <div style={pageHeaderStyle}>
          <div>
            <div style={badgeStyle}>Reviewer Board</div>
            <h1 style={titleStyle}>Blind Candidate Evaluation</h1>
            <p style={subtitleStyle}>
              Review engineering portfolios without personal bias. Identity fields are hardware-isolated.
            </p>
          </div>

          {/* Stage Controls */}
          <div style={stagePillGroupStyle}>
            {(['1. Blind Review', '2. Shortlist', '3. Reveal'] as AppState['stage'][]).map((st) => (
              <button
                key={st}
                onClick={() => handleChangeStage(st)}
                style={{
                  ...stageBtnStyle,
                  ...(state.stage === st ? activeStageBtnStyle : {}),
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Security & Role Callout Banner */}
        <div style={bannerCardStyle}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🛡️</span>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.2rem' }}>
                Cryptographic Enforcement Architecture
              </div>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                Switching the review stage above changes the workflow state in <code>portfolios.json</code>.
                However, <strong>the application server has no administrative power to reveal identities</strong>.
                Actual decryption is only unlocked when the administrator grants <code>_tide_identity.selfdecrypt</code> in
                the TideCloak Admin Console.
              </p>
            </div>
          </div>
        </div>

        {/* Portfolios Feed */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
            Loading candidate portfolios...
          </div>
        ) : state.portfolios.length === 0 ? (
          <div style={emptyCardStyle}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📭</div>
            <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', marginBottom: '0.5rem' }}>No Submissions Found</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Head to the applicant portal to submit your work or load 5 synthetic profiles.
            </p>
            <Link href="/apply" style={primaryBtnStyle}>
              Open /apply to Seed Candidates
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {state.portfolios.map((portfolio, idx) => {
              const decState = decryptions[portfolio.id]
              const averageScore = portfolio.scores?.length
                ? (
                    portfolio.scores.reduce(
                      (acc, s) => acc + (s.codeQuality + s.designReasoning + s.testing) / 3,
                      0
                    ) / portfolio.scores.length
                  ).toFixed(1)
                : null

              return (
                <div key={portfolio.id} style={candidateCardStyle}>
                  {/* Top Bar */}
                  <div style={cardHeaderRowStyle}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span style={candidateBadgeStyle}>Candidate #{idx + 1}</span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                          ID: {portfolio.id.slice(0, 14)}
                        </span>
                      </div>
                      <h2 style={candidateTitleStyle}>{portfolio.portfolioTitle}</h2>
                    </div>

                    {averageScore ? (
                      <div style={scorePillStyle}>
                        <span style={{ color: '#34d399' }}>★</span> {averageScore} / 10
                      </div>
                    ) : (
                      <div style={{ ...scorePillStyle, background: 'rgba(255, 255, 255, 0.04)', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        Unscored
                      </div>
                    )}
                  </div>

                  {/* Portfolio Work Details */}
                  <div style={descriptionBoxStyle}>
                    <div style={descLabelStyle}>Architecture & Technical Work:</div>
                    <p style={{ margin: 0, fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.6 }}>
                      {portfolio.portfolioDescription || '(No description provided)'}
                    </p>
                  </div>

                  {/* Blind Identity Card with Real TideCloak Decrypt */}
                  <div style={blindSectionStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={lockIconBoxStyle}>🔒</div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                            Applicant Identity Sealed
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Zero-knowledge encrypted under tag <code>"identity"</code>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRevealIdentity(portfolio)}
                        disabled={decState?.loading}
                        style={tryRevealBtnStyle}
                      >
                        {decState?.loading ? 'Calling TideCloak...' : '🔓 Try to reveal identity'}
                      </button>
                    </div>

                    {/* Reveal Result State */}
                    {decState && !decState.loading && (
                      <div style={{ marginTop: '1rem' }}>
                        {decState.error && (
                          <div style={errorBannerStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                              <span>❌</span> TideCloak Enclave Authorization Denied:
                            </div>
                            <div style={errorCodeStyle}>{decState.error}</div>
                            <div style={{ fontSize: '0.75rem', color: '#fda4af', marginTop: '0.35rem' }}>
                              Real cryptographic failure from Tide: reviewer session lacks <code>_tide_identity.selfdecrypt</code> role.
                            </div>
                          </div>
                        )}

                        {decState.data && (
                          <div style={successBannerStyle}>
                            <div style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>🎉</span> Identity Unblinded via Tide Decryption:
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                              <div>
                                <span style={metaLabelStyle}>Full Name:</span>
                                <div style={metaValueStyle}>{decState.data.name || decState.data.raw}</div>
                              </div>
                              <div>
                                <span style={metaLabelStyle}>Contact Email:</span>
                                <div style={metaValueStyle}>{decState.data.email || '—'}</div>
                              </div>
                              <div>
                                <span style={metaLabelStyle}>Institution:</span>
                                <div style={metaValueStyle}>{decState.data.school || '—'}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer & Scoring Action */}
                  <div style={cardFooterRowStyle}>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {portfolio.scores?.length
                        ? `Reviewed by ${portfolio.scores.length} evaluator(s)`
                        : 'Awaiting initial evaluation'}
                    </div>

                    <button
                      onClick={() => {
                        setScoringFor(portfolio.id)
                        setScores({ codeQuality: 8, designReasoning: 8, testing: 8, notes: '' })
                      }}
                      style={scoreActionBtnStyle}
                    >
                      <span>📝</span> Score this Candidate
                    </button>
                  </div>

                  {/* Inline Criteria Scoring Modal/Drawer */}
                  {scoringFor === portfolio.id && (
                    <form onSubmit={handleScoreSubmit} style={scoringPanelStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                          Score Candidate #{idx + 1}
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Scale: 1 (Lowest) to 10 (Highest)</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <label style={criteriaLabelStyle}>Code Architecture (1-10)</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={scores.codeQuality}
                            onChange={(e) => setScores({ ...scores, codeQuality: Number(e.target.value) })}
                            style={criteriaInputStyle}
                            required
                          />
                        </div>
                        <div>
                          <label style={criteriaLabelStyle}>Design Reasoning (1-10)</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={scores.designReasoning}
                            onChange={(e) => setScores({ ...scores, designReasoning: Number(e.target.value) })}
                            style={criteriaInputStyle}
                            required
                          />
                        </div>
                        <div>
                          <label style={criteriaLabelStyle}>Testing & Robustness (1-10)</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={scores.testing}
                            onChange={(e) => setScores({ ...scores, testing: Number(e.target.value) })}
                            style={criteriaInputStyle}
                            required
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={criteriaLabelStyle}>Reviewer Feedback & Merits</label>
                        <textarea
                          rows={2}
                          value={scores.notes}
                          onChange={(e) => setScores({ ...scores, notes: e.target.value })}
                          placeholder="Technical rationale for scores..."
                          style={criteriaTextareaStyle}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setScoringFor(null)}
                          style={cancelBtnStyle}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={scoreSaving}
                          style={submitScoreBtnStyle}
                        >
                          {scoreSaving ? 'Saving Score...' : 'Submit Evaluation'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )
            })}
          </div>
        )}
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
  padding: '2.5rem 1.5rem',
  width: '100%',
}

const pageHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: '1.5rem',
  marginBottom: '1.5rem',
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  padding: '0.2rem 0.6rem',
  borderRadius: '999px',
  background: 'rgba(99, 102, 241, 0.15)',
  color: '#818cf8',
  border: '1px solid rgba(99, 102, 241, 0.3)',
  marginBottom: '0.5rem',
}

const titleStyle: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 800,
  color: '#f8fafc',
  letterSpacing: '-0.02em',
}

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.92rem',
  color: '#94a3b8',
  maxWidth: '650px',
  marginTop: '0.35rem',
}

const stagePillGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.35rem',
  background: 'rgba(18, 24, 38, 0.8)',
  padding: '0.35rem',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
}

const stageBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  fontSize: '0.8rem',
  fontWeight: 700,
  borderRadius: '8px',
  background: 'transparent',
  color: '#94a3b8',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

const activeStageBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
  color: '#ffffff',
  boxShadow: '0 0 15px rgba(6, 182, 212, 0.35)',
}

const bannerCardStyle: React.CSSProperties = {
  background: 'rgba(18, 24, 38, 0.65)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '14px',
  padding: '1.25rem 1.5rem',
  marginBottom: '2rem',
  backdropFilter: 'blur(12px)',
}

const candidateCardStyle: React.CSSProperties = {
  background: 'rgba(18, 24, 38, 0.75)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '16px',
  padding: '1.75rem',
  boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(16px)',
}

const cardHeaderRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
  marginBottom: '1rem',
}

const candidateBadgeStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  padding: '0.15rem 0.5rem',
  borderRadius: '4px',
  background: 'rgba(6, 182, 212, 0.15)',
  color: '#67e8f9',
}

const candidateTitleStyle: React.CSSProperties = {
  fontSize: '1.35rem',
  fontWeight: 700,
  color: '#f8fafc',
  letterSpacing: '-0.01em',
}

const scorePillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.45rem 0.85rem',
  borderRadius: '8px',
  background: 'rgba(16, 185, 129, 0.12)',
  color: '#34d399',
  border: '1px solid rgba(16, 185, 129, 0.25)',
  fontWeight: 700,
  fontSize: '0.9rem',
}

const descriptionBoxStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: '10px',
  padding: '1rem 1.25rem',
  marginBottom: '1.25rem',
}

const descLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#64748b',
  letterSpacing: '0.05em',
  marginBottom: '0.4rem',
}

const blindSectionStyle: React.CSSProperties = {
  background: 'rgba(10, 13, 20, 0.7)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  padding: '1.25rem',
  marginBottom: '1.25rem',
}

const lockIconBoxStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1rem',
}

const tryRevealBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#f8fafc',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const errorBannerStyle: React.CSSProperties = {
  background: 'rgba(244, 63, 94, 0.1)',
  border: '1px solid rgba(244, 63, 94, 0.25)',
  borderRadius: '8px',
  padding: '0.85rem 1rem',
  color: '#fb7185',
  fontSize: '0.82rem',
}

const errorCodeStyle: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '0.78rem',
  background: 'rgba(0, 0, 0, 0.3)',
  padding: '0.35rem 0.6rem',
  borderRadius: '6px',
  wordBreak: 'break-all',
  display: 'inline-block',
  marginTop: '0.2rem',
}

const successBannerStyle: React.CSSProperties = {
  background: 'rgba(16, 185, 129, 0.12)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  borderRadius: '8px',
  padding: '1rem 1.25rem',
  color: '#34d399',
  fontSize: '0.85rem',
}

const metaLabelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#94a3b8',
  display: 'block',
}

const metaValueStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 700,
  color: '#f8fafc',
  marginTop: '0.15rem',
}

const cardFooterRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingTop: '0.75rem',
  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
}

const scoreActionBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  background: 'rgba(99, 102, 241, 0.15)',
  border: '1px solid rgba(99, 102, 241, 0.35)',
  color: '#a5b4fc',
  fontSize: '0.82rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const scoringPanelStyle: React.CSSProperties = {
  marginTop: '1.25rem',
  background: 'rgba(10, 13, 20, 0.85)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '1.25rem',
}

const criteriaLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#cbd5e1',
  marginBottom: '0.35rem',
}

const criteriaInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  borderRadius: '6px',
  background: 'rgba(18, 24, 38, 0.9)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#f8fafc',
  fontSize: '0.85rem',
  boxSizing: 'border-box',
}

const criteriaTextareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  borderRadius: '6px',
  background: 'rgba(18, 24, 38, 0.9)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#f8fafc',
  fontSize: '0.85rem',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  background: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#94a3b8',
  fontSize: '0.82rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const submitScoreBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
  border: 'none',
  color: '#ffffff',
  fontSize: '0.82rem',
  fontWeight: 700,
  cursor: 'pointer',
}

const emptyCardStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '4rem 1.5rem',
  background: 'rgba(18, 24, 38, 0.65)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '16px',
}

const primaryBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  padding: '0.65rem 1.4rem',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
  color: '#ffffff',
  fontSize: '0.88rem',
  fontWeight: 700,
  textDecoration: 'none',
}
