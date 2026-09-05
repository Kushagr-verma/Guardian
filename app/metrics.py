from sklearn.metrics import precision_score, recall_score, f1_score


def calculate_metrics(y_true, y_pred):

    return {
        "flagged": int(y_pred.sum()),

        "precision": round(
            precision_score(
                y_true,
                y_pred,
                zero_division=0
            ),
            4
        ),

        "recall": round(
            recall_score(
                y_true,
                y_pred,
                zero_division=0
            ),
            4
        ),

        "f1": round(
            f1_score(
                y_true,
                y_pred,
                zero_division=0
            ),
            4
        ),

        "false_positives": int(
            ((y_pred == 1) & (y_true == 0)).sum()
        ),

        "false_negatives": int(
            ((y_pred == 0) & (y_true == 1)).sum()
        )
    }