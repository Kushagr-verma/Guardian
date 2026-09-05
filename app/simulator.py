from app.rule_engine import evaluate_rule
from app.metrics import calculate_metrics


def simulate(df, rule):
    predictions = evaluate_rule(df, rule)

    y_true = df["Class"]
    y_pred = predictions.astype(int)

    return calculate_metrics(y_true, y_pred)