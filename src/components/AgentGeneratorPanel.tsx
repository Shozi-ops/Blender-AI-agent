import React, { useState } from 'react';
import { Sparkles, Terminal, Sliders, Cpu, Play, Loader2, CheckCircle2, AlertCircle, Wand2 } from 'lucide-react';

interface AgentGeneratorPanelProps {
  onCodeGenerated: (code: string, meta: any) => void;
  onPresetSelected: (preset: 'speed' | 'studio' | 'cloth') => void;
  activePreset: 'speed' | 'studio' | 'cloth' | 'custom';
}

export const AgentGeneratorPanel: React.FC<AgentGeneratorPanelProps> = ({
  onCodeGenerated,
  onPresetSelected,
  activePreset,
}) => {
  const [prompt, setPrompt] = useState(
    'Create an aerodynamic, high-velocity motion graphic ribbon with emissive neon cyan plasma trails, a spinning metallic core, and high-speed camera motion blur for the RenderJuice Speed competition.'
  );
  const [blenderVersion, setBlenderVersion] = useState('4.2_LTS');
  const [engine, setEngine] = useState('CYCLES');
  const [samples, setSamples] = useState(128);
  const [resolution, setResolution] = useState<'1080p' | '4K' | 'square' | 'vertical'>('1080p');
  const [frames, setFrames] = useState(120);
  const [fps, setFps] = useState(24);
  const [model, setModel] = useState<'gemini-4-argon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite'>('gemini-4-argon');
  const [useThinking, setUseThinking] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const quickPrompts = [
    {
      title: 'RenderJuice "Speed" Ribbon',
      text: 'Procedural aerodynamic twisting ribbon with neon cyber trails, supersonic shockwave rings, and high-speed flythrough camera.',
      preset: 'speed',
    },
    {
      title: 'Studio Product Turntable',
      text: 'Commercial luxury rose gold product rig with seamless curved cyclorama backdrop, 3-point softboxes, and 360 turntable camera.',
      preset: 'studio',
    },
    {
      title: 'Headless Silk Cloth Drape',
      text: 'Procedural mannequin avatar collider with high-density cloth simulation sheet, settling folds at frame 45, and studio spotlight.',
      preset: 'cloth',
    },
    {
      title: 'Sci-Fi Hex Kinetic Grid',
      text: 'Procedural honeycomb hexagon displacement matrix with wave modifier and emissive edge pulse.',
      preset: null,
    },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setErrorMsg(null);
    setGenerationStep('Deconstructing 3D intent into Direct Data API pipeline...');

    try {
      const resDims: Record<string, [number, number]> = {
        '1080p': [1920, 1080],
        '4K': [3840, 2160],
        square: [1080, 1080],
        vertical: [1080, 1920],
      };

      setGenerationStep('Synthesizing headless-safe bpy + bmesh logic with Gemini...');

      const response = await fetch('/api/generate-bpy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          blenderVersion,
          engine,
          samples,
          resolution: resDims[resolution] || [1920, 1080],
          frames,
          fps,
          model,
          useThinking: model === 'gemini-4-argon' ? useThinking : false,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate Blender script');
      }

      setGenerationStep('Verifying Direct Data API integrity & bmesh memory bounds...');
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationStep(null);
        onCodeGenerated(data.code, {
          prompt,
          blenderVersion,
          engine,
          model,
        });
      }, 500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Generation failed. Please try again.');
      setIsGenerating(false);
      setGenerationStep(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              Autonomous Script Engine
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono">
                bpy + bmesh
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Translate natural language into headless, zero-context Blender automation scripts
            </p>
          </div>
        </div>

        {/* Preset Quick Switches */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => onPresetSelected('speed')}
            className={`px-2.5 py-1 text-xs rounded transition font-medium ${
              activePreset === 'speed'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Speed Graphic
          </button>
          <button
            onClick={() => onPresetSelected('studio')}
            className={`px-2.5 py-1 text-xs rounded transition font-medium ${
              activePreset === 'studio'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Studio Turntable
          </button>
          <button
            onClick={() => onPresetSelected('cloth')}
            className={`px-2.5 py-1 text-xs rounded transition font-medium ${
              activePreset === 'cloth'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cloth Bake
          </button>
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPrompt(qp.text);
              if (qp.preset) onPresetSelected(qp.preset as any);
            }}
            className="text-xs bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg transition text-left flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{qp.title}</span>
          </button>
        ))}
      </div>

      {/* Natural Language Prompt Input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Task Prompt / Technical Brief</span>
          <span className="text-[11px] text-slate-500 font-normal">Natural Language or Parametric Spec</span>
        </label>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe procedural geometry, shader materials, lighting rigs, camera motion, and render settings..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none font-mono"
        />
      </div>

      {/* Parameter Controls Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
        {/* Blender Target Version */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-slate-400">Target Blender Version</label>
          <select
            value={blenderVersion}
            onChange={(e) => setBlenderVersion(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="4.2_LTS">Blender 4.2 LTS</option>
            <option value="4.1">Blender 4.1</option>
            <option value="4.0">Blender 4.0</option>
            <option value="3.6_LTS">Blender 3.6 LTS</option>
          </select>
        </div>

        {/* Render Engine */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-slate-400">Render Engine</label>
          <select
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="CYCLES">Cycles (Raytracing)</option>
            <option value="BLENDER_EEVEE_NEXT">EEVEE Next (Real-Time)</option>
          </select>
        </div>

        {/* Resolution */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-slate-400">Output Resolution</label>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value as any)}
            className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="1080p">1920x1080 (1080p 16:9)</option>
            <option value="4K">3840x2160 (4K UHD)</option>
            <option value="square">1080x1080 (1:1 Square)</option>
            <option value="vertical">1080x1920 (9:16 Reels)</option>
          </select>
        </div>

        {/* Samples */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-slate-400">Cycles Samples: {samples}</label>
          <input
            type="range"
            min={32}
            max={512}
            step={32}
            value={samples}
            onChange={(e) => setSamples(parseInt(e.target.value, 10))}
            className="accent-cyan-400 h-1.5 mt-2 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Model & Thinking Mode Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 px-3.5 py-2.5 rounded-lg border border-slate-800/80 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            AI Intelligence Model:
          </span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="gemini-4-argon">gemini-4-argon (Flagship TD Reasoning)</option>
            <option value="gemini-3.8-flash">gemini-3.8-flash (General Pipeline)</option>
            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra Fast)</option>
          </select>
        </div>

        {model === 'gemini-4-argon' && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useThinking}
              onChange={(e) => setUseThinking(e.target.checked)}
              className="accent-cyan-400 w-3.5 h-3.5 rounded"
            />
            <span className="text-cyan-400 font-medium">Enable High Thinking Mode</span>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-1.5 py-0.2 rounded font-mono">
              Deep TD Reasoning
            </span>
          </label>
        )}
      </div>

      {/* Error Display */}
      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            <span>{generationStep || 'Synthesizing Headless Blender Script...'}</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Generate Autonomous bpy Script</span>
          </>
        )}
      </button>
    </div>
  );
};
