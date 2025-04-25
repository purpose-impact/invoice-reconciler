import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key');
    const organizationId = request.headers.get('X-Organization-Id');
    const projectId = request.headers.get('X-Project-Id');
    const indexId = request.headers.get('X-Index-Id');

    if (!apiKey || !organizationId || !projectId || !indexId) {
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.cloud.llamaindex.ai/api/v1/pipelines/${indexId}/documents`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Organization-Id': organizationId,
          'X-Project-Id': projectId,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: 'Failed to fetch documents', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform the response into our expected format
    const contracts = data.map((doc: any) => ({
      friendlyName: null, // We'll set this up later
      fileName: doc.metadata?.file_name || 'Unknown file'
    }));

    return NextResponse.json(contracts);
  } catch (error) {
    console.error('Error in contracts list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
