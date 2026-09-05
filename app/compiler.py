import re


def compile_policy(text):
    """
    Convert natural-language fraud policy
    into a structured Guardian rule.
    """

    text = text.lower()
    rule = {}

    # Amount
    amount = re.search(
        r"(?:above|over|greater than)\s*[₹rs.]?\s*([\d,]+)",
        text
    )

    if amount:
        rule["amount_gt"] = float(
            amount.group(1).replace(",", "")
        )

    # Account age
    age = re.search(
        r"(?:younger than|less than)\s*(\d+)\s*days",
        text
    )

    if age:
        rule["account_age_lt"] = int(age.group(1))

    # Transactions per hour
    txns_1h = re.search(
        r"(?:more than|above)\s*(\d+)\s*transactions?\s*(?:in|per)\s*(?:one|1)\s*hour",
        text
    )

    if txns_1h:
        rule["transactions_1h_gt"] = int(
            txns_1h.group(1)
        )

    # Failed attempts
    failed = re.search(
        r"(?:more than|above)\s*(\d+)\s*(?:failed attempts?|failures?)",
        text
    )

    if failed:
        rule["failed_attempts_24h_gt"] = int(
            failed.group(1)
        )

    # Transactions in 24 hours
    txns_24h = re.search(
        r"(?:more than|above)\s*(\d+)\s*transactions?\s*(?:in|per)\s*(?:one|1)\s*day",
        text
    )

    if txns_24h:
        rule["transactions_24h_gt"] = int(
            txns_24h.group(1)
        )

    # Action
    if "block" in text or "decline" in text:
        rule["action"] = "DECLINE"
    elif "allow" in text:
        rule["action"] = "ALLOW"
    else:
        rule["action"] = "REVIEW"

    return rule