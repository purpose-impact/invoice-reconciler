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

    // Parse form data from the request
    const formData = await req.formData();
    
    // Extract files, first check for file_0, file_1, etc.
    let files: File[] = [];
    
    let index = 0;
    while (formData.has(`file_${index}`)) {
      const file = formData.get(`file_${index}`) as File;
      if (file instanceof File) {
        files.push(file);
      }
      index++;
    }
    
    console.log(`Found ${files.length} files with file_N format`);
    
    // If no files found, try generic 'file' entries
    if (files.length === 0) {
      const formFiles = formData.getAll('file');
      files = formFiles.filter(f => f instanceof File) as File[];
      console.log(`Found ${files.length} files with 'file' format`);
    }
    
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Upload each file to LlamaIndex API and collect job IDs
    const uploadedFiles: Array<{fileName: string, job_id: string}> = [];
    
    for (const file of files) {
      console.log(`Processing file: ${file.name}`);
      
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      
      const uploadUrl = `https://api.cloud.llamaindex.ai/api/v1/parsing/upload?organization_id=${organizationId}&project_id=${projectId}`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: uploadFormData,
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`Failed to upload file ${file.name}: ${errorText}`);
        throw new Error(`Failed to upload file: ${errorText}`);
      }
      
      const responseData = await uploadResponse.json();
      console.log('Upload response:', responseData);
      
      if (responseData.id) {
        uploadedFiles.push({
          fileName: file.name,
          job_id: responseData.id
        });
      }
    }

    console.log('Successfully uploaded files:', uploadedFiles);
    
    return NextResponse.json({ 
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error processing invoice upload:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error processing invoice upload'
    }, { status: 500 });
  }
} 
