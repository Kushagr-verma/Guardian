"use client"

import { useEffect, useMemo, useState } from "react"
import {
  approveDeployment,
  compilePolicy,
  evaluateRisk,
  getDatasetSummary,
  getHoldoutMetrics,
  optimizeThreshold,
} from "../lib/api"

type Summary = {
  trainingTransactions: number
  fraudCases: number
  fraudRate: number
  riskModel: string
}

type Policy = {
  field: string
  value: number
  action: string
  validated: boolean
  raw?: {
    amount_gt?: number | null
    action?: string
  }
}

type Metrics = {
  threshold: number
  flagged: number
  precision: number
  recall: number
  f1: number
  falsePositives: number
  falseNegatives: number
}

type Candidate = Metrics

type Optimization = {
  recommendedThreshold: number
  rationale: string
  candidates: Candidate[]
}

type Holdout = {
  precision: number
  recall: number
  f1: number
  flagged: number
  validated: boolean
}

const demoQueries = [
  "Flag transactions above ₹10,000 for review.",
  "Decline transactions above ₹50,000.",
  "Review payments above ₹2,500.",
  "Reject any payment greater than ₹25,000.",
]

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value)
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function Metric({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  )
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="section-header">
      <div className="eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}

function StatusDot({ active = true }: { active?: boolean }) {
  return <span className={active ? "status-dot" : "status-dot muted"} />
}

function Pipeline() {
  const steps = [
    ["01", "Intent", "Human policy"],
    ["02", "Compile", "Gemini"],
    ["03", "Validate", "Safety gate"],
    ["04", "Optimize", "Risk model"],
    ["05", "Approve", "Human control"],
  ]

  return (
    <div className="pipeline">
      {steps.map((step, index) => (
        <div className="pipeline-step" key={step[0]}>
          <div className="pipeline-number">{step[0]}</div>

          <div>
            <strong>{step[1]}</strong>
            <span>{step[2]}</span>
          </div>

          {index < steps.length - 1 && <div className="pipeline-line" />}
        </div>
      ))}
    </div>
  )
}

function ThresholdChart({
  candidates,
  recommended,
}: {
  candidates: Candidate[]
  recommended: number
}) {
  if (!candidates?.length) {
    return (
      <div className="chart-empty">
        Run optimization to view thresholds.
      </div>
    )
  }

  const maxF1 = Math.max(...candidates.map((x) => x.f1), 0.01)

  return (
    <div className="threshold-chart">
      <div className="chart-axis">
        <span>F1</span>
        <span>Operating threshold</span>
      </div>

      <div className="chart-area">
        {candidates.map((candidate) => {
          const height = Math.max(8, (candidate.f1 / maxF1) * 100)

          const selected =
            Math.abs(candidate.threshold - recommended) < 0.001

          return (
            <div className="chart-column" key={candidate.threshold}>
              <div className="bar-wrap">
                <div
                  className={`chart-bar ${selected ? "selected" : ""}`}
                  style={{ height: `${height}%` }}
                />
              </div>

              <span
                className={
                  selected ? "chart-label selected" : "chart-label"
                }
              >
                {candidate.threshold.toFixed(2)}
              </span>
            </div>
          )
        })}
      </div>

      <div className="chart-legend">
        <span>
          <i className="legend-dot" />
          F1 across candidate thresholds
        </span>

        <strong>
          Recommended: {recommended.toFixed(2)}
        </strong>
      </div>
    </div>
  )
}

export default function AppShell() {
  const [summary, setSummary] = useState<Summary | null>(null)

  const [intent, setIntent] = useState(demoQueries[0])

  const [policy, setPolicy] = useState<Policy | null>(null)

  const [optimization, setOptimization] =
    useState<Optimization | null>(null)

  const [holdout, setHoldout] =
    useState<Holdout | null>(null)

  const [metrics, setMetrics] =
    useState<Metrics | null>(null)

  const [threshold, setThreshold] = useState(0.3)

  const [loading, setLoading] =
    useState<string | null>(null)

  const [error, setError] = useState("")

  const [approved, setApproved] = useState(false)

  useEffect(() => {
    getDatasetSummary()
      .then(setSummary)
      .catch((err) =>
        setError(err.message || "Unable to load dataset.")
      )
  }, [])

  const recommended =
    optimization?.recommendedThreshold ?? threshold

  const selectedMetrics = useMemo(() => {
    if (!optimization) return metrics

    return (
      optimization.candidates.find(
        (candidate) =>
          Math.abs(candidate.threshold - threshold) < 0.001
      ) || metrics
    )
  }, [optimization, threshold, metrics])

  async function handleCompile() {
    setLoading("compile")
    setError("")

    try {
      const result = await compilePolicy(intent)
      setPolicy(result)
    } catch (err: any) {
      setError(err.message || "Compilation failed.")
    } finally {
      setLoading(null)
    }
  }

  async function handleOptimize() {
    setLoading("optimize")
    setError("")

    try {
      const result = await optimizeThreshold()

      setOptimization(result)

      const nextThreshold =
        result.recommendedThreshold

      setThreshold(nextThreshold)

      const evaluated =
        await evaluateRisk(nextThreshold)

      setMetrics(evaluated)

      const holdoutResult =
        await getHoldoutMetrics()

      setHoldout(holdoutResult)
    } catch (err: any) {
      setError(err.message || "Optimization failed.")
    } finally {
      setLoading(null)
    }
  }

  async function handleThresholdChange(
    value: number
  ) {
    setThreshold(value)
    setLoading("evaluate")
    setError("")

    try {
      const result = await evaluateRisk(value)
      setMetrics(result)
    } catch (err: any) {
      setError(err.message || "Evaluation failed.")
    } finally {
      setLoading(null)
    }
  }

  async function handleApprove() {
    setLoading("approve")
    setError("")

    try {
      const result =
        await approveDeployment(threshold)

      setApproved(result.approved)
    } catch (err: any) {
      setError(err.message || "Approval failed.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <main className="guardian">
      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brand-mark">G</span>
          <span>Guardian</span>
        </a>

        <nav>
          <a href="#policy">Policy</a>
          <a href="#risk">Risk</a>
          <a href="#validation">Validation</a>
          <a href="#deployment">Deployment</a>
        </nav>

        <div className="top-status">
          <StatusDot />
          Prototype
        </div>
      </header>

      <div id="top" className="dashboard">
        {/* HERO */}

        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              AI RISK CONTROL
            </div>

            <h1>
              From human intent
              <br />
              <em>to safer policy.</em>
            </h1>

            <p>
              Convert natural-language fraud intent into
              a constrained, validated and measurable
              policy without putting an LLM in the
              transaction decision path.
            </p>

            <div className="hero-actions">
              <a
                href="#policy"
                className="button primary"
              >
                Explore policy
              </a>

              <a
                href="#risk"
                className="button secondary"
              >
                View risk engine
              </a>
            </div>
          </div>

          <Pipeline />
        </section>

        {/* STATS */}

        <section className="stats">
          <Metric
            label="Training transactions"
            value={
              summary
                ? formatNumber(
                    summary.trainingTransactions
                  )
                : "—"
            }
          />

          <Metric
            label="Fraud cases"
            value={
              summary
                ? formatNumber(summary.fraudCases)
                : "—"
            }
          />

          <Metric
            label="Fraud rate"
            value={
              summary
                ? percent(summary.fraudRate)
                : "—"
            }
          />

          <Metric
            label="Risk model"
            value={
              summary?.riskModel || "—"
            }
          />
        </section>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {/* POLICY */}

        <section
          id="policy"
          className="section"
        >
          <SectionHeader
            eyebrow="01 — POLICY CONTROL"
            title="Turn intent into a safe policy."
            description="AI interprets language once. The resulting policy is constrained before it can influence the risk workflow."
          />

          <div className="two-column">
            <article className="card compiler-card">
              <div className="card-head">
                <div>
                  <span className="card-kicker">
                    POLICY COMPILER
                  </span>

                  <h3>Merchant intent</h3>
                </div>

                <StatusDot active={!!policy} />
              </div>

              <textarea
                value={intent}
                onChange={(e) =>
                  setIntent(e.target.value)
                }
                placeholder="Describe the fraud policy..."
              />

              <div className="query-row">
                {demoQueries.map((query) => (
                  <button
                    key={query}
                    onClick={() =>
                      setIntent(query)
                    }
                    className={
                      intent === query
                        ? "active"
                        : ""
                    }
                  >
                    {query}
                  </button>
                ))}
              </div>

              <button
                className="button primary full"
                onClick={handleCompile}
                disabled={
                  loading === "compile"
                }
              >
                {loading === "compile"
                  ? "Compiling..."
                  : "Compile policy →"}
              </button>
            </article>

            <article className="card policy-result">
              <div className="card-head">
                <div>
                  <span className="card-kicker">
                    COMPILED POLICY
                  </span>

                  <h3>Constrained output</h3>
                </div>

                <span className="verified">
                  <StatusDot />
                  Validated
                </span>
              </div>

              {policy ? (
                <>
                  <div className="policy-main">
                    <span>amount_gt</span>

                    <strong>
                      ₹{formatNumber(policy.value)}
                    </strong>
                  </div>

                  <div className="policy-action">
                    <span>Action</span>

                    <strong>
                      {policy.action}
                    </strong>
                  </div>

                  <div className="policy-json">
                    <span>
                      Structured representation
                    </span>

                    <code>
                      {"{"}
                      <br />
                      &nbsp;&nbsp;"amount_gt": {policy.value},
                      <br />
                      &nbsp;&nbsp;"action": "
                      {policy.raw?.action ||
                        policy.action}
                      "
                      <br />
                      {"}"}
                    </code>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    →
                  </div>

                  <strong>
                    Awaiting policy compilation
                  </strong>

                  <span>
                    Enter merchant intent and
                    compile it into a validated
                    policy.
                  </span>
                </div>
              )}
            </article>
          </div>
        </section>

        {/* RISK */}

        <section
          id="risk"
          className="section"
        >
          <SectionHeader
            eyebrow="02 — RISK OPTIMIZATION"
            title="Find the operating point."
            description="Compare candidate thresholds instead of relying on an arbitrary default."
          />

          <div className="optimizer-grid">
            <article className="card optimizer-card">
              <div className="card-head">
                <div>
                  <span className="card-kicker">
                    RISK OPTIMIZER
                  </span>

                  <h3>Threshold control</h3>
                </div>

                {optimization && (
                  <span className="recommendation">
                    Recommended{" "}
                    {recommended.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="threshold-value">
                <span>
                  Current threshold
                </span>

                <strong>
                  {threshold.toFixed(2)}
                </strong>
              </div>

              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={threshold}
                onChange={(e) =>
                  handleThresholdChange(
                    Number(e.target.value)
                  )
                }
              />

              <div className="range-labels">
                <span>0.10</span>
                <span>0.90</span>
              </div>

              <button
                className="button secondary full"
                onClick={handleOptimize}
                disabled={
                  loading === "optimize"
                }
              >
                {loading === "optimize"
                  ? "Optimizing..."
                  : "Optimize threshold"}
              </button>

              {selectedMetrics && (
                <div className="mini-metrics">
                  <Metric
                    label="Precision"
                    value={percent(
                      selectedMetrics.precision
                    )}
                  />

                  <Metric
                    label="Recall"
                    value={percent(
                      selectedMetrics.recall
                    )}
                  />

                  <Metric
                    label="F1"
                    value={percent(
                      selectedMetrics.f1
                    )}
                  />
                </div>
              )}
            </article>

            <article className="card chart-card">
              <div className="card-head">
                <div>
                  <span className="card-kicker">
                    THRESHOLD FIELD
                  </span>

                  <h3>
                    Performance across operating
                    points
                  </h3>
                </div>

                <span className="chart-note">
                  Validation split
                </span>
              </div>

              <ThresholdChart
                candidates={
                  optimization?.candidates || []
                }
                recommended={recommended}
              />
            </article>
          </div>
        </section>

        {/* VALIDATION */}

        <section
          id="validation"
          className="section compact-section"
        >
          <SectionHeader
            eyebrow="03 — MEASURED IMPACT"
            title="See the operating point change."
            description="Precision, recall and error counts make the trade-off visible."
          />

          <div className="impact-grid">
            <article className="card impact-card">
              <div className="impact-label">
                PRECISION
              </div>

              <div className="impact-values">
                <strong>
                  {holdout
                    ? percent(holdout.precision)
                    : "—"}
                </strong>

                <span>
                  selected policy
                </span>
              </div>
            </article>

            <article className="card impact-card">
              <div className="impact-label">
                RECALL
              </div>

              <div className="impact-values">
                <strong>
                  {holdout
                    ? percent(holdout.recall)
                    : "—"}
                </strong>

                <span>
                  fraud captured
                </span>
              </div>
            </article>

            <article className="card impact-card">
              <div className="impact-label">
                F1 SCORE
              </div>

              <div className="impact-values">
                <strong>
                  {holdout
                    ? percent(holdout.f1)
                    : "—"}
                </strong>

                <span>
                  hold-out result
                </span>
              </div>
            </article>

            <article className="card impact-card">
              <div className="impact-label">
                FLAGGED
              </div>

              <div className="impact-values">
                <strong>
                  {holdout
                    ? formatNumber(
                        holdout.flagged
                      )
                    : "—"}
                </strong>

                <span>
                  hold-out transactions
                </span>
              </div>
            </article>
          </div>

          <div className="validation-row">
            <article className="card holdout-card">
              <div className="card-head">
                <div>
                  <span className="card-kicker">
                    HOLD-OUT VALIDATION
                  </span>

                  <h3>
                    Final unseen-data check
                  </h3>
                </div>

                {holdout?.validated && (
                  <span className="verified">
                    <StatusDot />
                    Validated
                  </span>
                )}
              </div>

              <div className="holdout-content">
                <div>
                  <strong>
                    {holdout
                      ? percent(holdout.f1)
                      : "—"}
                  </strong>

                  <span>
                    F1 on untouched hold-out
                    data
                  </span>
                </div>

                <div className="holdout-line">
                  <span />
                </div>

                <p>
                  Threshold selection uses a
                  separate validation split before
                  the final hold-out evaluation.
                </p>
              </div>
            </article>

            <article className="card efficiency-card">
              <div className="card-head">
                <div>
                  <span className="card-kicker">
                    AI EFFICIENCY
                  </span>

                  <h3>
                    AI stays out of the hot path
                  </h3>
                </div>
              </div>

              <div className="efficiency-flow">
                <span>
                  Human intent
                </span>

                <i>→</i>

                <span className="accent-box">
                  AI compiler
                </span>

                <i>→</i>

                <span>
                  Policy
                </span>

                <i>→</i>

                <span>
                  Risk engine
                </span>
              </div>

              <div className="efficiency-note">
                <strong>1</strong>

                <span>
                  policy compilation call
                </span>

                <strong>0</strong>

                <span>
                  LLM calls per transaction
                </span>
              </div>
            </article>
          </div>
        </section>

        {/* DEPLOYMENT */}

        <section
          id="deployment"
          className="section deployment-section"
        >
          <SectionHeader
            eyebrow="04 — HUMAN APPROVAL GATE"
            title="Ready for controlled deployment."
            description="A recommended policy is not automatically pushed into production. A human remains responsible for approval."
          />

          <article className="card deployment-card">
            <div className="deployment-copy">
              <span className="card-kicker">
                DEPLOYMENT CONTROL
              </span>

              <h3>
                {approved
                  ? "Policy approved for demo deployment."
                  : "Approve the selected operating point."}
              </h3>

              <p>
                Threshold{" "}
                <strong>
                  {threshold.toFixed(2)}
                </strong>{" "}
                is the currently selected
                configuration. The prototype
                performs no real payment action.
              </p>

              <div className="deployment-tags">
                <span>
                  Human approval
                </span>

                <span>
                  Demo mode
                </span>

                <span>
                  No real payment action
                </span>
              </div>

              {!approved && (
                <button
                  className="button primary"
                  onClick={handleApprove}
                  disabled={
                    loading === "approve"
                  }
                >
                  {loading === "approve"
                    ? "Approving..."
                    : "Approve deployment →"}
                </button>
              )}
            </div>

            <div
              className={`approval-box ${
                approved ? "approved" : ""
              }`}
            >
              <div className="approval-icon">
                {approved ? "✓" : "○"}
              </div>

              <strong>
                {approved
                  ? "TEST POLICY APPROVED"
                  : "AWAITING APPROVAL"}
              </strong>

              <span>
                {approved
                  ? "Human approval recorded in demo mode."
                  : "No production action will occur."}
              </span>
            </div>
          </article>
        </section>

        <footer>
          <span>
            Guardian — AI Risk Control
          </span>

          <span>
            Prototype · Defense-only · Human approved
          </span>
        </footer>
      </div>
    </main>
  )
}