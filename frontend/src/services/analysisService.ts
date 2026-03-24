import { AnalyzeRequest, AiAction } from '../types';

export const analyzeRegion = async (request: AnalyzeRequest): Promise<AiAction> => {
    const response = await fetch('http://localhost:8000/api/analyze-notes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new Error('Failed to analyze note');
    }

    const data = await response.json();
    return data;
};
