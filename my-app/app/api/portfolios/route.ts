import fs from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

const DATA_FILE = path.join(process.cwd(), 'data', 'portfolios.json')

export interface PortfolioSubmission {
  id: string
  applicantVuid: string
  // Plaintext fields
  portfolioTitle: string
  portfolioDescription: string
  // Ciphertext fields (ONLY encrypted data stored on server!)
  encryptedIdentity: string // contains encrypted JSON of { name, email, school }
  // Scoring
  scores: {
    reviewer: string
    codeQuality: number
    designReasoning: number
    testing: number
    notes: string
  }[]
  createdAt: string
}

export interface AppState {
  stage: '1. Blind Review' | '2. Shortlist' | '3. Reveal'
  portfolios: PortfolioSubmission[]
}

function ensureDataFile(): AppState {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initialState: AppState = {
      stage: '1. Blind Review',
      portfolios: [],
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialState, null, 2), 'utf-8')
    return initialState
  }
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    const fallback: AppState = { stage: '1. Blind Review', portfolios: [] }
    fs.writeFileSync(DATA_FILE, JSON.stringify(fallback, null, 2), 'utf-8')
    return fallback
  }
}

function saveData(data: AppState) {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

// GET /api/portfolios - fetch all portfolios and stage
export async function GET() {
  const state = ensureDataFile()
  return NextResponse.json(state)
}

// POST /api/portfolios - add a portfolio or batch submissions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const state = ensureDataFile()

    if (body.action === 'setStage') {
      if (['1. Blind Review', '2. Shortlist', '3. Reveal'].includes(body.stage)) {
        state.stage = body.stage
        saveData(state)
        return NextResponse.json({ success: true, stage: state.stage })
      }
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    if (body.action === 'score') {
      const { portfolioId, score } = body
      const item = state.portfolios.find((p) => p.id === portfolioId)
      if (!item) {
        return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
      }
      item.scores = item.scores || []
      // Replace or append score from reviewer
      const existingIdx = item.scores.findIndex((s) => s.reviewer === score.reviewer)
      if (existingIdx >= 0) {
        item.scores[existingIdx] = score
      } else {
        item.scores.push(score)
      }
      saveData(state)
      return NextResponse.json({ success: true, portfolio: item })
    }

    if (body.action === 'batchAdd') {
      const items: PortfolioSubmission[] = body.items
      for (const it of items) {
        // Enforce: only ciphertext stored for identity
        if (it.portfolioTitle && it.encryptedIdentity) {
          state.portfolios.unshift({
            id: it.id || `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            applicantVuid: it.applicantVuid || 'anonymous-vuid',
            portfolioTitle: it.portfolioTitle,
            portfolioDescription: it.portfolioDescription || '',
            encryptedIdentity: it.encryptedIdentity,
            scores: [],
            createdAt: it.createdAt || new Date().toISOString(),
          })
        }
      }
      saveData(state)
      return NextResponse.json({ success: true, count: items.length })
    }

    // Single submission
    const { portfolioTitle, portfolioDescription, encryptedIdentity, applicantVuid } = body
    if (!portfolioTitle || !encryptedIdentity) {
      return NextResponse.json(
        { error: 'portfolioTitle and encryptedIdentity are required' },
        { status: 400 }
      )
    }

    const newSubmission: PortfolioSubmission = {
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      applicantVuid: applicantVuid || 'anonymous',
      portfolioTitle,
      portfolioDescription: portfolioDescription || '',
      encryptedIdentity,
      scores: [],
      createdAt: new Date().toISOString(),
    }

    state.portfolios.unshift(newSubmission)
    saveData(state)

    return NextResponse.json({ success: true, portfolio: newSubmission })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

