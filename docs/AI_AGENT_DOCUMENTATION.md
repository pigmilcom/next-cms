# AI Agent Integration - Complete Documentation

This document provides comprehensive information about the AI Agent integration with Replicate API.

## Overview

The AI Agent system provides a complete integration with Replicate API, allowing you to:
- Manage AI models through the admin panel
- Execute AI models from both frontend and backend
- Configure model parameters and defaults
- Handle asynchronous predictions with status tracking

## Features

### ✅ Admin Panel Management
- Enable/disable AI agent
- Configure Replicate API key
- Create, edit, and delete AI models
- Set default parameters for each model
- Model templates for common use cases

### ✅ Direct Database Access
- Uses `admin.js` functions with `DBService` (no HTTP overhead)
- Cached settings and models
- Optimized performance

### ✅ Frontend Integration
- React hooks for easy AI model usage
- Utility functions for direct API calls
- Support for both async and sync execution patterns

### ✅ Backend Integration  
- Server-side utilities for API routes and server components
- Batch execution capabilities
- Template functions for common tasks

## Setup

### 1. Enable AI Agent

Go to `/admin/developer/ai` and:
1. Toggle "AI Agent Enabled" to ON
2. Add your Replicate API key (get from [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens))
3. Click "Save Settings"

### 2. Add AI Models

Choose from quick templates or create custom models:
- **GPT-4 Text Generation**: Advanced text completion
- **Stable Diffusion XL**: High-quality image generation  
- **Whisper Speech-to-Text**: Audio transcription
- **LLaMA 2 Chat**: Open-source conversational AI

For each model, configure:
- **Name**: Display name for the model
- **Replicate Model ID**: The model identifier (e.g., `stability-ai/sdxl`)
- **Description**: What the model does
- **Default Configuration**: JSON parameters that will be used by default

## Usage Examples

### Frontend (React Components)

#### Using React Hooks

```jsx
import { useAI, useTextGeneration, useImageGeneration } from '@/hooks/useAI';

function MyComponent() {
  // Basic AI hook
  const { execute, isLoading, result, error } = useAI();
  
  const handleGenerate = async () => {
    const result = await execute('my_model_id', {
      prompt: 'Write a story about dragons',
      temperature: 0.8
    });
  };

  // Specialized text generation
  const { generateText } = useTextGeneration();
  
  const handleTextGen = async () => {
    await generateText('Write a poem about nature', {
      temperature: 0.7,
      maxTokens: 200
    });
  };

  // Image generation  
  const { generateImage } = useImageGeneration();
  
  const handleImageGen = async () => {
    await generateImage('A beautiful sunset over mountains', {
      width: 1024,
      height: 768
    });
  };

  return (
    <div>
      {isLoading && <p>Generating...</p>}
      {error && <p>Error: {error}</p>}
      {result && <div>Result: {JSON.stringify(result)}</div>}
      
      <button onClick={handleGenerate}>Generate with AI</button>
    </div>
  );
}
```

#### Using Utility Functions

```jsx
import { callAIModel, callAIModelAndWait, AIPresets } from '@/lib/ai-utils';

async function generateContent() {
  // Quick execution (returns prediction ID)
  const result = await callAIModel('text_model_id', 
    AIPresets.generateText('Write a blog post about AI')
  );
  
  // Execute and wait for completion
  const completedResult = await callAIModelAndWait('image_model_id',
    AIPresets.generateImage('A futuristic city', { width: 512 })
  );
}
```

### Backend (API Routes & Server Components)

#### Server Components

```jsx
import { runAIModel, ServerAITemplates } from '@/lib/server/ai-utils';

export default async function MyPage() {
  // Direct model execution
  const textResult = await runAIModel('text_model_id', {
    prompt: 'Summarize the benefits of AI',
    max_tokens: 200
  });

  // Using templates
  const summary = await ServerAITemplates.generateText(
    'Explain quantum computing in simple terms'
  );

  const analysis = await ServerAITemplates.analyzeContent(
    'Some content to analyze',
    'Sentiment analysis'
  );

  return (
    <div>
      <h1>AI Generated Content</h1>
      {textResult.success && <p>{textResult.data.output}</p>}
    </div>
  );
}
```

#### API Routes

```javascript
// /app/api/my-ai-endpoint/route.js
import { executeAIModel } from '@/lib/server/admin';
import { ServerAITemplates } from '@/lib/server/ai-utils';

export async function POST(req) {
  const { prompt, type } = await req.json();

  let result;
  if (type === 'text') {
    result = await ServerAITemplates.generateText(prompt);
  } else if (type === 'image') {
    result = await ServerAITemplates.generateImage(prompt);
  } else {
    // Direct model execution
    result = await executeAIModel('custom_model_id', {
      prompt,
      custom_param: 'value'
    });
  }

  return Response.json(result);
}
```

### Advanced Usage

#### Batch Processing

```javascript
import { runMultipleAIModels } from '@/lib/server/ai-utils';

const requests = [
  { modelId: 'text_model', params: { prompt: 'Story 1' } },
  { modelId: 'text_model', params: { prompt: 'Story 2' } },
  { modelId: 'image_model', params: { prompt: 'Image 1' } }
];

const results = await runMultipleAIModels(requests);
```

#### Polling for Results

```javascript
import { useAI } from '@/hooks/useAI';

const { execute, checkStatus, waitForResult } = useAI();

// Start prediction
const prediction = await execute('model_id', { prompt: 'Test' });

// Poll for status
const status = await checkStatus(prediction.id);

// Wait for completion (with timeout)
const finalResult = await waitForResult(prediction.id, 300000); // 5 min timeout
```

## Model Configuration Examples

### Text Generation Models

```json
{
  "prompt": "",
  "temperature": 0.7,
  "max_tokens": 500,
  "top_p": 0.9,
  "frequency_penalty": 0,
  "presence_penalty": 0
}
```

### Image Generation Models

```json
{
  "prompt": "",
  "width": 1024,
  "height": 1024,
  "num_inference_steps": 20,
  "guidance_scale": 7.5,
  "negative_prompt": "",
  "scheduler": "DPMSolverMultistep"
}
```

### Audio Transcription Models

```json
{
  "audio": "",
  "language": "en",
  "task": "transcribe",
  "temperature": 0,
  "patience": 1,
  "suppress_tokens": "-1"
}
```

## API Reference

### Admin Functions (`/lib/server/admin.js`)

- `getAISettings()` - Get AI configuration
- `updateAISettings(settings)` - Update AI configuration
- `getAllAIModels(params)` - Get all AI models
- `getAIModelById(id)` - Get specific model
- `createAIModel(data)` - Create new model
- `updateAIModel(id, data)` - Update model
- `deleteAIModel(id)` - Delete model
- `executeAIModel(id, params)` - Execute model

### Client Utilities (`/lib/ai-utils.js`)

- `callAIModel(modelId, params)` - Execute model (async)
- `callAIModelAndWait(modelId, params)` - Execute and wait
- `getAIPredictionStatus(predictionId)` - Check status
- `waitForPrediction(predictionId)` - Poll until complete

### Server Utilities (`/lib/server/ai-utils.js`)

- `runAIModel(modelId, params)` - Server-side execution
- `getEnabledAIModels()` - Get enabled models
- `findAIModelByName(name)` - Find model by name
- `runMultipleAIModels(requests)` - Batch execution

### React Hooks (`/hooks/useAI.js`)

- `useAI()` - General AI hook
- `useTextGeneration()` - Text-specific hook
- `useImageGeneration()` - Image-specific hook  
- `useMultipleAI()` - Multiple operations hook

### API Endpoints

- `POST /api/ai/execute` - Execute model from frontend
- `GET /api/ai/prediction/[id]` - Get prediction status

## Database Collections

### `ai_settings`
```json
{
  "enabled": true,
  "replicateApiKey": "r8_xxx",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### `ai_models`
```json
{
  "id": "ai_model_1234567890",
  "name": "My Text Generator",
  "modelId": "meta/llama-2-70b-chat",
  "description": "Advanced text generation model",
  "enabled": true,
  "provider": "replicate",
  "config": {
    "prompt": "",
    "temperature": 0.7,
    "max_tokens": 500
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling

All AI functions return a consistent response format:

```javascript
// Success
{
  success: true,
  data: { /* Replicate response */ }
}

// Error
{
  success: false,
  error: "Error message"
}
```

## Performance Tips

1. **Use Server-Side Functions**: Prefer `admin.js` functions in server components for better performance
2. **Cache Models**: Models are automatically cached for 5 minutes
3. **Async by Default**: Most AI operations are asynchronous - use `waitForCompletion` only when needed
4. **Batch Operations**: Use `runMultipleAIModels` for multiple requests
5. **Error Boundaries**: Wrap AI components in error boundaries

## Security

- API keys are stored securely in the database
- All model execution requires valid AI settings
- Models can be disabled individually
- Server-side validation prevents unauthorized access

## Troubleshooting

### Common Issues

1. **"AI agent is not enabled"**: Enable it in `/admin/developer/ai`
2. **"Replicate API key not configured"**: Add your API key in settings
3. **"Model not found"**: Check that the model exists and is enabled
4. **Rate limits**: Replicate has API rate limits - implement retries if needed

### Debug Mode

Add logging to see what's happening:

```javascript
const result = await executeAIModel('model_id', params);
console.log('AI Result:', result);
```

## Migration from Old API Routes

The system now uses `admin.js` functions instead of direct API calls for better performance. The old API routes still work for backward compatibility, but new code should use the admin functions directly.

### Before (Old Way)
```javascript
const res = await fetch('/api/ai/models');
const models = await res.json();
```

### After (New Way)
```javascript
import { getAllAIModels } from '@/lib/server/admin';
const result = await getAllAIModels();
const models = result.data;
```

This provides better performance, error handling, and eliminates HTTP overhead.