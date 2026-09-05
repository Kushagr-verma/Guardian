/**
 * Guardian API service layer.
 *
 * The existing Python backend is the source of truth. These functions are the
 * single integration point between the React frontend and that backend.
 *
 * By default they resolve to typed mock data so the frontend can be developed
 * in isolation. Set NEXT_PUBLIC_GUARDIAN_API to route the exact same calls to
 * the real Python endpoints.
 */

// --- Types ------------------------------------------------------------------

export interface DatasetSummary {
  trainingTransactions: number
  fraudCases: number
  fraudRate: number // fraction, e.g. 0.0017
  riskModel: string
}

export interface CompiledPolicy {
  field: 'amount_gt' | string
  value: number
  action: 'REVIEW' | 'BLOCK' | 'ALLOW'
  validated: boolean
  raw: Record<string, unknown>
}

export interface RiskMetrics {
  threshold: number
  flagged: number
  precision: number
  recall: number
  f1: number
  falsePositives: number
  falseNegatives: number
}

export interface ThresholdOptimization {
  recommendedThreshold: number
  rationale: string
  candidates: RiskMetrics[]
}

export interface HoldoutMetrics {
  precision: number
  recall: number
  f1: number
  flagged: number
  validated: boolean
}

export interface DeploymentResult {
  approved: boolean
  threshold: number
  note: string
}

// --- Config -----------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_GUARDIAN_API ?? ''
const USE_MOCKS = API_BASE === ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`Guardian API ${path} failed: ${res.status}`)
  return (await res.json()) as T
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// --- Mock data (used only when USE_MOCKS) -----------------------------------

const mock = {
  dataset(): DatasetSummary {
    return {
      trainingTransactions: 227845,
      fraudCases: 394,
      fraudRate: 0.0017,
      riskModel: 'Random Forest',
    }
  },

  compile(intent: string): CompiledPolicy {
    const match = intent.match(/(\d[\d,]*)/)
    const value = match ? Number(match[1].replace(/,/g, '')) : 5000
    return {
      field: 'amount_gt',
      value,
      action: /block|reject|deny/i.test(intent)
        ? 'BLOCK'
        : /allow|approve/i.test(intent)
          ? 'ALLOW'
          : 'REVIEW',
      validated: true,
      raw: {
        version: 1,
        conditions: [{ field: 'amount', operator: 'gt', value }],
        action: 'review',
        source: 'gemini-policy-compiler',
      },
    }
  },

  evaluate(threshold: number): RiskMetrics {
    const precision = Math.min(0.995, 0.72 + threshold * 0.34)
    const recall = Math.max(0.35, 0.94 - threshold * 0.5)
    const f1 = (2 * precision * recall) / (precision + recall)
    const flagged = Math.round(150 - threshold * 120)
    const falsePositives = Math.max(1, Math.round(flagged * (1 - precision)))
    const falseNegatives = Math.round(98 * (1 - recall))
    return {
      threshold,
      flagged,
      precision: round(precision),
      recall: round(recall),
      f1: round(f1),
      falsePositives,
      falseNegatives,
    }
  },

  optimize(): ThresholdOptimization {
    const candidates = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((t) =>
      mock.evaluate(t),
    )
    const best = candidates.reduce((a, b) => (b.f1 > a.f1 ? b : a))
    return {
      recommendedThreshold: best.threshold,
      rationale: 'Selected using F1 on the optimization dataset.',
      candidates,
    }
  },

  holdout(): HoldoutMetrics {
    return { precision: 0.9383, recall: 0.7755, f1: 0.8492, flagged: 81, validated: true }
  },

  approve(threshold: number): DeploymentResult {
    return {
      approved: true,
      threshold,
      note: 'Demo mode — no real payment action is performed.',
    }
  },
}

function round(n: number) {
  return Math.round(n * 10000) / 10000
}

// --- Public API (components call ONLY these) --------------------------------

export async function getDatasetSummary(): Promise<DatasetSummary> {
  if (USE_MOCKS) {
    await delay(200)
    return mock.dataset()
  }
  return request<DatasetSummary>('/dataset/summary')
}

export async function compilePolicy(intent: string): Promise<CompiledPolicy> {
  if (USE_MOCKS) {
    await delay(700)
    return mock.compile(intent)
  }
  return request<CompiledPolicy>('/policy/compile', {
    method: 'POST',
    body: JSON.stringify({ intent }),
  })
}

export async function evaluateRisk(threshold: number): Promise<RiskMetrics> {
  if (USE_MOCKS) {
    await delay(500)
    return mock.evaluate(threshold)
  }
  return request<RiskMetrics>('/risk/evaluate', {
    method: 'POST',
    body: JSON.stringify({ threshold }),
  })
}

export async function optimizeThreshold(): Promise<ThresholdOptimization> {
  if (USE_MOCKS) {
    await delay(900)
    return mock.optimize()
  }
  return request<ThresholdOptimization>('/risk/optimize', { method: 'POST' })
}

export async function getHoldoutMetrics(): Promise<HoldoutMetrics> {
  if (USE_MOCKS) {
    await delay(400)
    return mock.holdout()
  }
  return request<HoldoutMetrics>('/risk/holdout')
}

export async function approveDeployment(threshold: number): Promise<DeploymentResult> {
  if (USE_MOCKS) {
    await delay(600)
    return mock.approve(threshold)
  }
  return request<DeploymentResult>('/deployment/approve', {
    method: 'POST',
    body: JSON.stringify({ threshold }),
  })
}