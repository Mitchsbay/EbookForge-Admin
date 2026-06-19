import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    // 1. Wrap the entire handler inside a thorough try/catch block.
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // 2. Ensure the OpenAI initialization is robust.
    // Use the official OpenAI API base URL to ensure compatibility with DALL-E 3 parameters like response_format
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://api.openai.com/v1',
    });

    // 3. Use the exact DALL-E 3 payload structure.
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt, // from the request body
      n: 1,
      size: "1024x1024",
      response_format: "b64_json"
    });

    // 4. Correctly extract the image data safely.
    const base64Image = response.data?.[0]?.b64_json;

    if (!base64Image) {
      throw new Error('No image data received from OpenAI');
    }

    return NextResponse.json({
      success: true,
      image: {
        base64Data: base64Image,
        generatedAt: new Date().toISOString(),
        prompt,
      },
    });
  } catch (error: any) {
    // 5. Log the exact error to the server console and return a clean JSON error response.
    console.error("OpenAI Image Error Details:", error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate image',
        details: error.response?.data || error.stack 
      },
      { status: 500 }
    );
  }
}
