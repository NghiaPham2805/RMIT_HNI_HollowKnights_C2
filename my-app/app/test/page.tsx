'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import Link from 'next/link'

const TAG = 'identity'

export default function TestPage() {
  const {
    login,
    logout,
    authenticated,
    isInitializing,
    token,
    hasRealmRole,
    hasClientRole,
    getValueFromIdToken,
    getValueFromToken,
    doEncrypt,
    doDecrypt,
  } = useTideCloak()

  // User & role state
  const [username, setUsername] = useState<string>('')
  const [vuid, setVuid] = useState<string>('')
  const [clientRoles, setClientRoles] = useState<string[]>([])
  const [hasSelfEncrypt, setHasSelfEncrypt] = useState<boolean>(false)
  const [hasSelfDecrypt, setHasSelfDecrypt] = useState<boolean>(false)

  // Encryption state
  const [plainInput, setPlainInput] = useState<string>(
    'Jane Doe, jane.doe@mit.edu, MIT'
  )
  const [encrypting, setEncrypting] = useState<boolean>(false)
  const [encryptError, setEncryptError] = useState<string>('')
  const [cipherOutput, setCipherOutput] = useState<string>('')
  const [encryptSuccess, setEncryptSuccess] = useState<boolean>(false)

  // Decryption state
  const [cipherInput, setCipherInput] = useState<string>('')
  const [decrypting, setDecrypting] = useState<boolean>(false)
  const [decryptError, setDecryptError] = useState<string>('')
  const [decryptResult, setDecryptResult] = useState<string>('')
  const [decryptSuccess, setDecryptSuccess] = useState<boolean>(false)

  // Read roles and user metadata whenever token updates
  useEffect(() => {
    if (token && authenticated) {
      const name =
        getValueFromIdToken('preferred_username') ||
        getValueFromIdToken('email') ||
        'Authenticated User'
      const userVuid = getValueFromIdToken('vuid') || ''
      setUsername(name)
      setVuid(userVuid)

      // Realm roles
      setHasSelfEncrypt(hasRealmRole(`_tide_${TAG}.selfencrypt`))
      setHasSelfDecrypt(hasRealmRole(`_tide_${TAG}.selfdecrypt`))

      // Client roles on myclient (from token resource_access.myclient.roles)
      const resourceAccess = getValueFromToken('resource_access')
      const roles: string[] = resourceAccess?.myclient?.roles || []
      setClientRoles(roles)
    } else {
      setUsername('')
      setVuid('')
      setClientRoles([])
      setHasSelfEncrypt(false)
      setHasSelfDecrypt(false)
    }
  }, [token, authenticated, getValueFromIdToken, getValueFromToken, hasRealmRole])

  // Handle Encrypt
  const handleEncrypt = useCallback(async () => {
    if (!plainInput) {
      setEncryptError('Please enter text to encrypt.')
      return
    }
    setEncrypting(true)
    setEncryptError('')
    setEncryptSuccess(false)
    try {
      const [ciphertext] = await doEncrypt([
        {
          data: plainInput,
          tags: [TAG],
        },
      ])
      const ctString = String(ciphertext)
      setCipherOutput(ctString)
      // Also pre-fill the decryption input for convenient round-trip testing
      setCipherInput(ctString)
      setEncryptSuccess(true)
    } catch (err: any) {
      console.error('[TestPage] Encrypt error:', err)
      setEncryptError(err.message || String(err))
    } finally {
      setEncrypting(false)
    }
  }, [plainInput, doEncrypt])

  // Handle Decrypt
  const handleDecrypt = useCallback(async () => {
    const targetCiphertext = cipherInput.trim()
    if (!targetCiphertext) {
      setDecryptError('Please provide ciphertext to decrypt.')
      return
    }
    setDecrypting(true)
    setDecryptError('')
    setDecryptResult('')
    setDecryptSuccess(false)
    try {
      const [plaintext] = await doDecrypt([
        {
          encrypted: targetCiphertext,
          tags: [TAG],
        },
      ])
      setDecryptResult(String(plaintext))
      setDecryptSuccess(true)
    } catch (err: any) {
      console.error('[TestPage] Decrypt error:', err)
      setDecryptError(err.message || String(err))
    } finally {
      setDecrypting(false)
    }
  }, [cipherInput, doDecrypt])

  if (isInitializing) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <p style={{ color: '#555' }}>Initializing TideCloak authentication…</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Phase 1: TideCloak E2EE Mechanism Test
          </h1>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            You must be logged in to test tag-based encryption with TideCloak.
          </p>
          <button onClick={() => login()} style={primaryButtonStyle}>
            Log In via TideCloak
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={{ ...cardStyle, maxWidth: '800px', textAlign: 'left' }}>
        {/* Header & Nav */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            borderBottom: '1px solid #eee',
            paddingBottom: '0.75rem',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem' }}>
              Phase 1: Tag-Based Encryption Test (/test)
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>
              Proving client-side encryption and role-gated decryption with tag:{' '}
              <code>"{TAG}"</code>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link
              href="/home"
              style={{
                fontSize: '0.85rem',
                color: '#0070f3',
                textDecoration: 'none',
              }}
            >
              ← Back to /home
            </Link>
            <button
              onClick={() => logout()}
              style={{ ...secondaryButtonStyle, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              Log out
            </button>
          </div>
        </div>

        {/* User & Roles Diagnostics */}
        <div
          style={{
            background: '#f8f9fa',
            borderRadius: '6px',
            padding: '0.85rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.88rem',
            border: '1px solid #e9ecef',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#333' }}>
            Current Authenticated Session
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <span style={{ color: '#777' }}>User:</span> <strong>{username}</strong>
            </div>
            <div>
              <span style={{ color: '#777' }}>VUID:</span>{' '}
              <code style={{ fontSize: '0.8rem' }}>{vuid || '(none)'}</code>
            </div>
            <div>
              <span style={{ color: '#777' }}>Client Roles (myclient):</span>{' '}
              {clientRoles.length > 0 ? (
                clientRoles.map((r) => (
                  <span key={r} style={roleBadgeStyle}>
                    {r}
                  </span>
                ))
              ) : (
                <em style={{ color: '#999' }}>none</em>
              )}
              {/* Also check via SDK helper hasClientRole */}
              <span style={{ marginLeft: '0.5rem', color: '#666', fontSize: '0.78rem' }}>
                (SDK hasClientRole: applicant={hasClientRole('applicant') ? '✓' : '✗'}, reviewer={hasClientRole('reviewer') ? '✓' : '✗'}, hiring-lead={hasClientRole('hiring-lead') ? '✓' : '✗'})
              </span>
            </div>
            <div>
              <span style={{ color: '#777' }}>Tag Realm Roles:</span>{' '}
              <span
                style={{
                  ...statusBadgeStyle,
                  background: hasSelfEncrypt ? '#e6f4ea' : '#fce8e6',
                  color: hasSelfEncrypt ? '#137333' : '#c5221f',
                }}
              >
                _tide_{TAG}.selfencrypt: {hasSelfEncrypt ? 'YES' : 'NO'}
              </span>
              <span
                style={{
                  ...statusBadgeStyle,
                  marginLeft: '0.4rem',
                  background: hasSelfDecrypt ? '#e6f4ea' : '#fce8e6',
                  color: hasSelfDecrypt ? '#137333' : '#c5221f',
                }}
              >
                _tide_{TAG}.selfdecrypt: {hasSelfDecrypt ? 'YES' : 'NO'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Encrypt */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', color: '#111' }}>
            1. Encrypt with tag <code>"{TAG}"</code>
          </h2>
          <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.85rem' }}>
            Calls <code>doEncrypt([&#123; data, tags: ["{TAG}"] &#125;])</code>. Requires realm role{' '}
            <code>_tide_{TAG}.selfencrypt</code>.
          </p>

          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Plaintext Data:
          </label>
          <textarea
            value={plainInput}
            onChange={(e) => setPlainInput(e.target.value)}
            rows={3}
            style={textareaStyle}
            placeholder="Enter plaintext to encrypt…"
          />

          <div style={{ marginTop: '0.5rem' }}>
            <button
              onClick={handleEncrypt}
              disabled={encrypting}
              style={{ ...primaryButtonStyle, opacity: encrypting ? 0.6 : 1 }}
            >
              {encrypting ? 'Encrypting with TideCloak…' : `Encrypt with tag "${TAG}"`}
            </button>
          </div>

          {encryptError && (
            <div style={errorBoxStyle}>
              <strong>❌ Encryption Error:</strong> {encryptError}
            </div>
          )}

          {encryptSuccess && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={successBoxStyle}>
                ✅ Encrypted successfully! Ciphertext generated:
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <textarea
                  readOnly
                  value={cipherOutput}
                  rows={3}
                  style={{ ...textareaStyle, background: '#fafafa', fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(cipherOutput)}
                  style={{ ...secondaryButtonStyle, padding: '0.3rem 0.6rem', fontSize: '0.8rem', marginTop: '0.25rem' }}
                >
                  📋 Copy Ciphertext
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Decrypt */}
        <div style={{ ...sectionStyle, borderBottom: 'none', marginBottom: 0 }}>
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', color: '#111' }}>
            2. Decrypt with tag <code>"{TAG}"</code>
          </h2>
          <p style={{ margin: '0 0 0.5rem', color: '#666', fontSize: '0.85rem' }}>
            Calls <code>doDecrypt([&#123; encrypted, tags: ["{TAG}"] &#125;])</code>. Requires realm role{' '}
            <code>_tide_{TAG}.selfdecrypt</code>. Paste any user's ciphertext here to test cross-user decryption.
          </p>

          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Ciphertext to Decrypt:
          </label>
          <textarea
            value={cipherInput}
            onChange={(e) => setCipherInput(e.target.value)}
            rows={3}
            style={{ ...textareaStyle, fontFamily: 'monospace', fontSize: '0.8rem' }}
            placeholder="Paste base64 ciphertext here…"
          />

          <div style={{ marginTop: '0.5rem' }}>
            <button
              onClick={handleDecrypt}
              disabled={decrypting}
              style={{ ...primaryButtonStyle, background: '#28a745', opacity: decrypting ? 0.6 : 1 }}
            >
              {decrypting ? 'Decrypting with TideCloak…' : `Decrypt with tag "${TAG}"`}
            </button>
          </div>

          {decryptError && (
            <div style={errorBoxStyle}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>❌ Decryption Failed (Real TideCloak Output):</div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                {decryptError}
              </pre>
            </div>
          )}

          {decryptSuccess && (
            <div style={{ ...successBoxStyle, marginTop: '0.75rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>✅ Decryption Succeeded!</div>
              <div style={{ background: '#fff', padding: '0.5rem', borderRadius: '4px', border: '1px solid #b7e1cd', marginTop: '0.25rem' }}>
                <strong>Decrypted Plaintext:</strong> <span>{decryptResult}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f4f6f8',
  padding: '2rem 1rem',
  boxSizing: 'border-box',
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  padding: '2rem',
  borderRadius: '8px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  width: '100%',
  boxSizing: 'border-box',
}

const sectionStyle: React.CSSProperties = {
  paddingBottom: '1.25rem',
  marginBottom: '1.25rem',
  borderBottom: '1px solid #eee',
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem',
  borderRadius: '4px',
  border: '1px solid #ccc',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.6rem 1.25rem',
  fontSize: '0.95rem',
  fontWeight: 500,
  borderRadius: '4px',
  border: 'none',
  background: '#0070f3',
  color: '#fff',
  cursor: 'pointer',
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '0.6rem 1rem',
  fontSize: '0.9rem',
  borderRadius: '4px',
  border: '1px solid #ccc',
  background: '#fff',
  color: '#333',
  cursor: 'pointer',
}

const roleBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  background: '#e8f0fe',
  color: '#1a73e8',
  borderRadius: '4px',
  padding: '0.15rem 0.45rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  marginRight: '0.3rem',
}

const statusBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  borderRadius: '4px',
  padding: '0.15rem 0.45rem',
  fontSize: '0.75rem',
  fontWeight: 600,
}

const errorBoxStyle: React.CSSProperties = {
  marginTop: '0.75rem',
  padding: '0.75rem',
  borderRadius: '4px',
  background: '#fce8e6',
  color: '#c5221f',
  border: '1px solid #f5c2c7',
  fontSize: '0.88rem',
}

const successBoxStyle: React.CSSProperties = {
  padding: '0.75rem',
  borderRadius: '4px',
  background: '#e6f4ea',
  color: '#137333',
  border: '1px solid #b7e1cd',
  fontSize: '0.88rem',
}

