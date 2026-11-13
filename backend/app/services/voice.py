from typing import Any


def synthesize(payload: dict[str, Any]) -> dict[str, Any]:
    text = str(payload.get("text", "")).strip()
    personalized = bool(payload.get("personalized", False))
    consent = bool(payload.get("consent", False))
    if personalized and not consent:
        raise ValueError("Personalised voice synthesis requires explicit, revocable consent.")
    if not text:
        raise ValueError("Text is required for voice output.")
    return {
        "text": text,
        "mode": "personalized_stub" if personalized else "standard_ai_voice",
        "audio_url": None,
        "text_alternative": text,
        "consent_recorded": consent if personalized else False,
        "authentication_supported": False,
        "note": "MVP backend stub; use browser speechSynthesis for standard voice output.",
    }
