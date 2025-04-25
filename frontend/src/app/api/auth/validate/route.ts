import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { apiKey } = await request.json();
  
  if (!apiKey || apiKey.trim() === '') {
    return NextResponse.json({ keyStatus: 'invalid' }, { status: 401 });
  }

  try {
    const response = await fetch('https://api.cloud.llamaindex.ai/api/v1/projects/current', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      const data = await response.json();
      return NextResponse.json({ 
        keyStatus: 'valid',
        project_id: data.id,
        organization_id: data.organization_id
      });
    }
    
    return NextResponse.json({ keyStatus: 'invalid' }, { status: 401 });
  } catch (error) {
    console.error('Error validating API key:', error);
    return NextResponse.json({ keyStatus: 'invalid' }, { status: 401 });
  }
} 
