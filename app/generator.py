import numpy as np
import pandas as pd

np.random.seed(42)

N = 10000

data = pd.DataFrame({
    "transaction_id": [f"TXN{i:06d}" for i in range(N)],
    "customer_id": np.random.randint(1, 3000, N),
    "amount": np.round(np.random.lognormal(7, 1.2, N), 2),
    "account_age_days": np.random.randint(1, 1000, N),
    "transactions_1h": np.random.poisson(1.5, N),
    "transactions_24h": np.random.poisson(5, N),
    "failed_attempts_24h": np.random.poisson(0.7, N),
    "hour": np.random.randint(0, 24, N),
    "device_age_days": np.random.randint(1, 1000, N)
})

fraud = (
    (
        (data["amount"] > 50000) &
        (data["account_age_days"] < 30) &
        (data["transactions_1h"] > 4)
    )
    |
    (
        (data["failed_attempts_24h"] > 5) &
        (data["transactions_24h"] > 10)
    )
    |
    (
        (data["amount"] > 100000) &
        (data["account_age_days"] < 7)
    )
)

noise = np.random.random(N) < 0.015
fraud = fraud ^ noise

data["is_fraud"] = fraud.astype(int)

data.to_csv("data/transactions.csv", index=False)

print("Dataset created.")
print(f"Transactions: {len(data)}")
print(f"Fraudulent: {data['is_fraud'].sum()}")
print(f"Fraud rate: {data['is_fraud'].mean():.2%}")