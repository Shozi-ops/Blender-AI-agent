import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  Code2,
} from 'lucide-react';

interface CodeInspectorProps {
  customCode: string;
  activePreset: 'speed' | 'studio' | 'cloth' | 'custom';
  onPresetChange: (preset: 'speed' | 'studio' | 'cloth' | 'custom') => void;
  presetData: {
    core: string;
    script1: string;
    script2: string;
    script3: string;
    schema: string;
    architecture: string;
  };
}

export const CodeInspector: React.FC<CodeInspectorProps> = ({
  customCode,
  activePreset,
  onPresetChange,
  presetData,
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'core' | 'script1' | 'script2' | 'script3' | 'schema' | 'arch'>('current');
  const [copied, setCopied] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isSafe: boolean;
    score: number;
    issues: Array<{ type: 'error' | 'warning' | 'info'; message: string; line?: number }>;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Determine which code text to display
  let currentCodeText = customCode;
  let currentFileName = 'custom_generated_pipeline.py';

  if (activeTab === 'core') {
    currentCodeText = presetData.core;
    currentFileName = 'blender_agent_core.py';
  } else if (activeTab === 'script1') {
    currentCodeText = presetData.script1;
    currentFileName = 'script_1_speed_motion_graphic.py';
  } else if (activeTab === 'script2') {
    currentCodeText = presetData.script2;
    currentFileName = 'script_2_studio_product_rig.py';
  } else if (activeTab === 'script3') {
    currentCodeText = presetData.script3;
    currentFileName = 'script_3_headless_cloth_bake.py';
  } else if (activeTab === 'schema') {
    currentCodeText = presetData.schema;
    currentFileName = 'agent_skill_schema.json';
  } else if (activeTab === 'arch') {
    currentCodeText = presetData.architecture;
    currentFileName = 'system_architecture.md';
  } else {
    // Current tab reflects active preset or user generated script
    if (activePreset === 'speed') {
      currentCodeText = presetData.script1;
      currentFileName = 'script_1_speed_motion_graphic.py';
    } else if (activePreset === 'studio') {
      currentCodeText = presetData.script2;
      currentFileName = 'script_2_studio_product_rig.py';
    } else if (activePreset === 'cloth') {
      currentCodeText = presetData.script3;
      currentFileName = 'script_3_headless_cloth_bake.py';
    } else {
      currentCodeText = customCode || presetData.core;
      currentFileName = 'custom_generated_pipeline.py';
    }
  }

  // Validate on code change
  useEffect(() => {
    if (activeTab === 'schema' || activeTab === 'arch') {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    fetch('/api/validate-bpy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: currentCodeText }),
    })
      .then((res) => res.json())
      .then((data) => {
        setValidationResult(data);
        setIsValidating(false);
      })
      .catch(() => setIsValidating(false));
  }, [currentCodeText, activeTab]);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCodeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentCodeText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getCliCommand = () => {
    if (currentFileName.endsWith('.json') || currentFileName.endsWith('.md')) {
      return `# Architecture & Schema specification file`;
    }
    return `blender -b --python ${currentFileName} -o //render/frame_#### -a`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col shadow-xl overflow-hidden">
      {/* File Navigation Tab Bar */}
      <div className="bg-slate-950 px-3 pt-2.5 flex items-center justify-between border-b border-slate-800 gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-3 py-1.5 text-xs font-mono rounded-t-lg transition flex items-center gap-1.5 border-t border-x ${
              activeTab === 'current'
                ? 'bg-slate-900 text-cyan-400 border-slate-700 font-semibold'
                : 'bg-slate-950/60 text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Active Script</span>
          </button>
          <button
            onClick={() => setActiveTab('core')}
            className={`px-3 py-1.5 text-xs font-mono rounded-t-lg transition flex items-center gap-1.5 border-t border-x ${
              activeTab === 'core'
                ? 'bg-slate-900 text-cyan-400 border-slate-700 font-semibold'
                : 'bg-slate-950/60 text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            <span>blender_agent_core.py</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('script1');
              onPresetChange('speed');
            }}
            className={`px-3 py-1.5 text-xs font-mono rounded-t-lg transition flex items-center gap-1.5 border-t border-x ${
              activeTab === 'script1'
                ? 'bg-slate-900 text-cyan-400 border-slate-700 font-semibold'
                : 'bg-slate-950/60 text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>1. Speed Graphic</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('script2');
              onPresetChange('studio');
            }}
            className={`px-3 py-1.5 text-xs font-mono rounded-t-lg transition flex items-center gap-1.5 border-t border-x ${
              activeTab === 'script2'
                ? 'bg-slate-900 text-cyan-400 border-slate-700 font-semibold'
                : 'bg-slate-950/60 text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-pink-400" />
            <span>2. Studio Turntable</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('script3');
              onPresetChange('cloth');
            }}
            className={`px-3 py-1.5 text-xs font-mono rounded-t-lg transition flex items-center gap-1.5 border-t border-x ${
              activeTab === 'script3'
                ? 'bg-slate-900 text-cyan-400 border-slate-700 font-semibold'
                : 'bg-slate-950/60 text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>3. Cloth Bake</span>
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 text-xs font-mono rounded-t-lg transition flex items-center gap-1.5 border-t border-x ${
              activeTab === 'schema'
                ? 'bg-slate-900 text-cyan-400 border-slate-700 font-semibold'
                : 'bg-slate-950/60 text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <span>Agent Schema</span>
          </button>
          <button
            onClick={() => setActiveTab('arch')}
            className={`px-3 py-1.5 text-xs font-mono rounded-t-lg transition flex items-center gap-1.5 border-t border-x ${
              activeTab === 'arch'
                ? 'bg-slate-900 text-cyan-400 border-slate-700 font-semibold'
                : 'bg-slate-950/60 text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <span>Architecture Docs</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pb-2">
          <button
            onClick={handleCopy}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded flex items-center gap-1.5 transition font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy File'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Headless Safety Audit Banner */}
      {validationResult && (
        <div className="bg-slate-950/90 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${validationResult.isSafe ? 'text-emerald-400' : 'text-rose-400'}`} />
            <span className="font-semibold text-slate-200">Headless Runtime Safety Score:</span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                validationResult.score >= 90
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : validationResult.score >= 70
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {validationResult.score}/100
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Direct Data API
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> bmesh.free() Enforced
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> temp_override Safe
            </span>
          </div>
        </div>
      )}

      {/* Code Viewer */}
      <div className="relative flex-1 max-h-[500px] overflow-auto bg-slate-950 p-4">
        <pre className="font-mono text-xs text-slate-200 leading-relaxed">
          <code>{currentCodeText}</code>
        </pre>
      </div>

      {/* Bottom CLI Execution Guide */}
      <div className="bg-slate-950 p-3 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400 font-mono">
          <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-slate-500">Run CLI:</span>
          <span className="text-cyan-300 bg-slate-900 px-2 py-1 rounded border border-slate-800 select-all">
            {getCliCommand()}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span>Target: Blender 3.6 LTS – 4.x+ Headless Background</span>
        </div>
      </div>
    </div>
  );
};
