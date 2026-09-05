import pandas as pd


def evaluate_rule(df, rule):
    """
    Deterministic fraud policy execution.

    Supported rule:
        amount_gt -> flag transactions above this amount
    """

    mask = pd.Series(False, index=df.index)

    if rule.get("amount_gt") is not None:
        mask |= df["Amount"] > rule["amount_gt"]

    return mask