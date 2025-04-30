import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from '@llamaindex/openai';

export async function GET(request: NextRequest) {
  const llm = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'o3-mini',
  });

  try {
    // Extract headers 
    const apiKey = request.headers.get('X-API-Key');
    const indexId = request.headers.get('X-Index-ID');
    const projectId = request.headers.get('X-Project-ID');
    const organizationId = request.headers.get('X-Organization-ID');

    // Extract job_id from query parameters
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      );
    }

    if (!jobId) {
      return NextResponse.json(
        { error: 'job_id is required' },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    if (!indexId) {
      return NextResponse.json(
        { error: 'Index ID is required' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Fetch the parsed document from LlamaParse API
    console.log(`Fetching parsed document for job: ${jobId}`);
    
    const llamaIndexApiUrl = `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/markdown`;
    const queryParams = new URLSearchParams();
    queryParams.append('organization_id', organizationId);
    const finalUrl = `${llamaIndexApiUrl}?${queryParams}`
    
    const parsedDocResponse = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!parsedDocResponse.ok) {
      console.error(`Error fetching parsed document: ${parsedDocResponse.status}`);
      const errorText = await parsedDocResponse.text();
      console.error(`Error response: ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to fetch parsed document' },
        { status: parsedDocResponse.status }
      );
    }

    const parsedData = await parsedDocResponse.json();
    const markdown = parsedData.markdown;
    
    if (!markdown) {
      return NextResponse.json(
        { error: 'No markdown content found in parsed document' },
        { status: 404 }
      );
    }

    console.log('Successfully retrieved parsed document');

    // extract just the company name from the markdown
    const nameResponse = await llm.complete({
        prompt: `Extract the company name from the following markdown: ${markdown}
          Return ONLY the name of the company as a string, with no other text.
          Don't use markdown.`
    })

    const companyName = nameResponse.text.trim();
    console.log('Successfully extracted company name:', companyName);
    
    // Call the retriever API to get matching document
    console.log('Calling retriever API to find a contract that matches this company name');
    
    const retrieverApiUrl = `https://api.cloud.llamaindex.ai/api/v1/retrievers/retrieve?project_id=${projectId}&organization_id=${organizationId}`;
    
    const retrieverPayload = {
      mode: "full",
      query: companyName,
      pipelines: [
        {
          name: "Contract Matching Pipeline",
          description: "Find matching contract for invoice reconciliation",
          pipeline_id: indexId
        }
      ]
    };
    
    const retrieverResponse = await fetch(retrieverApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(retrieverPayload)
    });
    
    if (!retrieverResponse.ok) {
      console.error(`Error calling retriever API: ${retrieverResponse.status}`);
      const errorText = await retrieverResponse.text();
      console.error(`Error response: ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to find matching document' },
        { status: retrieverResponse.status }
      );
    }
    
    const retrieverData = await retrieverResponse.json();
    
    if (!retrieverData.nodes || retrieverData.nodes.length === 0) {
      return NextResponse.json(
        { error: 'No matching documents found' },
        { status: 404 }
      );
    }

    //console.log("Retriever data:", JSON.stringify(retrieverData, null, 2));
    
    // Extract document ID from the first node
    const firstNode = retrieverData.nodes[0];
    if (!firstNode.node || !firstNode.node.metadata || !firstNode.node.metadata.document_id) {
      return NextResponse.json(
        { error: 'Document ID not found in response' },
        { status: 404 }
      );
    }
    
    const documentId = firstNode.node.metadata.document_id;
    console.log(`Found matching contract with ID: ${documentId}`);
    
    // Fetch the full document text
    console.log(`Fetching full contract text for document ID: ${documentId}`);
    
    const documentApiUrl = `https://api.cloud.llamaindex.ai/api/v1/pipelines/${indexId}/documents/${documentId}`;
    
    const documentResponse = await fetch(documentApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!documentResponse.ok) {
      console.error(`Error fetching document text: ${documentResponse.status}`);
      const errorText = await documentResponse.text();
      console.error(`Error response: ${errorText}`);
      return NextResponse.json(
        { error: 'Failed to fetch contract document' },
        { status: documentResponse.status }
      );
    }
    
    const documentData = await documentResponse.json();
    
    if (!documentData.text) {
      return NextResponse.json(
        { error: 'No text content found in contract document' },
        { status: 404 }
      );
    }
    
    const contractText = documentData.text;
    console.log('Successfully retrieved contract text');
    
    const llmResponse = await llm.complete({
        prompt: `
            Your job is to reconcile an invoice against a contract.
            The contract text is this:
            <contract>
                ${contractText}
            </contract>
            The invoice text is this:
            <invoice>
                ${markdown}
            </invoice>
            Your output should be a JSON object with the following fields:            
            - status: "success" or "failure". To succeed, the invoice should 
            have a set of line items that match the terms of the contract in 
            terms of item names, price, and quantities.
            - If the invoice is successful, also include total_due.
            - No matter what, include due_date: in the format YYYY-MM-DD.

            If there is a problem with the invoice, you should return "failure" 
            and an additional key:
            - errors: an array of strings describing problems with the invoice. 
            Each error should be a very short description of a single problem.

            Return ONLY JSON, with no preamble or postamble and no other text. 
            Do not include markdown formatting of any kind.
        `
    })

    const reconciliationResult = JSON.parse(llmResponse.text);
    
    // Add documentId to the reconciliation result
    reconciliationResult.contractId = documentId;

    // add the markdown to the reconciliation result
    reconciliationResult.markdown = markdown;

    // Come up with a friendly name for the contract
    const friendlyNameResponse = await llm.complete({
        prompt: `Come up with a very brief name for this invoice,
        in the format "Invoice <invoice ID> <name of billing company>"
        where <invoice ID> is some identifier for the invoice, and <name of billing company>
        is the name of the billing company.
        Here's the contract:
        <contract>${contractText}</contract>
        Return ONLY the name as a string, with no other text. Don't use Markdown.
        `
    })

    const friendlyName = friendlyNameResponse.text.trim();
    reconciliationResult.friendlyName = friendlyName;

    console.log("Reconciliation result:", JSON.stringify(reconciliationResult, null, 2));

    // Return success response with the enhanced reconciliation result
    return NextResponse.json(reconciliationResult);
  } catch (error) {
    console.error('Error in reconciliation process:', error);
    return NextResponse.json(
      { error: 'Failed to start reconciliation process' },
      { status: 500 }
    );
  }
} 
