import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Check required headers
    const apiKey = req.headers.get('X-API-Key');
    const organizationId = req.headers.get('X-Organization-Id');
    const projectId = req.headers.get('X-Project-Id');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 401 });
    }
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 401 });
    }
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 401 });
    }

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // Call LlamaIndex API to check for existing pipeline
    const pipelineResponse = await fetch('https://api.cloud.llamaindex.ai/api/v1/pipelines?pipeline_name=Invoicer Index', {
      headers
    });

    if (pipelineResponse.ok) {
      const pipelineData = await pipelineResponse.json();
      if (pipelineData.length > 0) {
        // Return the ID of the first matching pipeline
        return NextResponse.json({ 
          index_id: pipelineData[0].id
        });
      }
    }

    // If no pipeline found, look for embedding configs
    const embeddingResponse = await fetch('https://api.cloud.llamaindex.ai/api/v1/embedding-model-configs', {
      headers
    });

    let embeddingConfigId: string | null = null;
    if (embeddingResponse.ok) {
      const embeddingData = await embeddingResponse.json();
      if (embeddingData.length > 0) {
        embeddingConfigId = embeddingData[0].id;
      }
    }

    if (!embeddingConfigId) {
      // Create a new embedding config
      const createEmbeddingResponse = await fetch('https://api.cloud.llamaindex.ai/api/v1/embedding-model-configs', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: "Invoicer embedding",
          embedding_config: {
            type: "OPENAI_EMBEDDING",
            component: {
              model_name: "text-embedding-3-small",
              embed_batch_size: 10,
              num_workers: 0,
              additional_kwargs: {},
              api_key: process.env.OPENAI_API_KEY,
              max_retries: 10,
              timeout: 60,
              default_headers: {},
              reuse_client: true,
              dimensions: 1536,
              azure_endpoint: "string",
              azure_deployment: "string",
              class_name: "OpenAIEmbedding"
            }
          }
        })
      });

      if (createEmbeddingResponse.ok) {
        const createdConfig = await createEmbeddingResponse.json();
        embeddingConfigId = createdConfig.id;
      } else {
        console.error('Failed to create embedding config:', await createEmbeddingResponse.text());
        return NextResponse.json({ 
          error: 'Failed to create embedding config'
        }, { status: 500 });
      }
    }

    // Create a new pipeline using the embedding config
    const createPipelineResponse = await fetch(`https://api.cloud.llamaindex.ai/api/v1/pipelines?project_id=${projectId}&organization_id=${organizationId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        embedding_model_config_id: embeddingConfigId,
        data_sink_id: null,
        name: "Invoicer Index",
        transform_config: { mode: "auto" }
      })
    });

    if (createPipelineResponse.ok) {
      const createdPipeline = await createPipelineResponse.json();
      return NextResponse.json({ 
        index_id: createdPipeline.id
      });
    } else {
      console.error('Failed to create pipeline:', await createPipelineResponse.text());
      return NextResponse.json({ 
        error: 'Failed to create pipeline'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in initialize endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error during initialization'
    }, { status: 500 });
  }
} 
