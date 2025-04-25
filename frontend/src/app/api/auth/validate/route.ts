import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { apiKey } = await request.json();
  
  if (!apiKey || apiKey.trim() === '') {
    return NextResponse.json({ keyStatus: 'invalid' }, { status: 401 });
  }

  try {
    const response = await fetch('https://api.cloud.llamaindex.ai/api/v1/projects', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      return NextResponse.json({ keyStatus: 'valid' });
    }
    
    return NextResponse.json({ keyStatus: 'invalid' }, { status: 401 });
  } catch (error) {
    console.error('Error validating API key:', error);
    return NextResponse.json({ keyStatus: 'invalid' }, { status: 401 });
  }
} 
