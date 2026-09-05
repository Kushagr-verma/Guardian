from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split

FEATURES = ["Time", *[f"V{i}" for i in range(1, 29)], "Amount"]

THRESHOLDS = [
    0.10,
    0.20,
    0.30,
    0.40,
    0.50,
    0.60,
    0.70,
    0.80,
    0.90,
]


def train_model(df):
    model = RandomForestClassifier(
        n_estimators=100,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1,
    )

    model.fit(df[FEATURES], df["Class"])

    return model


def calculate_metrics(y, probabilities, threshold):
    predictions = (probabilities >= threshold).astype(int)

    return {
        "threshold": threshold,
        "flagged": int(predictions.sum()),
        "precision": round(
            precision_score(y, predictions, zero_division=0),
            4,
        ),
        "recall": round(
            recall_score(y, predictions, zero_division=0),
            4,
        ),
        "f1": round(
            f1_score(y, predictions, zero_division=0),
            4,
        ),
        "false_positives": int(
            ((predictions == 1) & (y == 0)).sum()
        ),
        "false_negatives": int(
            ((predictions == 0) & (y == 1)).sum()
        ),
    }


def evaluate(model, df, threshold):
    probabilities = model.predict_proba(
        df[FEATURES]
    )[:, 1]

    return calculate_metrics(
        df["Class"].to_numpy(),
        probabilities,
        threshold,
    )


def optimize_threshold(df):
    optimization_train, validation_df = train_test_split(
        df,
        test_size=0.20,
        stratify=df["Class"],
        random_state=42,
    )

    validation_model = RandomForestClassifier(
        n_estimators=60,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1,
    )

    validation_model.fit(
        optimization_train[FEATURES],
        optimization_train["Class"],
    )

    probabilities = validation_model.predict_proba(
        validation_df[FEATURES]
    )[:, 1]

    y = validation_df["Class"].to_numpy()

    results = [
        calculate_metrics(y, probabilities, threshold)
        for threshold in THRESHOLDS
    ]

    best = max(
        results,
        key=lambda result: result["f1"],
    )

    return results, best