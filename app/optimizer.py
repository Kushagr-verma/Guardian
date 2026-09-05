import pandas as pd
from app.simulator import simulate


def optimize_amount_threshold(
    df,
    thresholds,
    fraud_loss_multiplier=1.0,
    false_positive_cost=50.0,
    review_cost=10.0
):
    results = []

    for threshold in thresholds:
        rule = {
            "amount_gt": threshold,
            "action": "REVIEW"
        }

        metrics = simulate(df, rule)

        missed_fraud = df[
            (df["Class"] == 1) &
            (df["Amount"] <= threshold)
        ]["Amount"].sum()

        fraud_loss = missed_fraud * fraud_loss_multiplier
        fp_cost = metrics["false_positives"] * false_positive_cost
        review_cost_total = metrics["flagged"] * review_cost

        total_cost = fraud_loss + fp_cost + review_cost_total

        results.append({
            "threshold": threshold,
            "flagged": metrics["flagged"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1": metrics["f1"],
            "false_positives": metrics["false_positives"],
            "false_negatives": metrics["false_negatives"],
            "fraud_loss": round(fraud_loss, 2),
            "false_positive_cost": round(fp_cost, 2),
            "review_cost": round(review_cost_total, 2),
            "total_cost": round(total_cost, 2)
        })

    result_df = pd.DataFrame(results)

    best = result_df.loc[
        result_df["total_cost"].idxmin()
    ].to_dict()

    return result_df, best