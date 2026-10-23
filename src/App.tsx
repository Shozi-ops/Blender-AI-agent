/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  Download,
  Code2,
  MessageSquare,
  Image as ImageIcon,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { ThreeViewport } from './components/ThreeViewport';
import { AgentGeneratorPanel } from './components/AgentGeneratorPanel';
import { ChatbotPanel } from './components/ChatbotPanel';
import { MultimodalStudio } from './components/MultimodalStudio';
import { CodeInspector } from './components/CodeInspector';

export default function App() {
  const [activePreset, setActivePreset] = useState<'speed' | 'studio' | 'cloth' | 'custom'>('speed');
  const [activeTab, setActiveTab] = useState<'inspector' | 'chat' | 'multimodal' | 'docs'>('inspector');
  const [customCode, setCustomCode] = useState<string>('');
  const [presetData, setPresetData] = useState<{
    core: string;
    script1: string;
    script2: string;
    script3: string;
    schema: string;
    architecture: string;
  }>({
    core: '',
    script1: '',
    script2: '',
    script3: '',
    schema: '',
    architecture: '',
  });

  // Fetch preset files from server on mount
  useEffect(() => {
    fetch('/api/presets')
      .then((res) => res.json())
      .then((data) => {
        setPresetData(data);
        if (data.script1) {
          setCustomCode(data.script1);
        }
      })
      .catch((err) => console.error('Error fetching presets:', err));
  }, []);

  const handleCodeGenerated = (code: string, meta: any) => {
    setCustomCode(code);
    setActivePreset('custom');
    setActiveTab('inspector');
  };

  const handlePresetSelected = (preset: 'speed' | 'studio' | 'cloth') => {
    setActivePreset(preset);
    if (preset === 'speed') setCustomCode(presetData.script1);
    else if (preset === 'studio') setCustomCode(presetData.script2);
    else if (preset === 'cloth') setCustomCode(presetData.script3);
  };

  const handleDownloadAll = () => {
    // Download zip or individual core scripts
    const files = [
      { name: 'blender_agent_core.py', content: presetData.core },
      { name: 'script_1_speed_motion_graphic.py', content: presetData.script1 },
      { name: 'script_2_studio_product_rig.py', content: presetData.script2 },
      { name: 'script_3_headless_cloth_bake.py', content: presetData.script3 },
      { name: 'agent_skill_schema.json', content: presetData.schema },
      { name: 'system_architecture.md', content: presetData.architecture },
    ];

    files.forEach((file, index) => {
      setTimeout(() => {
        const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
      }, index * 200);
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Studio Navbar */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
              <Box className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-bold text-slate-100 tracking-tight">
                  Blender Agentic AI Skill System
                </h1>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono font-semibold">
                  v4.2 LTS Core
                </span>
                <span className="hidden sm:inline-block text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                  Headless Safe
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Autonomous 3D Technical Director & Pure Programmatic bpy / bmesh Engine
              </p>
            </div>
          </div>

          {/* Preset Buttons & Action Hub */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-500 px-2 text-[11px] font-mono">Presets:</span>
              <button
                onClick={() => handlePresetSelected('speed')}
                className={`px-2.5 py-1 rounded transition ${
                  activePreset === 'speed' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Speed Graphic
              </button>
              <button
                onClick={() => handlePresetSelected('studio')}
                className={`px-2.5 py-1 rounded transition ${
                  activePreset === 'studio' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                2. Studio Rig
              </button>
              <button
                onClick={() => handlePresetSelected('cloth')}
                className={`px-2.5 py-1 rounded transition ${
                  activePreset === 'cloth' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                3. Cloth Bake
              </button>
            </div>

            <button
              onClick={handleDownloadAll}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Download blender_agent_core.py and all 3 runnable scripts"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download Toolkit (.py)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex flex-col gap-6">
        {/* Top 3D Viewport Simulation & Pre-Vis Section */}
        <section className="flex flex-col gap-2">
          <ThreeViewport activePreset={activePreset} />
        </section>

        {/* Studio Workspace Tabs & Panels */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Autonomous Prompt & Parameter Generator */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <AgentGeneratorPanel
              onCodeGenerated={handleCodeGenerated}
              onPresetSelected={handlePresetSelected}
              activePreset={activePreset}
            />

            {/* Quick Technical Directives & Best Practices Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Headless Execution Constitution</span>
              </div>
              <ul className="space-y-1.5 text-[11px] font-mono">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-300">Direct Data API:</strong> Prefer `bpy.data.objects`, `bpy.data.meshes` and `bmesh` over `bpy.ops`.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-300">Context Overrides:</strong> Use `bpy.context.temp_override` for headless baking and modifier operations.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-300">Memory Integrity:</strong> Strict `try...finally: bm.free()` on all procedural manifolds.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-300">Version Alignment:</strong> Automatic normalization for Blender 3.6 LTS through 4.2+ BSDF sockets.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Tabbed Workstation (Code Inspector, TD Chatbot, Multimodal Studio, System Architecture) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {/* Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('inspector')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
                    activeTab === 'inspector'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Code Inspector & CLI</span>
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
                    activeTab === 'chat'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Gemini TD Chatbot</span>
                </button>
                <button
                  onClick={() => setActiveTab('multimodal')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
                    activeTab === 'multimodal'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Multimodal & Pre-Vis</span>
                </button>
                <button
                  onClick={() => setActiveTab('docs')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-2 ${
                    activeTab === 'docs'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Architecture Docs</span>
                </button>
              </div>
            </div>

            {/* Tab Views */}
            {activeTab === 'inspector' && (
              <CodeInspector
                customCode={customCode}
                activePreset={activePreset}
                onPresetChange={(preset) => {
                  if (preset !== 'custom') handlePresetSelected(preset as any);
                }}
                presetData={presetData}
              />
            )}

            {activeTab === 'chat' && (
              <ChatbotPanel
                onInjectCodeToEditor={(code) => {
                  setCustomCode(code);
                  setActivePreset('custom');
                  setActiveTab('inspector');
                }}
              />
            )}

            {activeTab === 'multimodal' && (
              <MultimodalStudio
                onInjectBpy={(code) => {
                  setCustomCode(code);
                  setActivePreset('custom');
                  setActiveTab('inspector');
                }}
              />
            )}

            {activeTab === 'docs' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4 text-xs leading-relaxed max-h-[640px] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Agent Architecture & Headless CLI Manual
                  </h3>
                  <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded font-mono">
                    blender_agent_core.py Reference
                  </span>
                </div>
                <div className="prose prose-invert max-w-none text-slate-300 space-y-4 font-mono text-[11px]">
                  <pre className="p-3 bg-slate-950 rounded-lg text-slate-300 overflow-x-auto whitespace-pre-wrap">
                    {presetData.architecture || 'Loading architecture documentation...'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-4 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Autonomous Blender Python Engine & Agent Skill Architect • Powered by Gemini 4 Argon & Gemini Omni Flash
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Headless Background: <code className="text-cyan-400 font-bold">blender -b -P script.py -a</code>
          </span>
        </div>
      </footer>
    </div>
  );
}
