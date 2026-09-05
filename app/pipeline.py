from app.ai_compiler import compile_with_gemini
from app.validator import validate_policy
from app.simulator import simulate


def run_guardian(policy_text, df):
    # 1. Convert natural language to structured policy
    policy = compile_with_gemini(policy_text)

    # 2. Validate AI-generated policy
    policy = validate_policy(policy)

    # 3. Simulate policy on transaction data
    metrics = simulate(df, policy)

    return {
        "policy": policy,
        "metrics": metrics
    }