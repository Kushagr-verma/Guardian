import pandas as pd
from sklearn.model_selection import train_test_split


def load_dataset(path="data/creditcard.csv"):
    df = pd.read_csv(path)

    # Basic validation
    required_columns = ["Time", "Amount", "Class"]

    for col in required_columns:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")

    return df


def split_dataset(df):
    X = df.drop(columns=["Class"])
    y = df["Class"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        stratify=y,
        random_state=42
    )

    train_df = X_train.copy()
    train_df["Class"] = y_train

    test_df = X_test.copy()
    test_df["Class"] = y_test

    return train_df, test_df