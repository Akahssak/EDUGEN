from typing import Optional
from .base import BaseVisionProvider
import httpx

class OllamaProvider(BaseVisionProvider):
    async def analyze(self, image_base64: str, prompt: str, api_key: Optional[str], model_id: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": model_id or "llava",
                    "prompt": prompt,
                    "images": [image_base64],
                    "stream": False
                },
                timeout=60.0
            )
            response.raise_for_status()
            return response.json().get("response", "")
