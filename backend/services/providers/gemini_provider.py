from typing import Optional
from .base import BaseVisionProvider
import google.generativeai as genai
import tempfile
import base64
import os
from dotenv import load_dotenv

load_dotenv()

class GeminiProvider(BaseVisionProvider):
    async def analyze(self, image_base64: str, prompt: str, api_key: Optional[str], model_id: str) -> str:
        key = api_key or os.environ.get("GOOGLE_API_KEY")
        if not key:
            raise ValueError("GOOGLE_API_KEY is not set.")
        
        genai.configure(api_key=key)
        model = genai.GenerativeModel(model_id or 'gemini-1.5-flash')
        
        image_data = base64.b64decode(image_base64)

        
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": image_data}
        ])
        return response.text
