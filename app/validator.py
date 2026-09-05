import math


ALLOWED_FIELDS = {"amount_gt", "action"}
ALLOWED_ACTIONS = {"REVIEW", "DECLINE"}


def validate_policy(policy):
    if not isinstance(policy, dict):
        raise ValueError("Policy must be a JSON object")

    # Reject fields that Guardian does not understand
    unknown_fields = set(policy.keys()) - ALLOWED_FIELDS

    if unknown_fields:
        raise ValueError(
            f"Unsafe/unknown fields: {', '.join(unknown_fields)}"
        )

    # Defaults
    if "amount_gt" not in policy:
        policy["amount_gt"] = None

    if "action" not in policy:
        policy["action"] = "REVIEW"

    # Validate amount threshold
    amount = policy["amount_gt"]

    if amount is not None:
        if not isinstance(amount, (int, float)):
            raise ValueError("amount_gt must be a number or null")

        if not math.isfinite(amount):
            raise ValueError("amount_gt must be finite")

        if amount <= 0:
            raise ValueError("amount_gt must be greater than 0")

        if amount > 10_000_000:
            raise ValueError("amount_gt exceeds safety limit")

    # Validate action
    action = policy["action"]

    if action not in ALLOWED_ACTIONS:
        raise ValueError(
            f"Invalid action: {action}. "
            f"Allowed actions: {ALLOWED_ACTIONS}"
        )

    return policy