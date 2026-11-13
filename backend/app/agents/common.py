from datetime import datetime, timezone
from typing import Any


def agent_result(
    agent: str,
    output: Any,
    evidence_refs: list[str] | None = None,
    confidence: float = 0.8,
    uncertainty: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "output": output,
        "evidence_refs": evidence_refs or [],
        "confidence": max(0.0, min(1.0, confidence)),
        "uncertainty": uncertainty or [],
        "audit_event": {
            "event_type": "agent_output",
            "agent": agent,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    }
