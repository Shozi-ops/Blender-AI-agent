import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Pause, RotateCcw, Box, Eye, Sun, Grid, Layers } from 'lucide-react';

interface ThreeViewportProps {
  activePreset: 'speed' | 'studio' | 'cloth' | 'custom';
  customTitle?: string;
}

export const ThreeViewport: React.FC<ThreeViewportProps> = ({
  activePreset,
  customTitle = 'Custom Procedural Scene',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [shadingMode, setShadingMode] = useState<'rendered' | 'solid' | 'wireframe'>('rendered');
  const [showGrid, setShowGrid] = useState(true);
  const [stats, setStats] = useState({ verts: 0, faces: 0, fps: 60 });

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const dynamicGroupRef = useRef<THREE.Group | null>(null);
  const animFrameId = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Track turntable mouse rotation
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const orbitRef = useRef({ theta: 0.5, phi: 0.4, radius: 8.5 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 420;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0f17);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Grid Helper
    const grid = new THREE.GridHelper(20, 20, 0x06b6d4, 0x1e293b);
    grid.position.y = -0.01;
    grid.name = 'gridHelper';
    scene.add(grid);

    // 5. Dynamic group for active preset
    const dynamicGroup = new THREE.Group();
    dynamicGroupRef.current = dynamicGroup;
    scene.add(dynamicGroup);

    // 6. Mouse orbit controls
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      orbitRef.current.theta -= dx * 0.008;
      orbitRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, orbitRef.current.phi + dy * 0.008));
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitRef.current.radius = Math.max(3.0, Math.min(25.0, orbitRef.current.radius + e.deltaY * 0.01));
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // 7. Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight || 420;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update Grid visibility
  useEffect(() => {
    if (!sceneRef.current) return;
    const grid = sceneRef.current.getObjectByName('gridHelper');
    if (grid) grid.visible = showGrid;
  }, [showGrid]);

  // Rebuild 3D Preset Scene
  useEffect(() => {
    const dynamicGroup = dynamicGroupRef.current;
    const scene = sceneRef.current;
    if (!dynamicGroup || !scene) return;

    // Clear previous objects
    while (dynamicGroup.children.length > 0) {
      const obj = dynamicGroup.children[0] as any;
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
        else obj.material.dispose();
      }
      dynamicGroup.remove(obj);
    }

    // Remove old lights in scene
    const lightsToRemove = scene.children.filter((c) => c instanceof THREE.Light);
    lightsToRemove.forEach((l) => scene.remove(l));

    let totalVerts = 0;
    let totalFaces = 0;

    const isWire = shadingMode === 'wireframe';
    const isSolid = shadingMode === 'solid';

    if (activePreset === 'speed') {
      // -------------------------------------------------------------
      // PRESET 1: "SPEED" PROCEDURAL MOTION GRAPHIC
      // -------------------------------------------------------------
      // 1. Ambient & Rim lights
      const amb = new THREE.AmbientLight(0x0a1128, 1.2);
      scene.add(amb);

      const spot = new THREE.SpotLight(0x06b6d4, 80, 25, Math.PI / 4, 0.4);
      spot.position.set(0, 8, 4);
      scene.add(spot);

      const rim = new THREE.PointLight(0xf43f5e, 50, 20);
      rim.position.set(-5, 3, -4);
      scene.add(rim);

      // Core: Torus Knot
      const knotGeo = new THREE.TorusKnotGeometry(1.6, 0.28, 160, 24, 3, 7);
      const knotMat = new THREE.MeshStandardMaterial({
        color: isSolid ? 0x94a3b8 : 0x0f172a,
        metalness: isSolid ? 0.2 : 0.95,
        roughness: isSolid ? 0.5 : 0.12,
        wireframe: isWire,
      });
      const knotMesh = new THREE.Mesh(knotGeo, knotMat);
      knotMesh.name = 'speedCore';
      knotMesh.position.y = 2.2;
      dynamicGroup.add(knotMesh);

      // Ribbon: Kinetic Expanding Spiral
      const curvePts: THREE.Vector3[] = [];
      const numPts = 120;
      for (let i = 0; i < numPts; i++) {
        const u = i / (numPts - 1);
        const angle = u * Math.PI * 6;
        const rad = 1.0 + u * 3.5;
        const y = (u - 0.5) * 4.5;
        curvePts.push(new THREE.Vector3(rad * Math.cos(angle), y + 2.2, rad * Math.sin(angle)));
      }
      const curve = new THREE.CatmullRomCurve3(curvePts);
      const ribbonGeo = new THREE.TubeGeometry(curve, 100, 0.12, 8, false);
      const ribbonMat = new THREE.MeshBasicMaterial({
        color: isSolid ? 0x38bdf8 : 0x06b6d4,
        wireframe: isWire,
      });
      const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
      ribbonMesh.name = 'speedRibbon';
      dynamicGroup.add(ribbonMesh);

      totalVerts = knotGeo.attributes.position.count + ribbonGeo.attributes.position.count;
      totalFaces = (knotGeo.index ? knotGeo.index.count / 3 : 0) + (ribbonGeo.index ? ribbonGeo.index.count / 3 : 0);
    } else if (activePreset === 'studio') {
      // -------------------------------------------------------------
      // PRESET 2: AUTOMATED STUDIO PRODUCT RIG
      // -------------------------------------------------------------
      // Studio 3-point lights
      const keyLight = new THREE.RectAreaLight(0xfff7ed, 45, 4, 3);
      keyLight.position.set(4, 4.5, 3.5);
      keyLight.lookAt(0, 1.2, 0);
      scene.add(keyLight);

      const fillLight = new THREE.RectAreaLight(0xe0f2fe, 18, 4, 3);
      fillLight.position.set(-4, 3, 2);
      fillLight.lookAt(0, 1.2, 0);
      scene.add(fillLight);

      const rimLight = new THREE.SpotLight(0xffffff, 40, 20, Math.PI / 6, 0.5);
      rimLight.position.set(0, 5, -4);
      rimLight.lookAt(0, 1, 0);
      scene.add(rimLight);

      const amb = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(amb);

      // Seamless Studio Cyclorama Backdrop
      const cycGeo = new THREE.PlaneGeometry(16, 12, 32, 32);
      // Curve up along back
      const pos = cycGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getY(i);
        if (z < -1.5) {
          const bend = Math.pow((-z - 1.5) / 4.5, 2) * 5.0;
          pos.setZ(i, bend);
        }
      }
      cycGeo.computeVertexNormals();
      cycGeo.rotateX(-Math.PI / 2);

      const cycMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        roughness: 0.85,
        wireframe: isWire,
      });
      const cycMesh = new THREE.Mesh(cycGeo, cycMat);
      cycMesh.position.set(0, 0, 0);
      dynamicGroup.add(cycMesh);

      // Hero Product: Luxury Industrial Chamfered Cylinder & Ring
      const prodGeo = new THREE.CylinderGeometry(1.0, 1.0, 2.2, 48);
      const prodMat = new THREE.MeshStandardMaterial({
        color: isSolid ? 0xcbd5e1 : 0xfbcfe8,
        metalness: isSolid ? 0.3 : 0.94,
        roughness: isSolid ? 0.5 : 0.18,
        wireframe: isWire,
      });
      const prodMesh = new THREE.Mesh(prodGeo, prodMat);
      prodMesh.position.y = 1.1;
      prodMesh.name = 'heroProduct';
      dynamicGroup.add(prodMesh);

      // Accent Gold Ring on Top
      const ringGeo = new THREE.TorusGeometry(0.85, 0.08, 16, 48);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.95,
        roughness: 0.15,
        wireframe: isWire,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotateX(Math.PI / 2);
      ringMesh.position.y = 2.22;
      dynamicGroup.add(ringMesh);

      totalVerts = cycGeo.attributes.position.count + prodGeo.attributes.position.count;
      totalFaces = Math.round(totalVerts / 2);
    } else if (activePreset === 'cloth') {
      // -------------------------------------------------------------
      // PRESET 3: HEADLESS GARMENT / CLOTH RIG
      // -------------------------------------------------------------
      const topLight = new THREE.SpotLight(0xffedd5, 70, 20, Math.PI / 5, 0.3);
      topLight.position.set(0, 6, 2);
      scene.add(topLight);

      const fillLight = new THREE.PointLight(0x38bdf8, 25, 15);
      fillLight.position.set(-3, 2, 3);
      scene.add(fillLight);

      const amb = new THREE.AmbientLight(0x1e293b, 1.0);
      scene.add(amb);

      // Mannequin Avatar Collider
      const avBaseGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 32);
      const avTorsoGeo = new THREE.ConeGeometry(0.65, 1.8, 32);
      const avHeadGeo = new THREE.SphereGeometry(0.5, 32, 24);

      const avMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4,
        wireframe: isWire,
      });
      const avBase = new THREE.Mesh(avBaseGeo, avMat);
      avBase.position.y = 0.15;
      dynamicGroup.add(avBase);

      const avTorso = new THREE.Mesh(avTorsoGeo, avMat);
      avTorso.position.y = 1.2;
      dynamicGroup.add(avTorso);

      const avHead = new THREE.Mesh(avHeadGeo, avMat);
      avHead.position.y = 2.2;
      dynamicGroup.add(avHead);

      // Draped Garment Cloth Sheet
      const clothGeo = new THREE.PlaneGeometry(2.4, 2.4, 36, 36);
      const cPos = clothGeo.attributes.position;
      // Procedural draped wave deformations simulating gravity & collision
      for (let i = 0; i < cPos.count; i++) {
        const x = cPos.getX(i);
        const y = cPos.getY(i);
        const dist = Math.sqrt(x * x + y * y);
        const drape = -Math.pow(dist, 1.8) * 0.9 + Math.sin(x * 5) * 0.08 * dist;
        cPos.setZ(i, drape);
      }
      clothGeo.computeVertexNormals();
      clothGeo.rotateX(-Math.PI / 2);

      const clothMat = new THREE.MeshStandardMaterial({
        color: isSolid ? 0x059669 : 0x065f46, // Emerald Silk
        roughness: isSolid ? 0.6 : 0.3,
        metalness: isSolid ? 0.1 : 0.2,
        side: THREE.DoubleSide,
        wireframe: isWire,
      });
      const clothMesh = new THREE.Mesh(clothGeo, clothMat);
      clothMesh.name = 'drapedCloth';
      dynamicGroup.add(clothMesh);

      totalVerts = clothGeo.attributes.position.count + avTorsoGeo.attributes.position.count;
      totalFaces = Math.round(totalVerts / 1.8);
    } else {
      // -------------------------------------------------------------
      // CUSTOM PROCEDURAL SCENE (DEFAULT / USER SCRIPT)
      // -------------------------------------------------------------
      const amb = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(amb);
      const dir = new THREE.DirectionalLight(0x06b6d4, 30);
      dir.position.set(4, 6, 4);
      scene.add(dir);

      const customGeo = new THREE.IcosahedronGeometry(1.8, 3);
      const customMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: isWire,
      });
      const customMesh = new THREE.Mesh(customGeo, customMat);
      customMesh.position.y = 2.0;
      customMesh.name = 'customObject';
      dynamicGroup.add(customMesh);

      totalVerts = customGeo.attributes.position.count;
      totalFaces = customGeo.index ? customGeo.index.count / 3 : 0;
    }

    setStats({
      verts: totalVerts,
      faces: Math.round(totalFaces),
      fps: 60,
    });
  }, [activePreset, shadingMode]);

  // Main Render & Animation Loop
  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTime = lastTime;

    const animate = (time: number) => {
      animFrameId.current = requestAnimationFrame(animate);

      // FPS tracking
      frameCount++;
      if (time - fpsTime >= 1000) {
        setStats((prev) => ({ ...prev, fps: frameCount }));
        frameCount = 0;
        fpsTime = time;
      }

      // Turntable animation
      if (isPlayingRef.current && !isDraggingRef.current) {
        orbitRef.current.theta += 0.007;
      }

      // Procedural mesh movement
      const group = dynamicGroupRef.current;
      if (group) {
        const speedCore = group.getObjectByName('speedCore');
        const speedRibbon = group.getObjectByName('speedRibbon');
        if (speedCore && isPlayingRef.current) {
          speedCore.rotation.y += 0.02;
          speedCore.rotation.x = Math.sin(time * 0.001) * 0.2;
        }
        if (speedRibbon && isPlayingRef.current) {
          speedRibbon.rotation.y -= 0.015;
        }

        const heroProd = group.getObjectByName('heroProduct');
        if (heroProd && isPlayingRef.current && activePreset === 'studio') {
          heroProd.rotation.y += 0.008;
        }

        const drapedCloth = group.getObjectByName('drapedCloth');
        if (drapedCloth && isPlayingRef.current && activePreset === 'cloth') {
          drapedCloth.rotation.y += 0.005;
        }
      }

      // Position camera using spherical coordinates
      const cam = cameraRef.current;
      const { theta, phi, radius } = orbitRef.current;
      if (cam) {
        const x = radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi) + 1.2;
        const z = radius * Math.sin(phi) * Math.cos(theta);
        cam.position.set(x, y, z);
        cam.lookAt(0, activePreset === 'speed' ? 2.0 : 1.2, 0);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [activePreset]);

  const resetCamera = () => {
    orbitRef.current = { theta: 0.5, phi: 0.45, radius: 8.5 };
  };

  return (
    <div className="relative w-full h-[460px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
      {/* Top Overlay Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 shadow">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            {activePreset === 'speed'
              ? 'RenderJuice // Speed Motion Graphic'
              : activePreset === 'studio'
              ? 'Studio Rig // 360 Turntable'
              : activePreset === 'cloth'
              ? 'Garment Rig // Physics Drape'
              : customTitle}
          </span>
          <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded font-mono">
            3D WebGL Pre-Vis
          </span>
        </div>

        {/* Viewport Action Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/80 backdrop-blur-md p-1 rounded-lg border border-slate-700/60 shadow">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause Turntable' : 'Play Turntable'}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={resetCamera}
            title="Reset Camera View"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-700" />
          <button
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Ground Grid"
            className={`p-1.5 rounded transition ${
              showGrid ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-700" />
          {/* Shading mode switch */}
          <button
            onClick={() => setShadingMode('rendered')}
            title="Rendered (PBR Shaded)"
            className={`px-2 py-1 text-xs font-medium rounded transition ${
              shadingMode === 'rendered'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Rendered
          </button>
          <button
            onClick={() => setShadingMode('solid')}
            title="Solid Clay"
            className={`px-2 py-1 text-xs font-medium rounded transition ${
              shadingMode === 'solid'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Solid
          </button>
          <button
            onClick={() => setShadingMode('wireframe')}
            title="Wireframe Topology"
            className={`px-2 py-1 text-xs font-medium rounded transition ${
              shadingMode === 'wireframe'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Wire
          </button>
        </div>
      </div>

      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Bottom HUD Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs text-slate-400 font-mono shadow pointer-events-auto">
          <span>
            Verts: <strong className="text-slate-200">{stats.verts.toLocaleString()}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Faces: <strong className="text-slate-200">{stats.faces.toLocaleString()}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            FPS: <strong className="text-cyan-400">{stats.fps}</strong>
          </span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/60 text-[11px] text-slate-400 pointer-events-auto flex items-center gap-2">
          <span>Click & Drag to Orbit</span>
          <span className="text-slate-600">|</span>
          <span>Scroll to Zoom</span>
        </div>
      </div>
    </div>
  );
};
