"""
================================================================================
SCRIPT 1: PROCEDURAL 3D MOTION GRAPHIC — "SPEED"
Autonomous RenderJuice Competition Animation Pipeline (5-30 seconds)
Headless Execution: blender -b --python script_1_speed_motion_graphic.py
================================================================================
Theme: "SPEED" (RenderJuice High-Performance Motion Graphic)
Pipeline Highlights:
- Procedural aerodynamic ribbon & spiraling supersonic shockwave manifolds via bmesh
- High-emission neon velocity trails & chromatic metallic core
- Dynamic sweeping camera with motion blur & speed-ramp fcurves
- Pure headless batch rendering to H.264 FFMPEG mp4 or PNG sequence
================================================================================
"""

import math
import sys
import os

try:
    import bpy
    import bmesh
    from mathutils import Vector, Euler, Color
except ImportError:
    print("Error: This script must be run within Blender's Python environment (bpy).")
    sys.exit(1)


def build_speed_motion_graphic():
    print(">>> [RENDERJUICE] Initiating 'SPEED' Motion Graphic Sequence Generation...")

    # 1. CLEAN SCENE
    if bpy.context.active_object and bpy.context.active_object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')

    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for mat in list(bpy.data.materials):
        if mat.users == 0:
            bpy.data.materials.remove(mat)

    # 2. CREATE MASTER COLLECTION
    col_name = "Speed_Comp_Assets"
    col = bpy.data.collections.get(col_name) or bpy.data.collections.new(col_name)
    if col_name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)

    # 3. PROCEDURAL AERODYNAMIC VELOCITY CORE (BMESH TORUS KNOT)
    mesh_knot = bpy.data.meshes.new("VelocityCore_Mesh")
    bm_knot = bmesh.new()

    p, q = 3, 7
    major_r, minor_r = 2.4, 0.7
    segments = 240
    tube_segs = 12
    tube_rad = 0.08

    try:
        spine = []
        for i in range(segments):
            phi = (2.0 * math.pi * i) / segments
            r = major_r + minor_r * math.cos(q * phi)
            x = r * math.cos(p * phi)
            y = r * math.sin(p * phi)
            z = -minor_r * math.sin(q * phi)
            spine.append(Vector((x, y, z)))

        ring_verts = []
        for i in range(segments):
            p0 = spine[i]
            p_next = spine[(i + 1) % segments]
            t = (p_next - p0).normalized()
            up = Vector((0, 0, 1)) if abs(t.dot(Vector((0, 0, 1)))) < 0.9 else Vector((0, 1, 0))
            n = t.cross(up).normalized()
            b = t.cross(n).normalized()

            ring = []
            for j in range(tube_segs):
                theta = (2.0 * math.pi * j) / tube_segs
                offset = (n * math.cos(theta) + b * math.sin(theta)) * tube_rad
                ring.append(bm_knot.verts.new(p0 + offset))
            ring_verts.append(ring)

        for i in range(segments):
            next_i = (i + 1) % segments
            for j in range(tube_segs):
                next_j = (j + 1) % tube_segs
                bm_knot.faces.new((ring_verts[i][j], ring_verts[next_i][j], ring_verts[next_i][next_j], ring_verts[i][next_j]))

        bm_knot.normal_update()
        bm_knot.to_mesh(mesh_knot)
        mesh_knot.update()
    finally:
        bm_knot.free()

    core_obj = bpy.data.objects.new("VelocityCore", mesh_knot)
    col.objects.link(core_obj)

    # 4. PROCEDURAL HIGH-SPEED EXPANDING SHOCKWAVE RIBBONS
    ribbon_mesh = bpy.data.meshes.new("ShockwaveRibbon_Mesh")
    bm_ribbon = bmesh.new()

    try:
        r_segs = 180
        left_v, right_v = [], []
        for i in range(r_segs):
            u = i / float(r_segs - 1)
            angle = u * math.pi * 8.0
            radius = 1.0 + u * 4.5
            height = (u - 0.5) * 6.0
            cx = radius * math.cos(angle)
            cy = radius * math.sin(angle)
            cz = height

            width = 0.35 * (1.0 - math.pow(u - 0.5, 2) * 2.0)
            v1 = bm_ribbon.verts.new(Vector((cx, cy, cz - width)))
            v2 = bm_ribbon.verts.new(Vector((cx, cy, cz + width)))
            left_v.append(v1)
            right_v.append(v2)

        for i in range(r_segs - 1):
            bm_ribbon.faces.new((left_v[i], right_v[i], right_v[i + 1], left_v[i + 1]))

        bm_ribbon.normal_update()
        bm_ribbon.to_mesh(ribbon_mesh)
        ribbon_mesh.update()
    finally:
        bm_ribbon.free()

    ribbon_obj = bpy.data.objects.new("ShockwaveRibbon", ribbon_mesh)
    col.objects.link(ribbon_obj)

    # 5. SHADER NETWORKS
    # Core Shader: Iridescent Midnight Chrome with clearcoat
    mat_core = bpy.data.materials.new("Mat_SpeedChrome")
    mat_core.use_nodes = True
    c_nodes = mat_core.node_tree.nodes
    c_links = mat_core.node_tree.links
    c_nodes.clear()

    out_node = c_nodes.new("ShaderNodeOutputMaterial")
    bsdf_core = c_nodes.new("ShaderNodeBsdfPrincipled")
    bsdf_core.inputs["Base Color"].default_value = (0.02, 0.04, 0.09, 1.0)
    bsdf_core.inputs["Metallic"].default_value = 1.0
    bsdf_core.inputs["Roughness"].default_value = 0.08
    if "Coat Weight" in bsdf_core.inputs:
        bsdf_core.inputs["Coat Weight"].default_value = 1.0
    elif "Clearcoat" in bsdf_core.inputs:
        bsdf_core.inputs["Clearcoat"].default_value = 1.0
    c_links.new(bsdf_core.outputs["BSDF"], out_node.inputs["Surface"])
    core_obj.data.materials.append(mat_core)

    # Ribbon Shader: High-intensity neon cyan plasma emission
    mat_ribbon = bpy.data.materials.new("Mat_NeonSpeedTrail")
    mat_ribbon.use_nodes = True
    r_nodes = mat_ribbon.node_tree.nodes
    r_links = mat_ribbon.node_tree.links
    r_nodes.clear()

    r_out = r_nodes.new("ShaderNodeOutputMaterial")
    r_emit = r_nodes.new("ShaderNodeEmission")
    r_emit.inputs["Color"].default_value = (0.0, 0.85, 1.0, 1.0)
    r_emit.inputs["Strength"].default_value = 25.0
    r_links.new(r_emit.outputs["Emission"], r_out.inputs["Surface"])
    ribbon_obj.data.materials.append(mat_ribbon)

    # 6. DYNAMIC SPEED ANIMATION & KEYFRAMING
    total_frames = 150  # 6 seconds at 25 fps
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = total_frames
    bpy.context.scene.render.fps = 25

    # Core object rapid rotation
    core_obj.rotation_euler = (0, 0, 0)
    core_obj.keyframe_insert("rotation_euler", index=2, frame=1)
    core_obj.rotation_euler = (math.radians(35), math.radians(20), math.radians(1080))
    core_obj.keyframe_insert("rotation_euler", frame=total_frames)

    # Ribbon counter-rotation & pulsation scale
    ribbon_obj.rotation_euler = (0, 0, 0)
    ribbon_obj.keyframe_insert("rotation_euler", index=2, frame=1)
    ribbon_obj.rotation_euler = (0, 0, -math.radians(720))
    ribbon_obj.keyframe_insert("rotation_euler", index=2, frame=total_frames)

    # Linear fcurve interpolation for infinite speed feel
    for animated in [core_obj, ribbon_obj]:
        if animated.animation_data and animated.animation_data.action:
            for fc in animated.animation_data.action.fcurves:
                for kp in fc.keyframe_points:
                    kp.interpolation = 'BEZIER'
                    kp.easing = 'EASE_IN_OUT'

    # 7. HIGH SPEED FLY-THROUGH CAMERA
    cam_data = bpy.data.cameras.new("SpeedCam_Data")
    cam_data.lens = 28.0  # Wide-angle dynamic perspective
    cam_obj = bpy.data.objects.new("SpeedCamera", cam_data)
    col.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

    # Camera tracking constraint
    track = cam_obj.constraints.new("TRACK_TO")
    track.target = core_obj
    track.track_axis = 'TRACK_NEGATIVE_Z'
    track.up_axis = 'UP_Y'

    # Camera spiral trajectory (Speed-ramp fly-in)
    cam_obj.location = Vector((12.0, -14.0, 7.0))
    cam_obj.keyframe_insert("location", frame=1)
    cam_obj.location = Vector((0.0, -6.5, 1.2))
    cam_obj.keyframe_insert("location", frame=total_frames)

    # 8. LIGHTING SETUP
    light_top_data = bpy.data.lights.new("TopSpot", 'SPOT')
    light_top_data.energy = 3000.0
    light_top_data.spot_size = math.radians(60)
    light_top = bpy.data.objects.new("TopSpot", light_top_data)
    light_top.location = (0, 0, 10)
    col.objects.link(light_top)

    light_edge_data = bpy.data.lights.new("EdgeFill", 'AREA')
    light_edge_data.energy = 1500.0
    light_edge_data.size = 6.0
    light_edge_data.color = (1.0, 0.2, 0.4)  # High-energy crimson rim
    light_edge = bpy.data.objects.new("EdgeFill", light_edge_data)
    light_edge.location = (-6.0, 6.0, 2.0)
    col.objects.link(light_edge)

    # 9. RENDER & MOTION BLUR CONFIGURATION
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'GPU'
    scene.cycles.samples = 128
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100

    # Motion Blur enabled for high-velocity feel
    scene.render.use_motion_blur = True
    scene.render.motion_blur_shutter = 0.65

    # Headless Output Setup
    output_dir = os.path.join(os.getcwd(), "render_output")
    os.makedirs(output_dir, exist_ok=True)
    scene.render.filepath = os.path.join(output_dir, "speed_frame_####")
    scene.render.image_settings.file_format = 'PNG'

    print(">>> [RENDERJUICE] 'SPEED' Motion Graphic successfully built & rigged!")
    print(f">>> Ready for headless render: blender -b -P script_1_speed_motion_graphic.py -a")


if __name__ == "__main__":
    build_speed_motion_graphic()
