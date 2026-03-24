from .providers.base import BaseVisionProvider
from .providers.ollama_provider import OllamaProvider
from .providers.gemini_provider import GeminiProvider
from .providers.dummy_providers import OpenAIProvider, AnthropicProvider

PROVIDER_REGISTRY: dict[str, type[BaseVisionProvider]] = {
    "ollama": OllamaProvider,
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "gemini": GeminiProvider,
}

def get_provider(provider_name: str) -> BaseVisionProvider:
    cls = PROVIDER_REGISTRY.get(provider_name.lower())
    if not cls:
        raise ValueError(f"Unknown provider: {provider_name}")
    return cls()
