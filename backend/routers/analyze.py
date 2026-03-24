from fastapi import APIRouter, HTTPException
from models.schemas import AnalyzeRequest, AiAction
from services.model_router import get_provider
import json

router = APIRouter()

SYSTEM_PROMPT = """You are an expert tutor. A student circled part of their notes.
Analyze the image and return ONLY valid JSON:
{"explanation": "string", "diagram": "mermaid string or null", "coordinates": {"x_offset": int, "y_offset": int}}
No extra text. No markdown fences. Valid JSON only."""

@router.post("/analyze-notes", response_model=AiAction)
async def analyze_notes(request: AnalyzeRequest):
    provider = get_provider(request.model.provider)
    try:
        raw_response = await provider.analyze(
            image_base64=request.imageBase64,
            prompt=SYSTEM_PROMPT,
            api_key=request.model.apiKey,
            model_id=request.model.modelId
        )
        
        raw_response = raw_response.strip()
        if raw_response.startswith("```json"):
            raw_response = raw_response[7:-3].strip()
        elif raw_response.startswith("```"):
            raw_response = raw_response[3:-3].strip()
            
        data = json.loads(raw_response)
        return AiAction(**data)
    except Exception as e:
        print(f"Error during analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))
