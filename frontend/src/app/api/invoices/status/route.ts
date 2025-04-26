import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Check API key
    const apiKey = req.headers.get('X-API-Key');
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    // Get job_id from query parameters
    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');
    
    if (!jobId) {
      return NextResponse.json({ error: 'Missing job_id parameter' }, { status: 400 });
    }
    
    // Call LlamaIndex API to check job status
    const statusUrl = `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}`;
    
    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      return NextResponse.json({ 
        error: `Failed to check job status: ${errorText}` 
      }, { status: statusResponse.status });
    }
    
    const statusData = await statusResponse.json();
    return NextResponse.json(statusData);
    
  } catch (error) {
    console.error('Error checking job status:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error checking job status'
    }, { status: 500 });
  }
} 
