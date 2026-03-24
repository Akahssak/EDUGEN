from pydantic import BaseModel
from typing import Optional

class ModelConfig(BaseModel):
    provider: str
    modelId: str
    apiKey: Optional[str] = None

class BoundingBox(BaseModel):
    x: float
    y: float
    w: float
    h: float

class Coordinates(BaseModel):
    x_offset: float
    y_offset: float

class AnalyzeRequest(BaseModel):
    imageBase64: str
    boundingBox: BoundingBox
    model: ModelConfig

class AiAction(BaseModel):
    explanation: str
    diagram: Optional[str] = None
    coordinates: Coordinates
