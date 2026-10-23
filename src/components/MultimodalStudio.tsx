import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Video,
  Upload,
  Sparkles,
  Download,
  Loader2,
  FileCode,
  Sliders,
  Play,
  Maximize2,
  Check,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface MultimodalStudioProps {
  onInjectBpy: (code: string) => void;
}

export const MultimodalStudio: React.FC<MultimodalStudioProps> = ({ onInjectBpy }) => {
  const [activeTab, setActiveTab] = useState<'image_gen' | 'video_gen' | 'analyze'>('image_gen');

  // --- IMAGE GENERATION STATE ---
  const [imgPrompt, setImgPrompt] = useState(
    'Hyper-realistic commercial studio shot of an iridescent chrome aerodynamic sculpture on a seamless white cyclorama, 3-point softbox studio lighting, 8k render'
  );
  const [imgSize, setImgSize] = useState<'1K' | '2K' | '4K'>('2K');
  const [aspectRatio, setAspectRatio] = useState<
    '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9'
  >('16:9');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);
  const [generatedImgUrl, setGeneratedImgUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);

  // --- VIDEO GENERATION STATE ---
  const [videoPrompt, setVideoPrompt] = useState(
    'Supersonic camera flythrough following a glowing neon cyan aerodynamic ribbon in the dark, RenderJuice motion graphic, smooth 60fps cinematic motion blur'
  );
  const [videoAspect, setVideoAspect] = useState<'16:9' | '9:16'>('16:9');
  const [videoDuration, setVideoDuration] = useState<'5s' | '10s'>('5s');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // --- MULTIMODAL ANALYSIS STATE ---
  const [analyzeTask, setAnalyzeTask] = useState<'reverse_engineer_bpy' | 'lighting_audit' | 'motion_breakdown'>(
    'reverse_engineer_bpy'
  );
  const [uploadedMedia, setUploadedMedia] = useState<{
    type: 'image' | 'video';
    dataUrl: string;
    base64: string;
    mimeType: string;
    fileName: string;
  } | null>(null);
  const [userNotes, setUserNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [extractedBpy, setExtractedBpy] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // 1. GENERATE IMAGE HANDLER
  const handleGenerateImage = async () => {
    if (!imgPrompt.trim()) return;
    setIsGeneratingImg(true);
    setImgError(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imgPrompt,
          aspectRatio,
          imageSize: imgSize,
          model: 'gemini-3-pro-image',
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setGeneratedImgUrl(data.imageUrl);
    } catch (err: any) {
      console.error(err);
      setImgError(err.message || 'Image generation failed');
    } finally {
      setIsGeneratingImg(false);
    }
  };

  // 2. GENERATE VIDEO HANDLER (Interactions API gemini-omni-1.1-flash)
  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) return;
    setIsGeneratingVideo(true);
    setVideoError(null);

    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          aspectRatio: videoAspect,
          duration: videoDuration,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate video');
      }

      setGeneratedVideoUrl(data.videoUrl);
    } catch (err: any) {
      console.error(err);
      setVideoError(err.message || 'Video generation failed');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // 3. FILE UPLOAD HANDLER
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video/');
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result as string;
      const base64 = result.split(',')[1];
      setUploadedMedia({
        type: isVid ? 'video' : 'image',
        dataUrl: result,
        base64,
        mimeType: file.type,
        fileName: file.name,
      });
      setAnalysisResult(null);
      setExtractedBpy(null);
    };

    reader.readAsDataURL(file);
  };

  // 4. ANALYZE MEDIA HANDLER (gemini-4-argon with high thinking)
  const handleAnalyzeMedia = async () => {
    if (!uploadedMedia) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const res = await fetch('/api/analyze-multimodal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaType: uploadedMedia.type,
          base64Data: uploadedMedia.base64,
          mimeType: uploadedMedia.mimeType,
          task: analyzeTask,
          userNotes,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Multimodal analysis failed');
      }

      setAnalysisResult(data.analysis);
      setExtractedBpy(data.extractedBpy);
    } catch (err: any) {
      console.error(err);
      setAnalyzeError(err.message || 'Multimodal analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            Multimodal 3D Reference & Concept Studio
            <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono">
              Gemini Vision & Omni
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Generate high-res concept renders, video pre-vis, or deconstruct visual assets into Blender Python code
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('image_gen')}
            className={`px-3 py-1 text-xs rounded transition flex items-center gap-1.5 font-medium ${
              activeTab === 'image_gen'
                ? 'bg-purple-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Concept Image</span>
          </button>
          <button
            onClick={() => setActiveTab('video_gen')}
            className={`px-3 py-1 text-xs rounded transition flex items-center gap-1.5 font-medium ${
              activeTab === 'video_gen'
                ? 'bg-purple-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video Pre-Vis</span>
          </button>
          <button
            onClick={() => setActiveTab('analyze')}
            className={`px-3 py-1 text-xs rounded transition flex items-center gap-1.5 font-medium ${
              activeTab === 'analyze'
                ? 'bg-purple-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Analyze Image/Video</span>
          </button>
        </div>
      </div>

      {/* TAB 1: IMAGE GENERATION */}
      {activeTab === 'image_gen' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Concept Art & Lighting Reference Prompt
            </label>
            <textarea
              rows={2}
              value={imgPrompt}
              onChange={(e) => setImgPrompt(e.target.value)}
              placeholder="Describe composition, materials, lighting atmosphere, and camera framing..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          {/* Affordances: Image Size (1K, 2K, 4K) & Aspect Ratio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
            {/* Resolution Size Affordance */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">
                Resolution Size Affordance (gemini-3-pro-image)
              </label>
              <div className="flex gap-2">
                {(['1K', '2K', '4K'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setImgSize(sz)}
                    className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded border transition ${
                      imgSize === sz
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {sz} Resolution
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Affordance */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Aspect Ratio Affordance</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
              >
                <option value="16:9">16:9 (Landscape Cinematic)</option>
                <option value="9:16">9:16 (Portrait / Mobile Reels)</option>
                <option value="1:1">1:1 (Square Product Catalog)</option>
                <option value="4:3">4:3 (Classic Television)</option>
                <option value="3:4">3:4 (Portrait Document)</option>
                <option value="3:2">3:2 (35mm Photography)</option>
                <option value="2:3">2:3 (Vertical 35mm)</option>
                <option value="21:9">21:9 (Anamorphic Ultrawide)</option>
              </select>
            </div>
          </div>

          {imgError && (
            <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{imgError}</span>
            </div>
          )}

          <button
            onClick={handleGenerateImage}
            disabled={isGeneratingImg || !imgPrompt.trim()}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition text-xs shadow-md cursor-pointer"
          >
            {isGeneratingImg ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing Studio Quality Concept Render ({imgSize})...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Studio Concept Image ({imgSize} • {aspectRatio})</span>
              </>
            )}
          </button>

          {/* Generated Image Preview */}
          {generatedImgUrl && (
            <div className="mt-2 bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Generated Reference Art</span>
                <div className="flex items-center gap-2">
                  <a
                    href={generatedImgUrl}
                    download="blender_concept_render.png"
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded flex items-center gap-1 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => {
                      // Prompt agent to reverse-engineer
                      setActiveTab('analyze');
                      setUploadedMedia({
                        type: 'image',
                        dataUrl: generatedImgUrl,
                        base64: generatedImgUrl.split(',')[1],
                        mimeType: 'image/png',
                        fileName: 'concept_render.png',
                      });
                    }}
                    className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded flex items-center gap-1 transition"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Reverse-Engineer to bpy</span>
                  </button>
                </div>
              </div>
              <div className="relative rounded-lg overflow-hidden border border-slate-800 max-h-[380px] flex items-center justify-center bg-black">
                <img src={generatedImgUrl} alt="Generated 3D Concept" className="max-h-[380px] object-contain" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VIDEO GENERATION (Interactions API with gemini-omni-1.1-flash) */}
      {activeTab === 'video_gen' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Cinematic Motion & Camera Pre-Vis Prompt
            </label>
            <textarea
              rows={2}
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              placeholder="Describe camera movement trajectory, object velocity, and animation pacing..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Aspect Ratio (Interactions API)</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setVideoAspect('16:9')}
                  className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded border transition ${
                    videoAspect === '16:9'
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  16:9 (Landscape)
                </button>
                <button
                  onClick={() => setVideoAspect('9:16')}
                  className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded border transition ${
                    videoAspect === '9:16'
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  9:16 (Portrait)
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Duration</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setVideoDuration('5s')}
                  className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded border transition ${
                    videoDuration === '5s'
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  5 Seconds
                </button>
                <button
                  onClick={() => setVideoDuration('10s')}
                  className={`flex-1 py-1.5 text-xs font-mono font-semibold rounded border transition ${
                    videoDuration === '10s'
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  10 Seconds
                </button>
              </div>
            </div>
          </div>

          {videoError && (
            <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{videoError}</span>
            </div>
          )}

          <button
            onClick={handleGenerateVideo}
            disabled={isGeneratingVideo || !videoPrompt.trim()}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition text-xs shadow-md cursor-pointer"
          >
            {isGeneratingVideo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Motion Pre-Vis with gemini-omni-1.1-flash...</span>
              </>
            ) : (
              <>
                <Video className="w-4 h-4" />
                <span>Generate Video Pre-Vis ({videoAspect} • {videoDuration})</span>
              </>
            )}
          </button>

          {/* Video Player */}
          {generatedVideoUrl && (
            <div className="mt-2 bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Generated Video Pre-Vis</span>
                <a
                  href={generatedVideoUrl}
                  download="previs_motion.mp4"
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded flex items-center gap-1 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP4</span>
                </a>
              </div>
              <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-black flex items-center justify-center max-h-[380px]">
                <video src={generatedVideoUrl} controls autoPlay loop className="max-h-[380px] w-auto" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MULTIMODAL IMAGE & VIDEO UNDERSTANDING */}
      {activeTab === 'analyze' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload Area */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300">
                Upload Render, Reference Photo or Motion Video
              </label>
              <label className="border-2 border-dashed border-slate-700 hover:border-purple-500 bg-slate-950/60 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition">
                <Upload className="w-6 h-6 text-purple-400" />
                <span className="text-xs text-slate-300 font-medium">Click to select image or video file</span>
                <span className="text-[10px] text-slate-500">Supports PNG, JPG, WEBP, MP4, WEBM</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {uploadedMedia && (
                <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-300">
                  <span className="truncate max-w-[220px]">{uploadedMedia.fileName}</span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded uppercase font-mono">
                    {uploadedMedia.type}
                  </span>
                </div>
              )}
            </div>

            {/* Task Configuration */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-300">Analysis Objective</label>
                <select
                  value={analyzeTask}
                  onChange={(e) => setAnalyzeTask(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="reverse_engineer_bpy">Reverse-Engineer to Blender Python (bpy)</option>
                  <option value="lighting_audit">Studio Lighting Breakdown & Color Rig</option>
                  <option value="motion_breakdown">Motion Trajectory & Keyframe Timing</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-300">Additional Context / Instructions</label>
                <textarea
                  rows={3}
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="e.g. Focus on recreating the curved metallic surface and rim lighting in Blender 4.2 Cycles..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 resize-none font-mono"
                />
              </div>

              <button
                onClick={handleAnalyzeMedia}
                disabled={isAnalyzing || !uploadedMedia}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition text-xs shadow-md cursor-pointer mt-auto"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing with Gemini 4 Argon (High Thinking)...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Run Deep 3D Scene Deconstruction</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {analyzeError && (
            <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{analyzeError}</span>
            </div>
          )}

          {/* Analysis Results Display */}
          {analysisResult && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Gemini 4 Argon Technical Director Scene Deconstruction
                </span>

                {extractedBpy && (
                  <button
                    onClick={() => {
                      onInjectBpy(extractedBpy);
                    }}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-3 py-1 rounded text-xs flex items-center gap-1 transition"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Inject Extracted bpy to Editor</span>
                  </button>
                )}
              </div>

              <div className="max-h-[340px] overflow-y-auto text-xs text-slate-300 whitespace-pre-wrap leading-relaxed pr-2 font-mono">
                {analysisResult}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
