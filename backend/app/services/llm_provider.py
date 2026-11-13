from abc import ABC, abstractmethod
from typing import Any


class LLMProvider(ABC):
    @abstractmethod
    def complete(self, prompt: str, context: list[dict[str, Any]] | None = None) -> str:
        raise NotImplementedError


class MockLLMProvider(LLMProvider):
    def complete(self, prompt: str, context: list[dict[str, Any]] | None = None) -> str:
        del context
        return f"Grounded demo response: {prompt.strip()}"
