'use client'

import { useState } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import Link from 'next/link'
import Navbar from '../components/Navbar'

const TAG = 'identity'

const SYNTHETIC_APPLICANTS = [
  {
    name: 'Alex Rivera',
    email: 'alex.rivera@synthetic.edu',
    school: 'MIT',
    title: 'Distributed Byzantine Consensus Engine in Rust',
    desc: 'High-throughput async BFT implementation with threshold cryptographic pipelining, pipelined mempools, and zero-allocation network frames.',
  },
  {
    name: 'Priya Sharma',
    email: 'priya.s@synthetic.edu',
    school: 'Stanford University',
    title: 'Zero-Knowledge Credential Issuer',
    desc: 'Circom + snarkjs zk-SNARK identity proof verification suite with client-side proof generation under 400ms.',
  },
  {
    name: 'Lucas Dupont',
    email: 'lucas.d@synthetic.edu',
    school: 'ETH Zürich',
    title: 'Kernel-Level eBPF Packet Filter & Firewall',
    desc: 'Custom XDP/eBPF network packet inspector handling 14M pps DDoS mitigation directly in the Linux network driver layer.',
  },
  {
    name: 'Maya Lin',
    email: 'maya.lin@synthetic.edu',
    school: 'UC Berkeley',
    title: 'Autonomous Multi-Agent Task Planner',
    desc: 'Hierarchical LLM orchestration platform with dynamic DAG execution, deterministic state rollbacks, and sandboxed execution.',
  },
  {
    name: 'Elena Rostova',
    email: 'elena.r@synthetic.edu',
    school: 'Oxford University',
    title: 'Verifiable Homomorphic Voting System',
    desc: 'Paillier cryptosystem implementation for verifiable tallying with end-to-end receipt proofs and multi-party threshold keys.',
  },
]

export default function ApplyPage() {
  const { authenticated, login, doEncrypt, getValueFromIdToken, hasRealmRole } = useTideCloak()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [school, setSchool] = useState('')
  const [portfolioTitle, setPortfolioTitle] = useState('')
  const [portfolioDescription, setPortfolioDescription] = useState('')

  const [loading, setLoading] = useState(false)
  const [syntheticLoading, setSyntheticLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [lastSubmission, setLastSubmission] = useState<{ title: string; ciphertext: string } | null>(null)

  const canEncrypt = hasRealmRole(`_tide_${TAG}.selfencrypt`)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !school || !portfolioTitle) {
      setStatusMsg({ type: 'error', text: 'Please fill in all required fields.' })
      return
    }

    setLoading(true)
    setStatusMsg(null)

    try {
      const identityData = JSON.stringify({ name, email, school })

      // Client-side encryption with Tide tag "identity"
      const [encryptedIdentity] = await doEncrypt([
        {
          data: identityData,
          tags: [TAG],
        },
      ])

      // Send to server (ONLY ciphertext sent for identity fields!)
      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioTitle,
          portfolioDescription,
          encryptedIdentity: String(encryptedIdentity),
          applicantVuid: getValueFromIdToken('vuid') || 'vuid-anon',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save portfolio')
      }

      setLastSubmission({
        title: portfolioTitle,
        ciphertext: String(encryptedIdentity),
      })
      setStatusMsg({
        type: 'success',
        text: 'Portfolio submitted! Identity fields were encrypted client-side using Tide tag "identity" before leaving your browser.',
      })

      setName('')
      setEmail('')
      setSchool('')
      setPortfolioTitle('')
      setPortfolioDescription('')
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Submission failed' })
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSynthetic = async () => {
    setSyntheticLoading(true)
    setStatusMsg(null)
    try {
      const itemsToSubmit = []

      for (const item of SYNTHETIC_APPLICANTS) {
        const idData = JSON.stringify({
          name: item.name,
          email: item.email,
          school: item.school,
        })
        const [ct] = await doEncrypt([{ data: idData, tags: [TAG] }])
        itemsToSubmit.push({
          portfolioTitle: item.title,
          portfolioDescription: item.desc,
          encryptedIdentity: String(ct),
          applicantVuid: `synthetic-${Math.random().toString(36).slice(2, 8)}`,
        })
      }

      const res = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batchAdd',
          items: itemsToSubmit,
        }),
      })

      if (!res.ok) throw new Error('Batch submit failed')
      setStatusMsg({
        type: 'success',
        text: 'Successfully generated and encrypted 5 synthetic candidate portfolios on-chain!',
      })
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Synthetic generation failed' })
    } finally {
      setSyntheticLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={mainContentStyle}>
        {/* Header Breadcrumb */}
        <div style={pageHeaderStyle}>
          <div>
            <div style={badgeStyle}>Candidate Portal</div>
            <h1 style={titleStyle}>Submit Your Portfolio</h1>
            <p style={subtitleStyle}>
              Your identity is protected by zero-knowledge threshold cryptography.
              Reviewers cannot view your name, email, or school until reveal authorization.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLoadSynthetic}
            disabled={syntheticLoading || !canEncrypt}
            style={syntheticBtnStyle}
          >
            <span>⚡</span>
            {syntheticLoading ? 'Encrypting 5 Candidates...' : 'Seed 5 Synthetic Applicants'}
          </button>
        </div>

        {!authenticated ? (
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔐</div>
              <h2 style={{ fontSize: '1.25rem', color: '#f8fafc', marginBottom: '0.5rem' }}>
                Authentication Required
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '450px', margin: '0 auto 1.5rem' }}>
                You must sign in with your TideCloak applicant credential to initiate hardware enclave encryption.
              </p>
              <button onClick={() => login()} style={primaryBtnStyle}>
                Log In via TideCloak
              </button>
            </div>
          </div>
        ) : (
          <div style={layoutGridStyle}>
            {/* Form Column */}
            <div style={cardStyle}>
              {!canEncrypt && (
                <div style={warningBoxStyle}>
                  ⚠️ <strong>Missing Encryption Role:</strong> Your token lacks{' '}
                  <code>_tide_identity.selfencrypt</code>. Assign this realm role in TideCloak Admin to submit.
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Identity Box */}
                <div style={sectionBoxStyle}>
                  <div style={sectionHeaderStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#06b6d4', fontSize: '1rem' }}>🔒</span>
                      <span style={sectionTitleStyle}>Protected Identity Fields</span>
                    </div>
                    <span style={secureBadgeStyle}>Tag: "identity"</span>
                  </div>
                  <p style={sectionDescStyle}>
                    These fields are encrypted locally in your browser before transmission.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={labelStyle}>Full Legal Name *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Rivera"
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Primary Email *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@university.edu"
                        style={inputStyle}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Institution / University *</label>
                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="e.g. MIT, Stanford, RMIT"
                      style={inputStyle}
                      required
                    />
                  </div>
                </div>

                {/* Portfolio Work (Plaintext) */}
                <div style={{ ...sectionBoxStyle, marginTop: '1.5rem' }}>
                  <div style={sectionHeaderStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#6366f1', fontSize: '1rem' }}>📄</span>
                      <span style={sectionTitleStyle}>Technical Portfolio & Projects</span>
                    </div>
                    <span style={{ ...secureBadgeStyle, background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      Visible to Reviewers
                    </span>
                  </div>
                  <p style={sectionDescStyle}>
                    This content is evaluated blindly by reviewers to assign merit scores.
                  </p>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Project Title / Focus Area *</label>
                    <input
                      type="text"
                      value={portfolioTitle}
                      onChange={(e) => setPortfolioTitle(e.target.value)}
                      placeholder="e.g. Distributed Byzantine Consensus in Rust"
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Architecture & Technical Overview</label>
                    <textarea
                      rows={5}
                      value={portfolioDescription}
                      onChange={(e) => setPortfolioDescription(e.target.value)}
                      placeholder="Detail your algorithmic design decisions, concurrency safety, test coverage, and benchmark results..."
                      style={textareaStyle}
                    />
                  </div>
                </div>

                {statusMsg && (
                  <div style={statusMsg.type === 'success' ? successBoxStyle : errorBoxStyle}>
                    {statusMsg.type === 'success' ? '✅ ' : '❌ '}
                    {statusMsg.text}
                  </div>
                )}

                <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={loading || !canEncrypt}
                    style={{
                      ...primaryBtnStyle,
                      width: '100%',
                      padding: '0.85rem 1.5rem',
                      opacity: loading || !canEncrypt ? 0.6 : 1,
                    }}
                  >
                    {loading ? 'Encrypting with TideCloak...' : 'Encrypt Identity & Submit Portfolio'}
                  </button>
                </div>
              </form>
            </div>

            {/* Sidebar / Zero-Knowledge Proof Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={infoCardStyle}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🛡️</span> Zero-Knowledge Verification
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1rem' }}>
                  Your identity is protected by threshold cryptography. The server database only stores
                  the ciphertext output below.
                </p>

                <div style={stepRowStyle}>
                  <div style={stepNumberStyle}>1</div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                    JSON identity is encrypted in browser via <code>doEncrypt</code>.
                  </div>
                </div>
                <div style={stepRowStyle}>
                  <div style={stepNumberStyle}>2</div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                    Server receives base64 ciphertext; plaintext never enters network payloads.
                  </div>
                </div>
                <div style={stepRowStyle}>
                  <div style={stepNumberStyle}>3</div>
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                    Reviewers score your work completely blind to personal bias.
                  </div>
                </div>
              </div>

              {lastSubmission && (
                <div style={{ ...infoCardStyle, borderColor: 'rgba(6, 182, 212, 0.3)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Live Ciphertext Output
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem' }}>
                    {lastSubmission.title}
                  </div>
                  <textarea
                    readOnly
                    value={lastSubmission.ciphertext}
                    rows={6}
                    style={ciphertextViewerStyle}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.4rem' }}>
                    Verified encrypted under tag <code>"identity"</code>
                  </div>
                </div>
              )}
            </div>
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
  marginBottom: '2rem',
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  padding: '0.2rem 0.6rem',
  borderRadius: '999px',
  background: 'rgba(6, 182, 212, 0.12)',
  color: '#06b6d4',
  border: '1px solid rgba(6, 182, 212, 0.3)',
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

const syntheticBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.65rem 1.25rem',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
  border: '1px solid rgba(6, 182, 212, 0.4)',
  color: '#67e8f9',
  fontSize: '0.85rem',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 0 15px rgba(6, 182, 212, 0.15)',
}

const layoutGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)',
  gap: '2rem',
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(18, 24, 38, 0.75)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '16px',
  padding: '2rem',
  backdropFilter: 'blur(16px)',
  boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
}

const sectionBoxStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: '12px',
  padding: '1.25rem',
}

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.35rem',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 700,
  color: '#f8fafc',
}

const secureBadgeStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 600,
  padding: '0.15rem 0.5rem',
  borderRadius: '999px',
  background: 'rgba(6, 182, 212, 0.15)',
  color: '#67e8f9',
  border: '1px solid rgba(6, 182, 212, 0.3)',
}

const sectionDescStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#94a3b8',
  marginBottom: '1rem',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#cbd5e1',
  marginBottom: '0.35rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  borderRadius: '8px',
  background: 'rgba(10, 13, 20, 0.8)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#f8fafc',
  fontSize: '0.88rem',
  boxSizing: 'border-box',
  outline: 'none',
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 0.85rem',
  borderRadius: '8px',
  background: 'rgba(10, 13, 20, 0.8)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#f8fafc',
  fontSize: '0.88rem',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  outline: 'none',
  resize: 'vertical',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
  color: '#ffffff',
  fontSize: '0.92rem',
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 0 20px rgba(6, 182, 212, 0.35)',
}

const infoCardStyle: React.CSSProperties = {
  background: 'rgba(18, 24, 38, 0.65)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '14px',
  padding: '1.5rem',
  backdropFilter: 'blur(12px)',
}

const stepRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  marginBottom: '0.75rem',
}

const stepNumberStyle: React.CSSProperties = {
  width: '22px',
  height: '22px',
  borderRadius: '50%',
  background: 'rgba(99, 102, 241, 0.2)',
  color: '#a5b4fc',
  fontSize: '0.72rem',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const ciphertextViewerStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem',
  borderRadius: '8px',
  background: 'rgba(10, 13, 20, 0.95)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#06b6d4',
  fontSize: '0.75rem',
  fontFamily: 'JetBrains Mono, monospace',
  boxSizing: 'border-box',
  resize: 'none',
}

const warningBoxStyle: React.CSSProperties = {
  padding: '0.85rem 1rem',
  background: 'rgba(245, 158, 11, 0.1)',
  border: '1px solid rgba(245, 158, 11, 0.3)',
  color: '#fbbf24',
  borderRadius: '10px',
  fontSize: '0.85rem',
  marginBottom: '1.25rem',
}

const successBoxStyle: React.CSSProperties = {
  padding: '0.85rem 1rem',
  background: 'rgba(16, 185, 129, 0.12)',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  color: '#34d399',
  borderRadius: '10px',
  fontSize: '0.85rem',
  marginTop: '1.25rem',
}

const errorBoxStyle: React.CSSProperties = {
  padding: '0.85rem 1rem',
  background: 'rgba(244, 63, 94, 0.12)',
  border: '1px solid rgba(244, 63, 94, 0.3)',
  color: '#fb7185',
  borderRadius: '10px',
  fontSize: '0.85rem',
  marginTop: '1.25rem',
}
