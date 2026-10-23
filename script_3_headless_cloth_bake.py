"""
================================================================================
SCRIPT 3: HEADLESS GARMENT / CLOTH SIMULATION & BAKING RIG
Automated Physical Cloth Simulation, Collision Modifiers & Headless Cache Bake
Headless Execution: blender -b --python script_3_headless_cloth_bake.py
================================================================================
Pipeline Highlights:
- Procedural stylized mannequin / avatar geometry with physical collision modifier
- High-density subdivided garment sheet with realistic silk/fabric physics parameters
- Programmatic point cache setup and headless physics bake execution
- Post-simulation smoothing via Subdivision Surface and Solidify modifiers
================================================================================
"""

import math
import sys
import os

try:
    import bpy
    import bmesh
    from mathutils import Vector, Euler
except ImportError:
    print("Error: This script must be run within Blender's Python environment (bpy).")
    sys.exit(1)


def build_headless_cloth_pipeline():
    print(">>> [CLOTH RIG] Initializing Headless Garment & Physics Simulation Pipeline...")

    # 1. PURGE SCENE
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

    # 2. CREATE COLLECTIONS
    avatar_col = bpy.data.collections.new("Avatar_Rig")
    cloth_col = bpy.data.collections.new("Garment_Cloth")
    bpy.context.scene.collection.children.link(avatar_col)
    bpy.context.scene.collection.children.link(cloth_col)

    # 3. PROCEDURAL MANNEQUIN / AVATAR COLLIDER
    avatar_mesh = bpy.data.meshes.new("Mannequin_Mesh")
    bm_av = bmesh.new()

    try:
        # Create Pedestal Base
        bmesh.ops.create_cylinder(bm_av, cap_ends=True, radius=0.8, depth=0.4, segments=32)
        for v in bm_av.verts:
            v.co.z += 0.2

        # Create Torso Stand
        bmesh.ops.create_cone(bm_av, cap_ends=True, cap_tris=False, radius1=0.7, radius2=0.4, depth=1.8, segments=32)
        # Shift torso up
        for v in bm_av.verts[len(bm_av.verts) - 66:]:
            v.co.z += 1.3

        # Create Upper Mannequin Torso / Shoulders Sphere
        bmesh.ops.create_icosphere(bm_av, subdivisions=3, radius=0.75)
        for v in bm_av.verts[len(bm_av.verts) - 162:]:
            v.co.z += 2.2
            v.co.x *= 1.25  # Wider shoulder line

        bm_av.normal_update()
        bm_av.to_mesh(avatar_mesh)
        avatar_mesh.update()
    finally:
        bm_av.free()

    avatar_obj = bpy.data.objects.new("MannequinAvatar", avatar_mesh)
    avatar_col.objects.link(avatar_obj)

    # Assign Collision Modifier to Avatar
    coll_mod = avatar_obj.modifiers.new("AvatarCollision", 'COLLISION')
    coll_mod.settings.damping = 0.35
    coll_mod.settings.friction = 0.8
    coll_mod.settings.thickness_outer = 0.02
    coll_mod.settings.thickness_inner = 0.01

    # Mannequin Sleek Material
    mat_av = bpy.data.materials.new("Mat_Mannequin")
    mat_av.use_nodes = True
    av_nodes = mat_av.node_tree.nodes
    av_nodes.clear()
    av_out = av_nodes.new("ShaderNodeOutputMaterial")
    av_bsdf = av_nodes.new("ShaderNodeBsdfPrincipled")
    av_bsdf.inputs["Base Color"].default_value = (0.1, 0.1, 0.12, 1.0)
    av_bsdf.inputs["Roughness"].default_value = 0.3
    mat_av.node_tree.links.new(av_bsdf.outputs["BSDF"], av_out.inputs["Surface"])
    avatar_obj.data.materials.append(mat_av)

    # 4. PROCEDURAL HIGH-RESOLUTION GARMENT CLOTH SHEET
    cloth_mesh = bpy.data.meshes.new("SilkGarment_Mesh")
    bm_cloth = bmesh.new()

    grid_res = 50
    cloth_size = 2.6

    try:
        bmesh.ops.create_grid(
            bm_cloth,
            x_segments=grid_res,
            y_segments=grid_res,
            size=cloth_size * 0.5
        )
        # Position cloth sheet above avatar shoulders with a subtle tilt
        rot_mat = Euler((math.radians(12), math.radians(-8), math.radians(25)), 'XYZ').to_matrix().to_4x4()
        for v in bm_cloth.verts:
            v.co = rot_mat @ v.co
            v.co.z += 3.2

        bm_cloth.normal_update()
        bm_cloth.to_mesh(cloth_mesh)
        cloth_mesh.update()
    finally:
        bm_cloth.free()

    cloth_obj = bpy.data.objects.new("SilkGarment", cloth_mesh)
    cloth_col.objects.link(cloth_obj)

    # 5. ATTACH CLOTH PHYSICS MODIFIER
    cloth_mod = cloth_obj.modifiers.new("ClothPhysics", 'CLOTH')
    cs = cloth_mod.settings

    # Silk fabric preset calibration
    cs.quality = 6
    cs.mass = 0.15                  # Light fabric
    cs.tension_stiffness = 25.0
    cs.compression_stiffness = 20.0
    cs.shear_stiffness = 15.0
    cs.bending_stiffness = 0.4      # Soft fluid drape
    cs.air_damping = 1.0

    # Self-collision preventing fabric intersection
    cs.collision_settings.use_self_collision = True
    cs.collision_settings.self_distance_min = 0.008
    cs.collision_settings.self_friction = 0.5

    # Post-Physics Polish Modifiers (Subsurf & Solidify)
    sub_mod = cloth_obj.modifiers.new("SmoothSubsurf", 'SUBSURF')
    sub_mod.levels = 1
    sub_mod.render_levels = 2

    solid_mod = cloth_obj.modifiers.new("FabricThickness", 'SOLIDIFY')
    solid_mod.thickness = 0.004

    # Silk Fabric Shader (Deep Emerald Velvet / Silk with subtle sheen)
    mat_cloth = bpy.data.materials.new("Mat_SilkFabric")
    mat_cloth.use_nodes = True
    cl_nodes = mat_cloth.node_tree.nodes
    cl_nodes.clear()
    cl_out = cl_nodes.new("ShaderNodeOutputMaterial")
    cl_bsdf = cl_nodes.new("ShaderNodeBsdfPrincipled")
    cl_bsdf.inputs["Base Color"].default_value = (0.04, 0.35, 0.22, 1.0)  # Deep Emerald
    cl_bsdf.inputs["Roughness"].default_value = 0.35
    if "Sheen Weight" in cl_bsdf.inputs:
        cl_bsdf.inputs["Sheen Weight"].default_value = 0.9
    elif "Sheen" in cl_bsdf.inputs:
        cl_bsdf.inputs["Sheen"].default_value = 0.9

    mat_cloth.node_tree.links.new(cl_bsdf.outputs["BSDF"], cl_out.inputs["Surface"])
    cloth_obj.data.materials.append(mat_cloth)

    # 6. STUDIO CAMERA & DRAMATIC FASHION LIGHTING
    cam_data = bpy.data.cameras.new("FashionCam_Data")
    cam_data.lens = 70.0
    cam_obj = bpy.data.objects.new("FashionCamera", cam_data)
    cam_obj.location = (0.0, -5.2, 2.2)
    cloth_col.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

    cam_track = cam_obj.constraints.new('TRACK_TO')
    cam_track.target = avatar_obj
    cam_track.track_axis = 'TRACK_NEGATIVE_Z'
    cam_track.up_axis = 'UP_Y'

    # Overhead soft spotlight
    overhead_l = bpy.data.lights.new("OverheadSpot", 'SPOT')
    overhead_l.energy = 2000.0
    overhead_l.spot_size = math.radians(50)
    overhead_l.color = (1.0, 0.98, 0.92)
    overhead_obj = bpy.data.objects.new("OverheadSpot", overhead_l)
    overhead_obj.location = (0, -1.0, 5.5)
    avatar_col.objects.link(overhead_obj)

    # Low fill light
    low_l = bpy.data.lights.new("LowFill", 'AREA')
    low_l.energy = 500.0
    low_l.size = 2.0
    low_l.color = (0.8, 0.9, 1.0)
    low_obj = bpy.data.objects.new("LowFill", low_l)
    low_obj.location = (-2.5, -3.0, 1.0)
    avatar_col.objects.link(low_obj)

    # 7. HEADLESS PHYSICS SIMULATION & POINT CACHE CONFIGURATION
    sim_frames = 60  # Frames to allow cloth to settle and fold gracefully
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = sim_frames

    # Setup cloth cache frame range
    point_cache = cloth_mod.point_cache
    point_cache.frame_start = 1
    point_cache.frame_end = sim_frames

    # Safe headless context override for baking
    print(f">>> Configuring cloth point cache for {sim_frames} frames...")
    try:
        # If in interactive or capable headless environment, trigger bake
        override_kwargs = {}
        if hasattr(bpy.context, "temp_override"):
            with bpy.context.temp_override(active_object=cloth_obj, selected_objects=[cloth_obj]):
                # Point cache bake operator
                bpy.ops.ptcache.bake(bake=True)
                print(">>> [CLOTH RIG] Physics Point Cache baked successfully!")
        else:
            bpy.context.view_layer.objects.active = cloth_obj
            cloth_obj.select_set(True)
            bpy.ops.ptcache.bake(bake=True)
    except Exception as bake_err:
        print(f">>> [CLOTH RIG NOTE] Immediate bake skipped (runs automatically during render): {bake_err}")

    # Set scene timeline to frame 45 (fully settled draped pose)
    bpy.context.scene.frame_set(45)

    # 8. RENDER CONFIGURATION
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'GPU'
    scene.cycles.samples = 128
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080

    out_dir = os.path.join(os.getcwd(), "cloth_renders")
    os.makedirs(out_dir, exist_ok=True)
    scene.render.filepath = os.path.join(out_dir, "cloth_drape_frame_####")

    print(">>> [CLOTH RIG] Headless Garment Pipeline successfully initialized!")
    print(">>> To render settled draped frame 45: blender -b -P script_3_headless_cloth_bake.py -f 45")


if __name__ == "__main__":
    build_headless_cloth_pipeline()
