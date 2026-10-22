'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTideCloak } from '@tidecloak/nextjs'

interface NavbarProps {
  currentStage?: string
}

export default function Navbar({ currentStage }: NavbarProps) {
  const pathname = usePathname()
  const { authenticated, login, logout, getValueFromIdToken, hasRealmRole, getValueFromToken } = useTideCloak()

  const username = getValueFromIdToken('preferred_username') || 'Guest'
  const hasDecrypt = hasRealmRole('_tide_identity.selfdecrypt')
  const clientRoles = getValueFromToken('resource_access')?.myclient?.roles || []

  const navItems = [
    { label: 'Overview', href: '/home', icon: '🏛️' },
    { label: 'Apply', href: '/apply', icon: '📝' },
    { label: 'Blind Review', href: '/review', icon: '⚖️' },
    { label: 'Reveal', href: '/reveal', icon: '🔓' },
    { label: 'Debug Test', href: '/test', icon: '🧪' },
  ]

  return (
    <nav style={navContainerStyle}>
      <div style={navInnerStyle}>
        {/* Logo / Brand */}
        <Link href="/home" style={brandStyle}>
          <div style={logoIconStyle}>
            <span style={{ fontSize: '1.25rem' }}>🛡️</span>
          </div>
          <div>
            <div style={brandTitleStyle}>
              BLIND<span style={{ color: '#06b6d4' }}>PORTFOLIO</span>
            </div>
            <div style={brandSubtitleStyle}>TideCloak Cryptographic Review</div>
          </div>
        </Link>

        {/* Links */}
        <div style={navLinksStyle}>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  ...linkStyle,
                  ...(isActive ? activeLinkStyle : {}),
                }}
              >
                <span style={{ marginRight: '0.4rem', fontSize: '0.9rem' }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* User / Auth Info */}
        <div style={authSectionStyle}>
          {authenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={userBadgeStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={statusDotStyle(hasDecrypt)} />
                  <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.82rem' }}>{username}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.15rem' }}>
                  {clientRoles.map((r: string) => (
                    <span key={r} style={roleTagStyle}>
                      {r}
                    </span>
                  ))}
                  {hasDecrypt ? (
                    <span style={{ ...roleTagStyle, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                      🔓 can-reveal
                    </span>
                  ) : (
                    <span style={{ ...roleTagStyle, background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' }}>
                      🔒 blind-only
                    </span>
                  )}
                </div>
              </div>

              <button onClick={() => logout()} style={logoutButtonStyle}>
                Log Out
              </button>
            </div>
          ) : (
            <button onClick={() => login()} style={loginButtonStyle}>
              Authenticate
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const navContainerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  backgroundColor: 'rgba(10, 13, 20, 0.75)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
}

const navInnerStyle: React.CSSProperties = {
  maxWidth: '1360px',
  margin: '0 auto',
  padding: '0.75rem 1.5rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const brandStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  textDecoration: 'none',
  color: 'inherit',
}

const logoIconStyle: React.CSSProperties = {
  width: '38px',
  height: '38px',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%)',
  border: '1px solid rgba(6, 182, 212, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 0 15px rgba(6, 182, 212, 0.25)',
}

const brandTitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 800,
  letterSpacing: '0.04em',
  color: '#f8fafc',
}

const brandSubtitleStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  color: '#94a3b8',
  fontWeight: 500,
  letterSpacing: '0.02em',
}

const navLinksStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  background: 'rgba(255, 255, 255, 0.03)',
  padding: '0.3rem',
  borderRadius: '10px',
  border: '1px solid rgba(255, 255, 255, 0.06)',
}

const linkStyle: React.CSSProperties = {
  padding: '0.45rem 0.9rem',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: '#94a3b8',
  textDecoration: 'none',
  borderRadius: '8px',
  transition: 'all 0.15s ease',
  display: 'flex',
  alignItems: 'center',
}

const activeLinkStyle: React.CSSProperties = {
  color: '#f8fafc',
  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(6, 182, 212, 0.15) 100%)',
  border: '1px solid rgba(99, 102, 241, 0.4)',
  boxShadow: '0 0 12px rgba(99, 102, 241, 0.2)',
}

const authSectionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
}

const userBadgeStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  padding: '0.35rem 0.75rem',
  borderRadius: '8px',
  textAlign: 'right',
}

const statusDotStyle = (active: boolean): React.CSSProperties => ({
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: active ? '#10b981' : '#f59e0b',
  boxShadow: active ? '0 0 8px #10b981' : '0 0 8px #f59e0b',
})

const roleTagStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  padding: '0.1rem 0.35rem',
  borderRadius: '4px',
  background: 'rgba(99, 102, 241, 0.15)',
  color: '#a5b4fc',
}

const logoutButtonStyle: React.CSSProperties = {
  padding: '0.45rem 0.85rem',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#94a3b8',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  cursor: 'pointer',
}

const loginButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1.1rem',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: '#fff',
  background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  boxShadow: '0 0 15px rgba(6, 182, 212, 0.35)',
}

