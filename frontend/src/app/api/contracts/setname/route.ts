import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from '@llamaindex/openai';

export async function GET(req: NextRequest) {
  try {
    // Check required headers
    const apiKey = req.headers.get('X-API-Key');
    const organizationId = req.headers.get('X-Organization-Id');
    const projectId = req.headers.get('X-Project-Id');
    const indexId = req.headers.get('X-Index-Id');

    if (!apiKey || !organizationId || !projectId || !indexId) {
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    // Get contract ID from query parameter
    const { searchParams } = new URL(req.url);
    const contractId = searchParams.get('contract_id');

    if (!contractId) {
      return NextResponse.json(
        { error: 'Missing contract_id query parameter' },
        { status: 400 }
      );
    }

    // Fetch document from LlamaIndex API
    const response = await fetch(
      `https://api.cloud.llamaindex.ai/api/v1/pipelines/${indexId}/documents/${contractId}`,
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
        { error: 'Failed to fetch document', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();

    console.log("Stored contract data:", data);

    const contractText = data.text;

    const llm = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o',
    });

    const nameResponse = await llm.complete({
      prompt: `Read the following contract and come up with a friendly name for it, 
          probably based on the name of the company issuing the contract. 
          <contract>${contractText}</contract>
          Respond with the name as a string only, no other text, no preamble.`,
    });

    const friendlyName = nameResponse.text.trim();

    // Update the document with the friendly name
    const updateResponse = await fetch(
      `https://api.cloud.llamaindex.ai/api/v1/pipelines/${indexId}/documents`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Organization-Id': organizationId,
          'X-Project-Id': projectId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          text: contractText,
          metadata: {
            ...data.metadata,
            friendlyName: friendlyName,
            document_id: contractId
          },
          id: contractId
        }])
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      return NextResponse.json(
        { error: 'Failed to update document', details: error },
        { status: updateResponse.status }
      );
    }

    const updateData = await updateResponse.json();
    console.log('Update response:', updateData);

    return NextResponse.json({
      success: true,
      message: 'Contract name updated successfully',
      data
    });

  } catch (error) {
    console.error('Error in setname endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
