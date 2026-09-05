from functools import lru_cache

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.dataset import load_dataset, split_dataset
from app.ai_compiler import compile_with_gemini
from app.validator import validate_policy
from app.model import train_model, evaluate, optimize_threshold


app = FastAPI(
    title="Guardian API",
    description="AI Fraud Policy Compiler and Risk Optimization API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DATA_PATH = "data/creditcard.csv"


@lru_cache(maxsize=1)
def get_data():
    df = load_dataset(DATA_PATH)
    train_df, test_df = split_dataset(df)
    return df, train_df, test_df


@lru_cache(maxsize=1)
def get_model():
    _, train_df, _ = get_data()
    return train_model(train_df)


@lru_cache(maxsize=1)
def get_optimization():
    _, train_df, _ = get_data()
    return optimize_threshold(train_df)


class PolicyRequest(BaseModel):
    intent: str = Field(..., min_length=1)


class RiskRequest(BaseModel):
    threshold: float = Field(..., ge=0.0, le=1.0)


class DeploymentRequest(BaseModel):
    threshold: float = Field(..., ge=0.0, le=1.0)


@app.get("/")
def root():
    return {
        "service": "Guardian",
        "status": "running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


@app.get("/dataset/summary")
def dataset_summary():
    try:
        _, train_df, _ = get_data()

        fraud_cases = int(train_df["Class"].sum())

        return {
            "trainingTransactions": len(train_df),
            "fraudCases": fraud_cases,
            "fraudRate": round(
                fraud_cases / len(train_df),
                6,
            ),
            "riskModel": "Random Forest",
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


@app.post("/policy/compile")
def compile_policy(request: PolicyRequest):
    try:
        compiled = compile_with_gemini(request.intent)
        policy = validate_policy(compiled)

        action = policy.get("action", "REVIEW")

        if action == "DECLINE":
            action = "BLOCK"
        else:
            action = "REVIEW"

        return {
            "field": "amount_gt",
            "value": policy.get("amount_gt") or 0,
            "action": action,
            "validated": True,
            "raw": policy,
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Policy compilation failed: {e}",
        )


@app.post("/risk/evaluate")
def evaluate_risk(request: RiskRequest):
    try:
        _, _, test_df = get_data()

        model = get_model()

        metrics = evaluate(
            model,
            test_df,
            request.threshold,
        )

        return {
            "threshold": request.threshold,
            "flagged": metrics["flagged"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1": metrics["f1"],
            "falsePositives": metrics["false_positives"],
            "falseNegatives": metrics["false_negatives"],
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Risk evaluation failed: {e}",
        )


@app.post("/risk/optimize")
def optimize_risk():
    try:
        results, best = get_optimization()

        candidates = [
            {
                "threshold": row["threshold"],
                "flagged": row["flagged"],
                "precision": row["precision"],
                "recall": row["recall"],
                "f1": row["f1"],
                "falsePositives": row["false_positives"],
                "falseNegatives": row["false_negatives"],
            }
            for row in results
        ]

        return {
            "recommendedThreshold": best["threshold"],
            "rationale": (
                "Recommended using the highest F1 score "
                "on a separate validation split."
            ),
            "candidates": candidates,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Threshold optimization failed: {e}",
        )


@app.get("/risk/holdout")
def holdout_metrics():
    try:
        _, _, test_df = get_data()

        _, best = get_optimization()

        model = get_model()

        metrics = evaluate(
            model,
            test_df,
            best["threshold"],
        )

        return {
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1": metrics["f1"],
            "flagged": metrics["flagged"],
            "validated": True,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Hold-out evaluation failed: {e}",
        )


@app.post("/deployment/approve")
def approve_deployment(
    request: DeploymentRequest,
):
    return {
        "approved": True,
        "threshold": request.threshold,
        "note": (
            "Demo mode — no real payment action is performed. "
            "Deployment requires human approval."
        ),
    }