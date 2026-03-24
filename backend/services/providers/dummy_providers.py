from typing import Optional
from .base import BaseVisionProvider

class DummyProvider(BaseVisionProvider):
    async def analyze(self, image_base64: str, prompt: str, api_key: Optional[str], model_id: str) -> str:
        return '{"explanation": "This provider is not implemented yet. Use Gemini or Ollama.", "diagram": null, "coordinates": {"x_offset": 50, "y_offset": 50}}'

# We map both OpenAI and Anthropic to Dummy for now
class OpenAIProvider(DummyProvider): pass
class AnthropicProvider(DummyProvider): pass
