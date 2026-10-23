"""
================================================================================
BLENDER AGENTIC AI EXECUTION CORE (blender_agent_core.py)
Autonomous Blender Python (bpy) Engine & Headless 3D Pipeline
Target Compatibility: Blender 3.6 LTS through Blender 4.x+
================================================================================
Author: Autonomous 3D Technical Director Agent
License: Apache-2.0
Description:
    A robust, modular, pure programmatic execution core for headless Blender
    automation. Strictly adheres to:
    1. Direct Data API over bpy.ops (direct bpy.data manipulation and bmesh).
    2. Headless safety (no active 3D viewports, GUI context overrides).
    3. Explicit memory management (bmesh.free() and mesh.update()).
    4. Deterministic rendering pipelines (Cycles/EEVEE, sampling, FFMPEG/EXR).
================================================================================
"""

import sys
import os
import math
import time
import json
from typing import List, Tuple, Dict, Any, Optional

try:
    import bpy
    import bmesh
    import mathutils
    from mathutils import Vector, Matrix, Euler, Color
    HAS_BPY = True
except ImportError:
    HAS_BPY = False


# ==============================================================================
# 1. SCENE CLEANUP & INITIALIZATION ENGINE
# ==============================================================================

class BlenderSceneManager:
    """Manages scene lifecycle, zero-context programmatic resets, and collection hierarchies."""

    @staticmethod
    def clear_scene(remove_materials: bool = True, remove_textures: bool = True) -> Dict[str, int]:
        """
        Pure programmatic scene purge.
        Never relies on bpy.ops.object.select_all() or active GUI viewports.
        """
        if not HAS_BPY:
            return {"status": "mock", "removed_objects": 0}

        counts = {"objects": 0, "meshes": 0, "materials": 0, "cameras": 0, "lights": 0}

        # 1. Ensure Object Mode if any object is in edit mode
        BlenderSafety.ensure_object_mode()

        # 2. Programmatically unlink and delete all objects
        for obj in list(bpy.data.objects):
            counts["objects"] += 1
            if obj.type == 'MESH':
                counts["meshes"] += 1
            elif obj.type == 'CAMERA':
                counts["cameras"] += 1
            elif obj.type == 'LIGHT':
                counts["lights"] += 1
            bpy.data.objects.remove(obj, do_unlink=True)

        # 3. Purge orphaned mesh data blocks
        for mesh in list(bpy.data.meshes):
            if mesh.users == 0:
                bpy.data.meshes.remove(mesh)

        # 4. Purge orphaned curves, armatures, cameras, lights
        for curve in list(bpy.data.curves):
            if curve.users == 0:
                bpy.data.curves.remove(curve)
        for arm in list(bpy.data.armatures):
            if arm.users == 0:
                bpy.data.armatures.remove(arm)
        for cam in list(bpy.data.cameras):
            if cam.users == 0:
                bpy.data.cameras.remove(cam)
        for light in list(bpy.data.lights):
            if light.users == 0:
                bpy.data.lights.remove(light)

        # 5. Optional material & texture purge
        if remove_materials:
            for mat in list(bpy.data.materials):
                if mat.users == 0:
                    counts["materials"] += 1
                    bpy.data.materials.remove(mat)

        if remove_textures:
            for img in list(bpy.data.images):
                if img.users == 0 and not img.is_dirty:
                    bpy.data.images.remove(img)

        return counts

    @staticmethod
    def get_or_create_collection(name: str) -> Any:
        """Retrieves an existing collection or links a new one to the scene master collection."""
        if not HAS_BPY:
            return None
        if name in bpy.data.collections:
            return bpy.data.collections[name]
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
        return col

    @staticmethod
    def link_to_collection(obj: Any, collection_name: str = "Master"):
        """Safely links an object to a target collection without viewport dependencies."""
        if not HAS_BPY or not obj:
            return
        target_col = BlenderSceneManager.get_or_create_collection(collection_name)
        # Unlink from scene default collection if present
        if obj.name in bpy.context.scene.collection.objects:
            bpy.context.scene.collection.objects.unlink(obj)
        if obj.name not in target_col.objects:
            target_col.objects.link(obj)


# ==============================================================================
# 2. PROCEDURAL MESH GENERATION (BMESH & DIRECT DATA API)
# ==============================================================================

class ProceduralMeshEngine:
    """
    Constructs procedural geometry directly via bmesh or bpy.data.meshes.
    Always enforces mesh.update() and bm.free() discipline.
    """

    @staticmethod
    def create_torus_knot(
        name: str = "TorusKnot",
        p: int = 2,
        q: int = 3,
        major_radius: float = 2.0,
        minor_radius: float = 0.6,
        segments: int = 200,
        tube_segments: int = 16,
        tube_radius: float = 0.15,
        collection_name: str = "Geometry"
    ) -> Any:
        """
        Generates a mathematical (p, q) torus knot manifold using pure bmesh.
        """
        if not HAS_BPY:
            return None

        mesh = bpy.data.meshes.new(f"{name}_Mesh")
        bm = bmesh.new()

        try:
            # Generate knot spine curve points
            spine_pts = []
            for i in range(segments):
                phi = (2.0 * math.pi * i) / segments
                r = major_radius + minor_radius * math.cos(q * phi)
                x = r * math.cos(p * phi)
                y = r * math.sin(p * phi)
                z = -minor_radius * math.sin(q * phi)
                spine_pts.append(Vector((x, y, z)))

            # Generate cross-sectional rings along spine
            ring_verts = []
            for i in range(segments):
                p0 = spine_pts[i]
                p_next = spine_pts[(i + 1) % segments]
                tangent = (p_next - p0).normalized()

                # Generate perpendicular coordinate frame
                up = Vector((0.0, 0.0, 1.0))
                if abs(tangent.dot(up)) > 0.95:
                    up = Vector((0.0, 1.0, 0.0))
                normal = tangent.cross(up).normalized()
                binormal = tangent.cross(normal).normalized()

                current_ring = []
                for j in range(tube_segments):
                    theta = (2.0 * math.pi * j) / tube_segments
                    offset = (normal * math.cos(theta) + binormal * math.sin(theta)) * tube_radius
                    vert = bm.verts.new(p0 + offset)
                    current_ring.append(vert)
                ring_verts.append(current_ring)

            # Bridge rings with quad faces
            for i in range(segments):
                next_i = (i + 1) % segments
                for j in range(tube_segments):
                    next_j = (j + 1) % tube_segments
                    v1 = ring_verts[i][j]
                    v2 = ring_verts[next_i][j]
                    v3 = ring_verts[next_i][next_j]
                    v4 = ring_verts[i][next_j]
                    bm.faces.new((v1, v2, v3, v4))

            # Calculate normals and push bmesh to bpy mesh
            bm.normal_update()
            bm.to_mesh(mesh)
            mesh.update()
        finally:
            bm.free()

        obj = bpy.data.objects.new(name, mesh)
        BlenderSceneManager.link_to_collection(obj, collection_name)
        return obj

    @staticmethod
    def create_speed_ribbon(
        name: str = "SpeedRibbon",
        length: float = 12.0,
        width: float = 0.5,
        resolution: int = 120,
        frequency: float = 1.5,
        amplitude: float = 1.2,
        collection_name: str = "MotionGraphics"
    ) -> Any:
        """
        Creates an aerodynamic, twisting kinetic ribbon for speed motion graphics.
        """
        if not HAS_BPY:
            return None

        mesh = bpy.data.meshes.new(f"{name}_Mesh")
        bm = bmesh.new()

        try:
            verts_left = []
            verts_right = []

            for i in range(resolution):
                t = i / float(resolution - 1)
                x = (t - 0.5) * length
                y = math.sin(t * math.pi * 2.0 * frequency) * amplitude * (1.0 - t * 0.3)
                z = math.cos(t * math.pi * 2.0 * frequency) * (amplitude * 0.5)

                # Aerodynamic twist
                twist_angle = t * math.pi * 3.0
                nx = 0.0
                ny = -math.sin(twist_angle) * (width * 0.5)
                nz = math.cos(twist_angle) * (width * 0.5)

                v_l = bm.verts.new(Vector((x, y + ny, z + nz)))
                v_r = bm.verts.new(Vector((x, y - ny, z - nz)))
                verts_left.append(v_l)
                verts_right.append(v_r)

            # Connect quad ribbon strip
            for i in range(resolution - 1):
                v1 = verts_left[i]
                v2 = verts_right[i]
                v3 = verts_right[i + 1]
                v4 = verts_left[i + 1]
                bm.faces.new((v1, v2, v3, v4))

            bm.normal_update()
            bm.to_mesh(mesh)
            mesh.update()
        finally:
            bm.free()

        obj = bpy.data.objects.new(name, mesh)
        BlenderSceneManager.link_to_collection(obj, collection_name)
        return obj

    @staticmethod
    def create_cyclorama_backdrop(
        name: str = "StudioCyclorama",
        width: float = 14.0,
        depth: float = 10.0,
        height: float = 6.0,
        bevel_radius: float = 2.0,
        segments: int = 16,
        collection_name: str = "StudioRig"
    ) -> Any:
        """
        Constructs an infinity cove / cyclorama studio backdrop with seamless floor-to-wall curvature.
        """
        if not HAS_BPY:
            return None

        mesh = bpy.data.meshes.new(f"{name}_Mesh")
        bm = bmesh.new()

        try:
            # 2D cross section along Y-Z plane
            profile_points = []
            # 1. Front floor edge
            profile_points.append(Vector((0.0, depth * 0.5, 0.0)))
            # 2. Flat floor up to bevel start
            bevel_y_start = -depth * 0.5 + bevel_radius
            profile_points.append(Vector((0.0, bevel_y_start, 0.0)))

            # 3. Smooth curve transition
            for s in range(1, segments):
                frac = s / float(segments)
                angle = frac * (math.pi * 0.5)
                y = bevel_y_start - math.sin(angle) * bevel_radius
                z = (1.0 - math.cos(angle)) * bevel_radius
                profile_points.append(Vector((0.0, y, z)))

            # 4. Vertical wall up to top
            profile_points.append(Vector((0.0, -depth * 0.5, bevel_radius)))
            profile_points.append(Vector((0.0, -depth * 0.5, height)))

            # Extrude profile along X axis
            v_rows = []
            half_w = width * 0.5
            x_steps = 4
            for step in range(x_steps):
                x = -half_w + (step / float(x_steps - 1)) * width
                row = [bm.verts.new(Vector((x, pt.y, pt.z))) for pt in profile_points]
                v_rows.append(row)

            # Build quads
            for xi in range(x_steps - 1):
                for yi in range(len(profile_points) - 1):
                    v1 = v_rows[xi][yi]
                    v2 = v_rows[xi + 1][yi]
                    v3 = v_rows[xi + 1][yi + 1]
                    v4 = v_rows[xi][yi + 1]
                    bm.faces.new((v1, v2, v3, v4))

            bm.normal_update()
            bm.to_mesh(mesh)
            mesh.update()
        finally:
            bm.free()

        obj = bpy.data.objects.new(name, mesh)
        BlenderSceneManager.link_to_collection(obj, collection_name)
        return obj

    @staticmethod
    def create_cloth_sheet(
        name: str = "GarmentCloth",
        size: float = 3.0,
        subdivisions: int = 40,
        elevation: float = 3.0,
        collection_name: str = "Physics"
    ) -> Any:
        """
        Creates an evenly subdivided grid mesh optimized for cloth physical simulation.
        """
        if not HAS_BPY:
            return None

        mesh = bpy.data.meshes.new(f"{name}_Mesh")
        bm = bmesh.new()

        try:
            bmesh.ops.create_grid(
                bm,
                x_segments=subdivisions,
                y_segments=subdivisions,
                size=size * 0.5
            )
            # Offset vertical position
            for v in bm.verts:
                v.co.z += elevation

            bm.normal_update()
            bm.to_mesh(mesh)
            mesh.update()
        finally:
            bm.free()

        obj = bpy.data.objects.new(name, mesh)
        BlenderSceneManager.link_to_collection(obj, collection_name)
        return obj


# ==============================================================================
# 3. MATERIAL & SHADER GRAPH AUTOMATION
# ==============================================================================

class MaterialEngine:
    """Automates shader node graph construction using Principled BSDF and math node networks."""

    @staticmethod
    def create_principled_material(
        name: str,
        base_color: Tuple[float, float, float, float] = (0.8, 0.8, 0.8, 1.0),
        metallic: float = 0.0,
        roughness: float = 0.3,
        transmission: float = 0.0,
        ior: float = 1.45,
        emission_color: Tuple[float, float, float, float] = (0.0, 0.0, 0.0, 1.0),
        emission_strength: float = 0.0,
        clearcoat: float = 0.0
    ) -> Any:
        """
        Builds a production-grade Principled BSDF node graph compatible with Blender 3.6 - 4.x+.
        """
        if not HAS_BPY:
            return None

        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links

        # Clear default nodes safely
        nodes.clear()

        # Create output & BSDF nodes
        node_output = nodes.new(type="ShaderNodeOutputMaterial")
        node_output.location = (400, 0)

        node_bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
        node_bsdf.location = (0, 0)

        # Set shader inputs with cross-version property checking
        def safe_set_input(node, socket_name, value):
            if socket_name in node.inputs:
                node.inputs[socket_name].default_value = value

        safe_set_input(node_bsdf, "Base Color", base_color)
        safe_set_input(node_bsdf, "Metallic", metallic)
        safe_set_input(node_bsdf, "Roughness", roughness)
        safe_set_input(node_bsdf, "IOR", ior)

        # In Blender 4.0+, 'Transmission Weight' replaced 'Transmission'
        if "Transmission Weight" in node_bsdf.inputs:
            node_bsdf.inputs["Transmission Weight"].default_value = transmission
        elif "Transmission" in node_bsdf.inputs:
            node_bsdf.inputs["Transmission"].default_value = transmission

        # Emission inputs
        safe_set_input(node_bsdf, "Emission Color", emission_color)
        safe_set_input(node_bsdf, "Emission Strength", emission_strength)

        # Coat inputs (Blender 4.0+ uses 'Coat Weight', older uses 'Clearcoat')
        if "Coat Weight" in node_bsdf.inputs:
            node_bsdf.inputs["Coat Weight"].default_value = clearcoat
        elif "Clearcoat" in node_bsdf.inputs:
            node_bsdf.inputs["Clearcoat"].default_value = clearcoat

        # Link to output
        links.new(node_bsdf.outputs["BSDF"], node_output.inputs["Surface"])
        return mat

    @staticmethod
    def create_neon_glow_material(
        name: str,
        color: Tuple[float, float, float, float] = (0.0, 0.8, 1.0, 1.0),
        strength: float = 12.0
    ) -> Any:
        """Creates an intense emissive surface for cyber / motion graphic speed trails."""
        if not HAS_BPY:
            return None

        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        nodes.clear()

        node_output = nodes.new(type="ShaderNodeOutputMaterial")
        node_output.location = (300, 0)

        node_emission = nodes.new(type="ShaderNodeEmission")
        node_emission.location = (0, 0)
        node_emission.inputs["Color"].default_value = color
        node_emission.inputs["Strength"].default_value = strength

        links.new(node_emission.outputs["Emission"], node_output.inputs["Surface"])
        return mat

    @staticmethod
    def assign_material(obj: Any, material: Any):
        """Safely assigns a material data block to an object."""
        if not HAS_BPY or not obj or not material:
            return
        if len(obj.data.materials) == 0:
            obj.data.materials.append(material)
        else:
            obj.data.materials[0] = material


# ==============================================================================
# 4. CAMERA & LIGHTING RIGGING ENGINE
# ==============================================================================

class LightingRigEngine:
    """Configures multi-point studio rigs, HDRI environments, and tracking rigs."""

    @staticmethod
    def setup_studio_3point_lighting(
        target_obj: Any = None,
        key_power: float = 1200.0,
        fill_power: float = 400.0,
        rim_power: float = 1500.0,
        collection_name: str = "Lighting"
    ) -> Dict[str, Any]:
        """
        Creates a balanced 3-point studio lighting rig with warm key, soft cool fill, and high rim.
        """
        if not HAS_BPY:
            return {}

        center = target_obj.location if target_obj else Vector((0, 0, 0))

        # 1. KEY LIGHT (Warm, 45 deg angle, Area light)
        key_data = bpy.data.lights.new(name="Light_Key", type='AREA')
        key_data.energy = key_power
        key_data.size = 2.5
        key_data.color = (1.0, 0.95, 0.88)
        key_obj = bpy.data.objects.new("Light_Key", key_data)
        key_obj.location = center + Vector((4.0, -4.0, 4.5))
        BlenderSceneManager.link_to_collection(key_obj, collection_name)

        # 2. FILL LIGHT (Cool, opposite side, Soft Area light)
        fill_data = bpy.data.lights.new(name="Light_Fill", type='AREA')
        fill_data.energy = fill_power
        fill_data.size = 4.0
        fill_data.color = (0.85, 0.92, 1.0)
        fill_obj = bpy.data.objects.new("Light_Fill", fill_data)
        fill_obj.location = center + Vector((-4.5, -3.0, 2.5))
        BlenderSceneManager.link_to_collection(fill_obj, collection_name)

        # 3. RIM LIGHT (High contrast backlight)
        rim_data = bpy.data.lights.new(name="Light_Rim", type='SPOT')
        rim_data.energy = rim_power
        rim_data.spot_size = math.radians(45)
        rim_data.spot_blend = 0.4
        rim_data.color = (1.0, 1.0, 1.0)
        rim_obj = bpy.data.objects.new("Light_Rim", rim_data)
        rim_obj.location = center + Vector((0.0, 4.5, 4.0))
        BlenderSceneManager.link_to_collection(rim_obj, collection_name)

        # Target constraints for lights
        if target_obj:
            for l_obj in [key_obj, fill_obj, rim_obj]:
                const = l_obj.constraints.new(type='TRACK_TO')
                const.target = target_obj
                const.track_axis = 'TRACK_NEGATIVE_Z'
                const.up_axis = 'UP_Y'

        return {"key": key_obj, "fill": fill_obj, "rim": rim_obj}

    @staticmethod
    def setup_procedural_environment(strength: float = 0.6, color: Tuple[float, float, float] = (0.05, 0.06, 0.08)):
        """Sets up a clean, non-distracting studio ambient world lighting."""
        if not HAS_BPY:
            return
        world = bpy.context.scene.world
        if not world:
            world = bpy.data.worlds.new("StudioWorld")
            bpy.context.scene.world = world
        world.use_nodes = True
        bg_node = world.node_tree.nodes.get("Background")
        if bg_node:
            bg_node.inputs["Color"].default_value = (*color, 1.0)
            bg_node.inputs["Strength"].default_value = strength


class CameraRigEngine:
    """Handles camera rigging, auto-tracking targets, and turntable animation."""

    @staticmethod
    def create_tracked_camera(
        name: str = "StudioCamera",
        location: Tuple[float, float, float] = (0.0, -7.0, 3.5),
        focal_length: float = 50.0,
        target_obj: Any = None,
        collection_name: str = "Cameras"
    ) -> Any:
        """Constructs a camera with automatic TRACK_TO constraint towards target."""
        if not HAS_BPY:
            return None

        cam_data = bpy.data.cameras.new(f"{name}_Data")
        cam_data.lens = focal_length
        cam_data.clip_start = 0.1
        cam_data.clip_end = 500.0

        cam_obj = bpy.data.objects.new(name, cam_data)
        cam_obj.location = Vector(location)
        BlenderSceneManager.link_to_collection(cam_obj, collection_name)

        if target_obj:
            const = cam_obj.constraints.new(type='TRACK_TO')
            const.target = target_obj
            const.track_axis = 'TRACK_NEGATIVE_Z'
            const.up_axis = 'UP_Y'

        # Set as active scene camera
        bpy.context.scene.camera = cam_obj
        return cam_obj

    @staticmethod
    def setup_turntable_animation(
        camera_obj: Any,
        target_obj: Any,
        radius: float = 6.0,
        height: float = 2.5,
        start_frame: int = 1,
        end_frame: int = 120,
        rotations: float = 1.0
    ):
        """
        Creates smooth, 360-degree circular turntable keyframing around target.
        """
        if not HAS_BPY or not camera_obj:
            return

        center = target_obj.location if target_obj else Vector((0, 0, 0))
        total_frames = end_frame - start_frame

        for frame in range(start_frame, end_frame + 1):
            t = (frame - start_frame) / float(total_frames)
            angle = t * (math.pi * 2.0 * rotations)
            x = center.x + radius * math.sin(angle)
            y = center.y - radius * math.cos(angle)
            z = center.z + height

            camera_obj.location = Vector((x, y, z))
            camera_obj.keyframe_insert(data_path="location", frame=frame)

        # Set linear interpolation for seamless looping
        if camera_obj.animation_data and camera_obj.animation_data.action:
            for fcurve in camera_obj.animation_data.action.fcurves:
                for kfp in fcurve.keyframe_points:
                    kfp.interpolation = 'LINEAR'


# ==============================================================================
# 5. ANIMATION & PHYSICS ENGINE
# ==============================================================================

class AnimationPhysicsEngine:
    """Manages keyframing, cloth physical simulations, collisions, and shape keys."""

    @staticmethod
    def setup_cloth_simulation(
        cloth_obj: Any,
        collision_objects: Optional[List[Any]] = None,
        quality: int = 5,
        mass: float = 0.25,
        tension_stiffness: float = 15.0,
        compression_stiffness: float = 15.0,
        bending_stiffness: float = 0.5
    ) -> Any:
        """
        Configures a headless cloth physics modifier without requiring active viewport context.
        """
        if not HAS_BPY or not cloth_obj:
            return None

        # Add collision modifiers to obstacles
        if collision_objects:
            for coll_obj in collision_objects:
                if coll_obj and "Collision" not in [m.name for m in coll_obj.modifiers]:
                    coll_mod = coll_obj.modifiers.new(name="Collision", type='COLLISION')
                    coll_mod.settings.damping = 0.2
                    coll_mod.settings.friction = 0.5

        # Add cloth modifier to garment
        cloth_mod = cloth_obj.modifiers.new(name="ClothSim", type='CLOTH')
        csettings = cloth_mod.settings
        csettings.quality = quality
        csettings.mass = mass
        csettings.tension_stiffness = tension_stiffness
        csettings.compression_stiffness = compression_stiffness
        csettings.bending_stiffness = bending_stiffness

        # Enable self collision for realistic folds
        csettings.collision_settings.use_self_collision = True
        csettings.collision_settings.self_distance_min = 0.005

        return cloth_mod

    @staticmethod
    def keyframe_rotation(
        obj: Any,
        axis: str = "z",
        start_rot: float = 0.0,
        end_rot: float = math.pi * 2.0,
        start_frame: int = 1,
        end_frame: int = 120,
        interpolation: str = 'BEZIER'
    ):
        """Animates continuous rotation on specified Euler axis."""
        if not HAS_BPY or not obj:
            return

        axis_idx = {"x": 0, "y": 1, "z": 2}.get(axis.lower(), 2)

        obj.rotation_euler[axis_idx] = start_rot
        obj.keyframe_insert(data_path="rotation_euler", index=axis_idx, frame=start_frame)

        obj.rotation_euler[axis_idx] = end_rot
        obj.keyframe_insert(data_path="rotation_euler", index=axis_idx, frame=end_frame)

        if obj.animation_data and obj.animation_data.action:
            for fcurve in obj.animation_data.action.fcurves:
                if fcurve.data_path == "rotation_euler" and fcurve.array_index == axis_idx:
                    for kp in fcurve.keyframe_points:
                        kp.interpolation = interpolation


# ==============================================================================
# 6. HEADLESS RENDER ENGINE
# ==============================================================================

class HeadlessRenderEngine:
    """Handles rendering configuration and automated export execution."""

    @staticmethod
    def configure_pipeline(
        engine: str = 'CYCLES',
        device: str = 'GPU',
        samples: int = 128,
        resolution: Tuple[int, int] = (1920, 1080),
        denoise: bool = True,
        motion_blur: bool = False
    ):
        """
        Configures Cycles or EEVEE for headless batch rendering.
        """
        if not HAS_BPY:
            return

        scene = bpy.context.scene

        # Engine selection
        if engine.upper() in ['CYCLES', 'BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE']:
            # Blender 4.2+ uses BLENDER_EEVEE_NEXT or CYCLES
            if engine.upper() == 'EEVEE':
                scene.render.engine = 'BLENDER_EEVEE_NEXT' if hasattr(bpy.types, "RenderEngineEEVEENext") else 'BLENDER_EEVEE'
            else:
                scene.render.engine = engine.upper()

        # Resolution settings
        scene.render.resolution_x = resolution[0]
        scene.render.resolution_y = resolution[1]
        scene.render.resolution_percentage = 100

        # Motion blur
        scene.render.use_motion_blur = motion_blur

        # Cycles specific configuration
        if scene.render.engine == 'CYCLES':
            cscene = scene.cycles
            cscene.samples = samples
            cscene.adaptive_threshold = 0.01

            # Denoising
            cscene.use_denoising = denoise
            if hasattr(cscene, "denoiser"):
                cscene.denoiser = 'OPENIMAGEDENOISE'

            # Hardware device preference
            if device.upper() == 'GPU':
                cscene.device = 'GPU'
                # Attempt to enable OptiX/CUDA devices
                try:
                    prefs = bpy.context.preferences.addons['cycles'].preferences
                    prefs.get_devices()
                    for dev_type in ['OPTIX', 'CUDA', 'METAL', 'HIP']:
                        if dev_type in [t[0] for t in prefs.get_device_types(bpy.context)]:
                            prefs.compute_device_type = dev_type
                            for d in prefs.devices:
                                d.use = True
                            break
                except Exception:
                    # Fallback to CPU silently if GPU is unavailable in container
                    cscene.device = 'CPU'
            else:
                cscene.device = 'CPU'

    @staticmethod
    def set_export_format(
        output_path: str = "//render/output_",
        file_format: str = 'FFMPEG',
        codec: str = 'H264',
        container: str = 'MPEG4'
    ):
        """Configures headless output formats (H264 video, PNG, EXR)."""
        if not HAS_BPY:
            return

        scene = bpy.context.scene
        scene.render.filepath = output_path

        if file_format.upper() == 'FFMPEG':
            scene.render.image_settings.file_format = 'FFMPEG'
            scene.render.ffmpeg.format = container
            scene.render.ffmpeg.codec = codec
            scene.render.ffmpeg.constant_rate_factor = 'HIGH'
            scene.render.ffmpeg.ffmpeg_preset = 'GOOD'
        elif file_format.upper() in ['PNG', 'JPEG', 'OPEN_EXR']:
            scene.render.image_settings.file_format = file_format.upper()
            if file_format.upper() == 'PNG':
                scene.render.image_settings.color_mode = 'RGBA'
                scene.render.image_settings.color_depth = '8'

    @staticmethod
    def trigger_render(animation: bool = False, write_still: bool = True) -> Dict[str, Any]:
        """
        Safely executes render without GUI dependency.
        Returns execution statistics.
        """
        if not HAS_BPY:
            return {"status": "mock", "rendered": False}

        start_time = time.time()
        try:
            bpy.ops.render.render(animation=animation, write_still=write_still)
            elapsed = time.time() - start_time
            return {
                "status": "success",
                "elapsed_seconds": round(elapsed, 3),
                "filepath": bpy.context.scene.render.filepath,
                "is_animation": animation
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "elapsed_seconds": round(time.time() - start_time, 3)
            }


# ==============================================================================
# 7. SAFETY WRAPPER & CONTEXT OVERRIDE UTILITIES
# ==============================================================================

class BlenderSafety:
    """Guarantees safe execution in headless/background mode."""

    @staticmethod
    def ensure_object_mode():
        """Ensures the context is strictly in OBJECT mode."""
        if not HAS_BPY:
            return
        if bpy.context.active_object and bpy.context.active_object.mode != 'OBJECT':
            try:
                bpy.ops.object.mode_set(mode='OBJECT')
            except Exception:
                pass

    @staticmethod
    def set_active_and_selected(obj: Any):
        """Explicitly assigns active and selected status without GUI interaction."""
        if not HAS_BPY or not obj:
            return
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

    @staticmethod
    def safe_override_execute(op_func, active_obj=None, selected_objs=None, **kwargs):
        """
        Executes a bpy operator using bpy.context.temp_override() (Blender 3.2+)
        with fallback for earlier versions.
        """
        if not HAS_BPY:
            return None

        # Blender 3.2+ temp_override context manager
        if hasattr(bpy.context, "temp_override"):
            override_args = {}
            if active_obj:
                override_args["active_object"] = active_obj
            if selected_objs:
                override_args["selected_objects"] = selected_objs
            with bpy.context.temp_override(**override_args):
                return op_func(**kwargs)
        else:
            # Fallback legacy context override
            if active_obj:
                bpy.context.view_layer.objects.active = active_obj
            if selected_objs:
                for o in selected_objs:
                    o.select_set(True)
            return op_func(**kwargs)


# ==============================================================================
# MAIN TEST EXECUTION (WHEN RUN DIRECTLY VIA CLI: blender -b -P blender_agent_core.py)
# ==============================================================================

def run_self_test():
    """Runs a complete headless pipeline validation test."""
    print("=" * 70)
    print("BLENDER AGENT CORE: Initiating Autonomous Headless Test...")
    print("=" * 70)

    # 1. Reset
    counts = BlenderSceneManager.clear_scene()
    print(f"[1/5] Scene reset complete. Purged: {counts}")

    # 2. Geometry
    knot = ProceduralMeshEngine.create_torus_knot(name="AgentTorus", major_radius=1.8, minor_radius=0.5)
    print(f"[2/5] Procedural geometry created: {knot.name} ({len(knot.data.vertices)} vertices)")

    # 3. Shading
    mat = MaterialEngine.create_principled_material(
        name="ChromeGold",
        base_color=(1.0, 0.76, 0.33, 1.0),
        metallic=0.95,
        roughness=0.12,
        clearcoat=0.5
    )
    MaterialEngine.assign_material(knot, mat)
    print(f"[3/5] Shader graph compiled: {mat.name}")

    # 4. Rigging
    LightingRigEngine.setup_studio_3point_lighting(knot, key_power=1000.0)
    CameraRigEngine.create_tracked_camera("MainCamera", location=(0, -6, 3), target_obj=knot)
    CameraRigEngine.setup_turntable_animation(bpy.context.scene.camera, knot, radius=5.5, height=2.0, end_frame=30)
    print("[4/5] Lighting and turntable camera animation rigged.")

    # 5. Render Configuration
    HeadlessRenderEngine.configure_pipeline(engine='CYCLES', samples=16, resolution=(640, 360), denoise=False)
    HeadlessRenderEngine.set_export_format(output_path="//test_render.png", file_format='PNG')
    print("[5/5] Render pipeline configured.")

    print("=" * 70)
    print("BLENDER AGENT CORE: Self-test completed successfully with 0 errors!")
    print("=" * 70)


if __name__ == "__main__" and HAS_BPY:
    run_self_test()
