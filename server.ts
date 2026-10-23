import express, { Request, Response } from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize GoogleGenAI server-side with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to safely read file content
const readProjectFile = (filepath: string): string => {
  try {
    const fullPath = path.resolve(process.cwd(), filepath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf-8');
    }
  } catch (err) {
    console.warn(`Could not read ${filepath}:`, err);
  }
  return '';
};

// -----------------------------------------------------------------------------
// GET /api/presets : Return core engine and 3 concrete scripts
// -----------------------------------------------------------------------------
app.get('/api/presets', (_req: Request, res: Response) => {
  const corePy = readProjectFile('blender_agent_core.py');
  const script1 = readProjectFile('script_1_speed_motion_graphic.py');
  const script2 = readProjectFile('script_2_studio_product_rig.py');
  const script3 = readProjectFile('script_3_headless_cloth_bake.py');
  const schema = readProjectFile('src/data/agent_skill_schema.json');
  const arch = readProjectFile('src/data/system_architecture.md');

  res.json({
    core: corePy,
    script1,
    script2,
    script3,
    schema,
    architecture: arch,
  });
});

// -----------------------------------------------------------------------------
// POST /api/generate-bpy : Autonomous Blender Python Generation
// -----------------------------------------------------------------------------
app.post('/api/generate-bpy', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      blenderVersion = '4.2_LTS',
      engine = 'CYCLES',
      samples = 128,
      resolution = [1920, 1080],
      frames = 120,
      fps = 24,
      useThinking = false,
      model = 'gemini-4-argon',
    } = req.body;

    const systemInstruction = `You are a world-class 3D Technical Director and Principal Developer specializing in Blender Python (bpy), bmesh, and headless automation.
Your task is to generate complete, production-ready, clean Python code that executes autonomously in Blender headless background mode ('blender -b -P script.py').

CRITICAL CONSTRAINTS:
1. Target Blender compatibility: ${blenderVersion} (Supports Blender 3.6 LTS through Blender 4.x+).
2. Direct Data API over bpy.ops: Always use bpy.data.objects, bpy.data.meshes, and bmesh directly. Only use bpy.ops when strictly required (e.g. physics point cache bake).
3. Headless safety: Never assume active 3D viewports or UI context. Always use bpy.context.temp_override(active_object=..., selected_objects=...) for operators.
4. Bmesh safety: Always call mesh.update() and bm.free() in a try...finally block.
5. In Blender 4.0+, Principled BSDF uses 'Transmission Weight' (fallback to 'Transmission') and 'Coat Weight' (fallback to 'Clearcoat').
6. Setup scene purge, procedural geometry, Principled BSDF shader, 3-point or ambient lighting, camera with track constraint, animation keyframing, and Cycles/EEVEE render output configuration.
7. Return ONLY clean Python code without markdown wraps, or wrapped in a standard \`\`\`python ... \`\`\` block.`;

    const contents = `Generate a complete, self-contained Blender Python (bpy) headless script for the following brief:
Prompt: "${prompt}"

Parameters:
- Target Engine: ${engine}
- Samples: ${samples}
- Resolution: ${resolution[0]}x${resolution[1]}
- Frame Range: 1 to ${frames} (${fps} fps)
- Headless Render Output: //render/output_####.png

Make sure all classes and imports are present so running 'blender -b -P generated_script.py' runs completely with 0 errors.`;

    const config: any = {
      systemInstruction,
      temperature: 0.2,
    };

    if (useThinking && model === 'gemini-4-argon') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    const response = await ai.models.generateContent({
      model: model || 'gemini-4-argon',
      contents,
      config,
    });

    let code = response.text || '';
    // Strip markdown code block fences if present
    code = code.replace(/^```python\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

    res.json({
      success: true,
      code,
      modelUsed: model,
      blenderVersion,
    });
  } catch (err: any) {
    console.error('Error in /api/generate-bpy:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate Blender script',
    });
  }
});

// -----------------------------------------------------------------------------
// POST /api/chat : Multi-turn Gemini Chat with TD personas & model choice
// -----------------------------------------------------------------------------
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const {
      messages = [],
      model = 'gemini-3.8-flash',
      role = 'technical_director',
      useThinking = false,
    } = req.body;

    let roleInstruction = 'You are an elite 3D Technical Director and Blender Python automation expert.';
    if (role === 'technical_director') {
      roleInstruction = `You are a Principal 3D Technical Director specializing in procedural bpy and bmesh architecture, production studio rigs, camera mathematics, and shader pipelines for Blender 3.6 - 4.x+. Provide architectural advice, clean bpy snippets, and debugging assistance.`;
    } else if (role === 'script_optimizer') {
      roleInstruction = `You are a Blender Python Performance & Memory Optimizer. You audit scripts for memory leaks (orphaned bmesh, missing bm.free()), replace slow bpy.ops with fast Direct Data API / NumPy calls, and optimize Cycles tile sizes, adaptive sampling, and geometry memory limits.`;
    } else if (role === 'renderjuice_artist') {
      roleInstruction = `You are a creative motion design director preparing winning entries for RenderJuice motion graphics competitions. You specialize in kinetic typography, supersonic shockwaves, speed trails, dynamic camera flythroughs, chromatic aberration, and high-impact visual effects.`;
    }

    // Format conversation history
    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    const config: any = {
      systemInstruction: roleInstruction,
      temperature: 0.7,
    };

    if (useThinking && model === 'gemini-4-argon') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    const response = await ai.models.generateContent({
      model: model || 'gemini-3.8-flash',
      contents,
      config,
    });

    res.json({
      success: true,
      reply: response.text || '',
    });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Chat generation failed',
    });
  }
});

// -----------------------------------------------------------------------------
// POST /api/generate-image : High-quality Concept & Texture Generation
// Models: gemini-3-pro-image (supports 1K, 2K, 4K) or gemini-nano-banana-2.1
// -----------------------------------------------------------------------------
app.post('/api/generate-image', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      aspectRatio = '16:9',
      imageSize = '2K',
      model = 'gemini-3-pro-image',
    } = req.body;

    const response = await ai.models.generateContent({
      model: model || 'gemini-3-pro-image',
      contents: {
        parts: [
          {
            text: `High quality 3D render concept art, studio lighting, technical direction reference: ${prompt}`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: imageSize as any,
        },
      },
    });

    let imageUrl = '';
    let textDesc = '';

    const candidate = response.candidates?.[0];
    if (candidate && candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          textDesc += part.text;
        }
      }
    }

    if (!imageUrl) {
      throw new Error('No image was returned by the model.');
    }

    res.json({
      success: true,
      imageUrl,
      textDesc,
      aspectRatio,
      imageSize,
    });
  } catch (err: any) {
    console.error('Error in /api/generate-image:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate image',
    });
  }
});

// -----------------------------------------------------------------------------
// POST /api/generate-video : Video Generation via Interactions API (gemini-omni-1.1-flash)
// -----------------------------------------------------------------------------
app.post('/api/generate-video', async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      aspectRatio = '16:9',
      duration = '5s',
    } = req.body;

    console.log(`Starting video generation with prompt: "${prompt}", aspect: ${aspectRatio}`);

    // Call Interactions API with gemini-omni-1.1-flash
    const interaction: any = await (ai as any).interactions.create(
      {
        model: 'gemini-omni-1.1-flash',
        input: `Cinematic 3D animation reference, smooth camera tracking: ${prompt}`,
        background: false,
        store: false,
        stream: false,
        response_format: {
          type: 'video',
          aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
          duration: duration === '10s' ? '10s' : '5s',
          resolution: '720p',
        },
      },
      { timeout: 300000 }
    );

    const videoPart = interaction.output_video;
    if (videoPart && videoPart.data) {
      const mime = videoPart.mime_type || 'video/mp4';
      const videoUrl = `data:${mime};base64,${videoPart.data}`;
      return res.json({
        success: true,
        videoUrl,
        aspectRatio,
        duration,
      });
    }

    throw new Error('Video generation completed but output video data was not found.');
  } catch (err: any) {
    console.error('Error in /api/generate-video:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to generate video',
    });
  }
});

// -----------------------------------------------------------------------------
// POST /api/analyze-multimodal : Image & Video Understanding via gemini-4-argon
// -----------------------------------------------------------------------------
app.post('/api/analyze-multimodal', async (req: Request, res: Response) => {
  try {
    const {
      mediaType = 'image', // 'image' | 'video'
      base64Data,
      mimeType = 'image/jpeg',
      task = 'reverse_engineer_bpy', // 'reverse_engineer_bpy' | 'lighting_audit' | 'motion_breakdown'
      userNotes = '',
    } = req.body;

    if (!base64Data) {
      return res.status(400).json({ success: false, error: 'base64Data is required' });
    }

    let instruction = `You are an elite 3D Technical Director. Analyze this ${mediaType} in depth.
Deconstruct the scene:
1. Geometry Topology (primitives, mathematical manifolds, bevels, subdivs).
2. Material & Shading Breakdown (metallic, roughness, transmission, subsurface, clearcoat, normal maps).
3. Lighting Rig Analysis (Key, Fill, Rim angles, color temperature, area sizes, shadows).
4. Camera Framing (estimated focal length, sensor width, depth of field, tilt/pan/elevation).
5. Produce complete, headless-safe Blender Python (bpy + bmesh) code to reproduce this scene in Blender!`;

    if (task === 'lighting_audit') {
      instruction = `You are a Master 3D Lighting Artist. Analyze the lighting composition of this ${mediaType}:
- Identify light sources (key, fill, rim, bounce, ambient).
- Estimate wattage/energy, light shapes (area, spot, sun), and Kelvin temperatures.
- Provide a ready-to-run bpy script that configures this exact lighting setup in Blender.`;
    } else if (task === 'motion_breakdown') {
      instruction = `You are a Lead 3D Animator. Analyze the motion, velocity curves, and camera motion in this ${mediaType}:
- Break down keyframe timings, ease-in/ease-out curves, and speed ramp pacing.
- Provide a Python bpy script keyframing camera and target objects to recreate this animation.`;
    }

    const parts: any[] = [
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      {
        text: `${instruction}\n\nAdditional User Context: ${userNotes}`,
      },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-4-argon',
      contents: { parts },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      },
    });

    const analysis = response.text || '';

    // Extract any python code block from the analysis
    const codeMatch = analysis.match(/```python\s*([\s\S]*?)\s*```/i);
    const extractedBpy = codeMatch ? codeMatch[1].trim() : '';

    res.json({
      success: true,
      analysis,
      extractedBpy,
    });
  } catch (err: any) {
    console.error('Error in /api/analyze-multimodal:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Multimodal analysis failed',
    });
  }
});

// -----------------------------------------------------------------------------
// POST /api/validate-bpy : Static linter & headless safety validator for bpy code
// -----------------------------------------------------------------------------
app.post('/api/validate-bpy', (req: Request, res: Response) => {
  const { code = '' } = req.body;
  const issues: Array<{ type: 'error' | 'warning' | 'info'; message: string; line?: number }> = [];

  const lines = code.split('\n');

  let hasBmeshFree = false;
  let hasBmeshNew = false;
  let hasMeshUpdate = false;
  let hasDirectOpsWithoutOverride = false;

  lines.forEach((line: string, idx: number) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    if (trimmed.includes('bmesh.new()')) {
      hasBmeshNew = true;
    }
    if (trimmed.includes('.free()') || trimmed.includes('bm.free()')) {
      hasBmeshFree = true;
    }
    if (trimmed.includes('mesh.update()') || trimmed.includes('.update()')) {
      hasMeshUpdate = true;
    }

    // Checking for unsafe bpy.ops in headless mode
    if (
      trimmed.startsWith('bpy.ops.mesh.primitive_') ||
      trimmed.startsWith('bpy.ops.object.select_all') ||
      trimmed.startsWith('bpy.ops.object.mode_set')
    ) {
      if (!code.includes('temp_override')) {
        hasDirectOpsWithoutOverride = true;
        issues.push({
          type: 'warning',
          message: `Line ${lineNum}: Using '${trimmed}' without 'bpy.context.temp_override' may fail in background headless mode. Direct Data API or bmesh is recommended.`,
          line: lineNum,
        });
      }
    }

    // Checking for obsolete transmission socket
    if (trimmed.includes('["Transmission"].default_value') && !trimmed.includes('Transmission Weight')) {
      issues.push({
        type: 'info',
        message: `Line ${lineNum}: Socket 'Transmission' was replaced with 'Transmission Weight' in Blender 4.0+. Consider cross-version fallback.`,
        line: lineNum,
      });
    }

    // Checking for obsolete clearcoat socket
    if (trimmed.includes('["Clearcoat"].default_value') && !trimmed.includes('Coat Weight')) {
      issues.push({
        type: 'info',
        message: `Line ${lineNum}: Socket 'Clearcoat' was replaced with 'Coat Weight' in Blender 4.0+. Consider cross-version fallback.`,
        line: lineNum,
      });
    }
  });

  if (hasBmeshNew && !hasBmeshFree) {
    issues.push({
      type: 'error',
      message: 'Critical: bmesh.new() detected without corresponding bm.free(). This causes memory leaks in headless batch renders.',
    });
  }

  if (hasBmeshNew && !hasMeshUpdate) {
    issues.push({
      type: 'warning',
      message: 'bmesh.to_mesh() should always be followed by mesh.update() to recalculate normals and bounding boxes.',
    });
  }

  const isSafe = issues.filter((i) => i.type === 'error').length === 0;

  res.json({
    isSafe,
    score: isSafe ? (issues.length === 0 ? 100 : 85) : 40,
    issues,
  });
});

// -----------------------------------------------------------------------------
// Vite Middleware (Dev) or Static Servicing (Prod)
// -----------------------------------------------------------------------------
async function setupVite() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> Blender Agent Core Server listening on port ${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
