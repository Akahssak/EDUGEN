export interface ModelConfig {
    provider: "ollama" | "openai" | "anthropic" | "gemini";
    modelId: string;
    apiKey: string | null;
}

export interface AnalyzeRequest {
    imageBase64: string;
    boundingBox: { x: number; y: number; w: number; h: number };
    model: ModelConfig;
}

export interface AiAction {
    explanation: string;
    diagram: string | null;
    coordinates: { x_offset: number; y_offset: number };
}
