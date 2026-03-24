from abc import ABC, abstractmethod
from typing import Optional

class BaseVisionProvider(ABC):
    @abstractmethod
    async def analyze(self, image_base64: str, prompt: str, api_key: Optional[str], model_id: str) -> str:
        """Send image + prompt, return raw text response."""
        pass
