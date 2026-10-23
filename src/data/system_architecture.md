# Autonomous Blender Python Engine & Agent Skill Architecture

## 1. High-Level System Architecture

The **Blender Agentic AI Skill System** translates unstructured natural language briefs, structured agent task schemas, or multimodal input (sketches, 3D renders, video timing references) into deterministic, production-ready Blender Python (`bpy` + `bmesh`) scripts that execute headlessly without graphical viewport dependencies.

```
+-----------------------------------------------------------------------------+
|                               LLM AGENT / USER                              |
|   (Natural Language / Multimodal Reference / Parametric Task Payload)       |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|            AGENT SKILL INTERFACE & TRANSLATION PIPELINE (Gemini)            |
|  - 3D Geometry Intent Extraction (Manifolds, Primitives, Curvature)          |
|  - Cross-Version Normalization (Blender 3.6 LTS vs 4.0 - 4.2+ Sockets)      |
|  - Headless Safety Enforcement (Eliminate GUI context dependencies)         |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|               AUTONOMOUS BPY CORE ENGINE (blender_agent_core.py)             |
|  [1] BlenderSceneManager       -> Programmatic purge & zero-GUI unlinking    |
|  [2] ProceduralMeshEngine      -> bmesh math manifolds, knots, cycloramas    |
|  [3] MaterialEngine            -> Principled BSDF, PBR, procedural shaders  |
|  [4] LightingRigEngine         -> Studio 3-point softboxes, HDRIs, kickers   |
|  [5] CameraRigEngine           -> Turntables, auto TRACK_TO constraints      |
|  [6] AnimationPhysicsEngine    -> Keyframing, cloth drape & cache baking     |
|  [7] HeadlessRenderEngine      -> Cycles GPU/CPU, EEVEE Next, H.264/PNG      |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                     HEADLESS BLENDER RUNTIME (CLI)                          |
|  $ blender -b scene.blend --python script.py -o //render/frame_#### -a      |
+-----------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------+
|                  OUTPUT ARTIFACTS & TELEMETRY LOGS                          |
|  - Rendered Stills / Animations (PNG / OpenEXR / MP4)                       |
|  - Structured Execution Telemetry JSON (Poly count, bake stats, time)       |
+-----------------------------------------------------------------------------+
```

---

## 2. Multi-Modal & Natural Language Translation Pipeline

1. **Intent Decomposition**:
   - The user request is parsed into 6 distinct 3D disciplines: Scene Topology, Material Shading, Lighting Rig, Camera Path, Physical Dynamics, and Output Render Target.
   - Multimodal inputs (e.g. photos of products or sketches) are analyzed by `gemini-4-argon` to estimate focal length, 3-point lighting angles, roughness/metallic coefficients, and geometric primitives.
2. **Direct Data API Mapping**:
   - Every operation maps strictly to `bpy.data.*` and `bmesh.*` rather than GUI operators (`bpy.ops.*`).
   - For example: instead of calling `bpy.ops.mesh.primitive_cylinder_add()`, the engine invokes `bpy.data.meshes.new()` and `bmesh.ops.create_cylinder()`.
3. **Cross-Version API Normalization**:
   - *Blender 3.6 LTS vs 4.x Sockets*:
     - `Transmission` -> `Transmission Weight`
     - `Clearcoat` -> `Coat Weight`
     - `Subsurface` -> `Subsurface Weight`
   - *EEVEE vs EEVEE Next*:
     - Detects `BLENDER_EEVEE_NEXT` vs `BLENDER_EEVEE` dynamically.
4. **Context Overrides**:
   - Whenever an operator requires an active selection (e.g., modifier application, physics baking), the engine wraps the call in `bpy.context.temp_override(active_object=..., selected_objects=...)`.

---

## 3. Headless CLI Execution Commands

### Headless Batch Execution
```bash
# Execute pure script in background without saving a .blend file
blender -b --python script_1_speed_motion_graphic.py -a

# Render single commercial studio still (Frame 1) at 4K
blender -b --python script_2_studio_product_rig.py -f 1

# Execute garment physics simulation and render settled drape (Frame 45)
blender -b --python script_3_headless_cloth_bake.py -f 45

# Pass custom arguments to the Python script using '--'
blender -b --python custom_agent_pipeline.py -- --resolution 3840 2160 --samples 256 --theme speed
```

### Dockerized Cloud Run / Headless Linux Server
```bash
docker run --rm -v $(pwd):/workspace -w /workspace \
  nytimes/blender:4.2-gpu-ubuntu \
  blender -b -P /workspace/script_1_speed_motion_graphic.py -o /workspace/output/frame_#### -a
```

---

## 4. Error Handling & Failure Recovery Matrix

| Potential Failure Point | Root Cause | Automated Agent Mitigation |
| :--- | :--- | :--- |
| `RuntimeError: Operator bpy.ops.ptcache.bake requires active object` | No active viewport selection in headless mode | Wrap in `with bpy.context.temp_override(active_object=cloth_obj, selected_objects=[cloth_obj]):` |
| `TypeError: Node socket 'Transmission' not found` | Blender 4.0+ socket renaming | Dynamic inspection: `if 'Transmission Weight' in node.inputs: ... else: ...` |
| `Memory Leak / Crash during loop` | Forgotten `bm.free()` | Mandatory `try...finally: bm.free()` on all procedural `bmesh` allocations |
| `Context Incorrect Mode` | Object left in `EDIT` mode | Pre-execution safety hook `BlenderSafety.ensure_object_mode()` |
| `GPU Device Unavailable` | Running inside headless CPU container | Graceful fallback to `scene.cycles.device = 'CPU'` if CUDA/OptiX is uninitialized |
