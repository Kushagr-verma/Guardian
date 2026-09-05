# Guardian

AI Fraud Policy Compiler and Risk Optimizer

## 1. Overview

Guardian is an AI-assisted fraud risk control system that converts natural-language merchant intent into constrained fraud policies, validates them, evaluates their impact, and recommends safer operating thresholds before deployment.

The core design principle is to use AI where language understanding provides value while keeping high-volume transaction evaluation outside the language model.

Guardian translates merchant intent into a structured policy using Gemini. The generated policy passes through a validation and safety layer before risk evaluation and threshold optimization. The selected configuration is then evaluated on unseen hold-out data before human approval.

## 2. Problem

Fraud prevention systems commonly combine rules, machine learning models, thresholds, and manual configuration.

Using a large language model for every individual transaction can introduce unnecessary token usage, latency, cost, and unpredictable behavior.

Manual fraud-policy configuration can also make it difficult for merchants to express their intent and understand the consequences of changing a rule.

Guardian addresses this by separating natural-language understanding from high-volume risk evaluation.

## 3. Solution

Guardian follows a controlled workflow:

1. Merchant provides a fraud policy in natural language.
2. Gemini converts the intent into a structured policy.
3. The generated policy passes through a validation and safety layer.
4. The risk model produces fraud probabilities.
5. Multiple thresholds are evaluated using transaction data.
6. The optimizer recommends an operating threshold.
7. The selected threshold is evaluated on an untouched hold-out dataset.
8. Deployment requires human approval.

This architecture keeps the AI component focused on policy understanding while the measurable risk evaluation remains deterministic.

## 4. Example

A merchant can provide:

> Flag transactions above ₹10,000 for review.

Guardian converts this intent into a structured policy containing the supported amount threshold and review action.

Other example policies include:

- Decline transactions above ₹50,000.
- Review payments above ₹2,500.
- Reject any payment greater than ₹25,000.

The current compiler intentionally supports a limited policy schema instead of allowing arbitrary AI-generated rules.

## 5. AI Policy Compiler

Guardian uses Gemini to translate natural-language fraud intent into structured JSON.

The current policy schema supports:

- `amount_gt`
- `action`

Permitted actions are:

- `REVIEW`
- `DECLINE`

The compiler is instructed not to invent fields or use anonymized model features such as V1 through V28.

This creates a controlled boundary between natural-language AI and the risk system.

## 6. Safety and Validation

Every generated policy passes through validation before it can be used.

The validator checks:

- Policy structure
- Allowed fields
- Allowed actions
- Numeric values
- Finite threshold values
- Positive amount thresholds
- Maximum supported amount limits

Unsupported fields and invalid actions are rejected.

This prevents arbitrary AI-generated behavior from being passed directly into the risk system.

## 7. Risk Optimization

Guardian does not assume that a probability threshold of 0.5 is always optimal.

The optimizer evaluates thresholds from 0.1 to 0.9 and measures:

- Precision
- Recall
- F1 score
- Flagged transactions
- False positives
- False negatives

The threshold with the highest F1 score on the validation split is selected as the recommended operating point.

The selected threshold is then evaluated separately on an untouched hold-out dataset.

This separates threshold selection from final performance measurement and reduces the risk of selecting a configuration based only on the data used during optimization.

## 8. AI Efficiency

A central design principle of Guardian is keeping the LLM outside the transaction-level decision path.

The architecture is:

Merchant Intent → AI Compilation → Policy Validation → Deterministic Risk Evaluation → Optimization → Validation → Human Approval

Rather than:

Transaction → LLM → Fraud Decision

The language model is therefore used for the task where language understanding is valuable, while large transaction batches can be evaluated without requiring an LLM call for every transaction.

This reduces unnecessary token consumption and makes the risk decision path more predictable.

## 9. Model and Dataset

Guardian currently uses a Random Forest classifier with balanced class weighting.

The model is trained using the Credit Card Fraud Detection dataset containing anonymized transaction features including:

- Time
- V1 through V28
- Amount
- Class

`Class` represents whether a transaction is legitimate or fraudulent.

The dataset is split using stratification to preserve the fraud ratio.

For threshold optimization, the training data is further divided into an optimization-training split and a validation split.

The final test split remains untouched until hold-out evaluation.

## 10. Evaluation

Guardian evaluates the risk model using metrics that are important for fraud detection:

- Precision measures how many transactions flagged as fraud are actually fraudulent.
- Recall measures how many fraudulent transactions are detected.
- F1 score balances precision and recall.
- False positives represent legitimate transactions incorrectly flagged as fraud.
- False negatives represent fraudulent transactions that were not detected.
- Flagged transactions represent the number of transactions classified as fraud at a selected threshold.

The system exposes these measurements for different thresholds so that the trade-off between fraud detection and false-positive impact can be examined before deployment.

## 11. API

`GET /`

Returns the service status.

`GET /health`

Returns backend health information.

`GET /dataset/summary`

Returns training dataset statistics and the configured risk model.

`POST /policy/compile`

Converts natural-language fraud intent into a validated structured policy.

`POST /risk/evaluate`

Evaluates the risk model at a supplied probability threshold.

`POST /risk/optimize`

Evaluates candidate thresholds and returns the recommended threshold.

`GET /risk/holdout`

Evaluates the optimized threshold on the untouched test dataset.

`POST /deployment/approve`

Records human approval for the selected configuration.

The current deployment endpoint operates in demo mode and performs no real payment action.

## 12. Technology Stack

Backend:

- Python
- FastAPI
- Scikit-learn
- Pandas
- Google Gemini
- Pydantic

Frontend:

- Next.js
- React
- TypeScript
- CSS

Data:

- Credit Card Fraud Detection dataset

## 13. Running Locally

Install the backend dependencies:

```bash
pip install -r requirements.txt