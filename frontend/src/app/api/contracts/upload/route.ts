import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Check API key
    const apiKey = req.headers.get('X-API-Key');
    const indexId = req.headers.get('X-Index-ID');
    const projectId = req.headers.get('X-Project-ID');
    const organizationId = req.headers.get('X-Organization-ID');

    console.log('Received headers:', {
      apiKey: apiKey ? 'present' : 'missing',
      indexId: indexId ? 'present' : 'missing',
      projectId: projectId ? 'present' : 'missing',
      organizationId: organizationId ? 'present' : 'missing'
    });

    if (!apiKey || !indexId || !projectId || !organizationId) {
      return NextResponse.json({ error: 'Missing required headers' }, { status: 401 });
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const files: File[] = [];
    let index = 0;
    while (formData.has(`file_${index}`)) {
      const file = formData.get(`file_${index}`) as File;
      if (file) {
        files.push(file);
      }
      index++;
    }

    console.log(`Found ${files.length} files to upload`);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Step 1: Upload each file to get file IDs
    const fileIds = await Promise.all(
      files.map(async (file) => {
        console.log(`Uploading file: ${file.name}`);
        const uploadFormData = new FormData();
        uploadFormData.append('upload_file', file);

        const url = `https://api.cloud.llamaindex.ai/api/v1/files?project_id=${projectId}&organization_id=${organizationId}&external_file_id=${encodeURIComponent(file.name)}`;
        console.log('Upload URL:', url);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: uploadFormData,
        });

        console.log(`File upload response status: ${response.status}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`File upload error: ${errorText}`);
          throw new Error(`Failed to upload file ${file.name}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`File upload response:`, data);
        return data.id;
      })
    );

    console.log('All files uploaded, file IDs:', fileIds);

    // Step 2: Associate files with pipeline
    const pipelineUrl = `https://api.cloud.llamaindex.ai/api/v1/pipelines/${indexId}/files`;
    console.log('Pipeline URL:', pipelineUrl);
    const fileObjects = fileIds.map(id => ({ file_id: id }));
    console.log('Request body:', fileObjects);

    const pipelineResponse = await fetch(pipelineUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fileObjects),
    });

    console.log(`Pipeline response status: ${pipelineResponse.status}`);
    if (!pipelineResponse.ok) {
      const errorText = await pipelineResponse.text();
      console.error(`Pipeline error: ${errorText}`);
      throw new Error(`Failed to associate files with pipeline: ${errorText}`);
    }

    const result = await pipelineResponse.json();
    console.log('Pipeline response:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error processing upload'
    }, { status: 500 });
  }
} 
