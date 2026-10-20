"""lp — библиотека для стилизованных low-poly моделей в Blender (bpy), запуск без окна.

Единицы: 1 = 1 метр игрового мира (танк I ≈ 4.4 длины). Оси Blender: X — вперёд (нос), Y — влево, Z — вверх.
glTF-экспорт переводит в Y-up, нос остаётся +X (в игре rotation.y = -heading).

Порядок работы модели:
    import lp
    lp.reset()
    hull = lp.Part('hull')                       # одна деталь-узел в glb
    hull.box((4, 3, .5), (0, 0, 1.2), 'yellow', bevel=.08)
    ...
    lp.finish([hull, turret], out_dir, 'tank_t1') # UV, запекание краски/потёртостей/AO, экспорт .glb
"""
import math
import os
import bmesh
import bpy
from mathutils import Vector, Matrix, Euler

# ---------------------------------------------------------------- палитра
# Каждый материал: цвет, светлый цвет краёв, цвет сколов, сила потёртостей, шероховатость.
PALETTE = {
    # стиль Clash Royale: чистая краска, тени уходят в тёплый/холодный оттенок, а не в серый
    #               основной       свет            тень (со сдвигом оттенка)
    'yellow':   dict(c='#FFC21A', hi='#FFE680', lo='#E07A12', rough=.5),
    'yellow_d': dict(c='#F2A312', hi='#FFD25A', lo='#C25E0E', rough=.5),
    'gunmetal': dict(c='#56617C', hi='#93A1C0', lo='#2C3350', rough=.45),
    'dark':     dict(c='#3B4359', hi='#6A7590', lo='#20263A', rough=.55),
    'rubber':   dict(c='#3C404E', hi='#626979', lo='#21232E', rough=.75),
    'cream':    dict(c='#FFF4D8', hi='#FFFFFF', lo='#E8CC98', rough=.5),
    'orange':   dict(c='#FF8A1E', hi='#FFC070', lo='#CC4C0E', rough=.45),
    'red':      dict(c='#E8403A', hi='#FF8A72', lo='#A31C3A', rough=.45),
    'red_d':    dict(c='#B82A36', hi='#E85A5A', lo='#761430', rough=.5),
    'white':    dict(c='#F2F0F6', hi='#FFFFFF', lo='#B4B0CC', rough=.45),
    'army':     dict(c='#6E9A3E', hi='#A6D05E', lo='#3C6230', rough=.55),
    'bore':     dict(c='#1A1C26', hi='#2A2E3C', lo='#101118', rough=.9),
    'gold':     dict(c='#FFD23A', hi='#FFF2A6', lo='#D0860E', rough=.3),
    'brick':    dict(c='#EC6A3C', hi='#FFA474', lo='#B2312E', rough=.6),
    'brick2':   dict(c='#DB5634', hi='#FF8E62', lo='#9E2A2E', rough=.6),
    'mortar':   dict(c='#EADBBE', hi='#FFF6E2', lo='#B59C7C', rough=.7),
    'steel':    dict(c='#93A0BA', hi='#DDE5F4', lo='#4A5677', rough=.3),
    'steel_d':  dict(c='#6E7B98', hi='#AEBAD4', lo='#38415E', rough=.35),
    'leaf':     dict(c='#5CBB3A', hi='#A8EA6A', lo='#257238', rough=.7),
    'leaf_d':   dict(c='#46A238', hi='#86D45A', lo='#1D5E34', rough=.7),
    'stone':    dict(c='#BAC1CE', hi='#F0F3F8', lo='#717B94', rough=.7),
    'mud':      dict(c='#3D7E8A', hi='#5FA3AE', lo='#1F4E63', rough=.8),
    'blue':     dict(c='#3C8BEA', hi='#8CC4FF', lo='#2348A8', rough=.45),
    'green':    dict(c='#4CC25A', hi='#9BEA8A', lo='#1F7A4A', rough=.45),
    'purple':   dict(c='#9A5CE0', hi='#CDA2FF', lo='#5A2C9E', rough=.45),
    'wood':     dict(c='#D99A55', hi='#F8C98A', lo='#9A5A2E', rough=.6),
    'paper':    dict(c='#FFF7E6', hi='#FFFFFF', lo='#D8C6A2', rough=.7),
}
EMISSIVE = {
    'lamp': dict(c='#FFF4D2', strength=3.0),
    'lamp_red': dict(c='#FF5A3C', strength=2.5),
}


def hex2lin(h):
    h = h.lstrip('#')
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((c / 12.92) if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb) + (1.0,)


# ---------------------------------------------------------------- сцена

def reset():
    _mat_cache.clear()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for b in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for x in list(b):
            b.remove(x)


_mat_cache = {}


def mat(name):
    """Плоский материал-заготовка (цвет хранится в custom-свойствах для запекания)."""
    if name in _mat_cache and _mat_cache[name].name in bpy.data.materials:
        return _mat_cache[name]
    m = bpy.data.materials.new('M_' + name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    if name in EMISSIVE:
        e = EMISSIVE[name]
        bsdf.inputs['Base Color'].default_value = hex2lin(e['c'])
        bsdf.inputs['Emission Color'].default_value = hex2lin(e['c'])
        bsdf.inputs['Emission Strength'].default_value = e['strength']
        m['emissive'] = True
    else:
        p = PALETTE[name]
        bsdf.inputs['Base Color'].default_value = hex2lin(p['c'])
        bsdf.inputs['Roughness'].default_value = p['rough']
        m['emissive'] = False
    m['pal'] = name
    _mat_cache[name] = m
    return m


def _link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def _activate(obj):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_bevel(obj, width, segments=2, angle=40, clamp=True):
    if width <= 0:
        return
    md = obj.modifiers.new('Bevel', 'BEVEL')
    md.width = width
    md.segments = segments
    md.limit_method = 'ANGLE'
    md.angle_limit = math.radians(angle)
    md.use_clamp_overlap = clamp
    md.profile = 0.6
    _activate(obj)
    bpy.ops.object.modifier_apply(modifier=md.name)


def smooth_by_angle(obj, angle=35):
    _activate(obj)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))


def _mesh_obj(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return _link(bpy.data.objects.new(name, me))


# ---------------------------------------------------------------- деталь (узел glb)

class Part:
    """Набор объектов, которые в конце сливаются в один меш-узел. pivot — точка вращения узла."""

    def __init__(self, name, pivot=(0, 0, 0), parent=None):
        self.name = name
        self.pivot = Vector(pivot)
        self.parent = parent
        self.objs = []

    def _add(self, obj, material, bevel, segs, smooth=True, angle=40):
        obj.data.materials.append(mat(material))
        apply_bevel(obj, bevel, segs, angle)
        if smooth:
            smooth_by_angle(obj, 35)
        self.objs.append(obj)
        return obj

    # ---- примитивы
    def box(self, size, loc, material, bevel=0.05, segs=2, rot=(0, 0, 0), taper=None):
        """Брус. taper=(kx, ky) — сузить верх (усечённая пирамида)."""
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        for v in bm.verts:
            v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
            if taper and v.co.z > 0:
                v.co.x *= taper[0]; v.co.y *= taper[1]
        obj = _mesh_obj(self.name + '_box', bm)
        obj.rotation_euler = Euler(rot)
        obj.location = loc
        self._bake_transform(obj)
        return self._add(obj, material, bevel, segs)

    def prism(self, profile_xz, y0, y1, material, bevel=0.05, segs=2, loc=(0, 0, 0)):
        """Профиль в плоскости XZ (против часовой), вытянутый по Y от y0 до y1 — корпуса со скосами."""
        bm = bmesh.new()
        a = [bm.verts.new((x, y0, z)) for x, z in profile_xz]
        b = [bm.verts.new((x, y1, z)) for x, z in profile_xz]
        bm.faces.new(list(reversed(a)))
        bm.faces.new(b)
        n = len(profile_xz)
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        obj = _mesh_obj(self.name + '_prism', bm)
        obj.location = loc
        self._bake_transform(obj)
        return self._add(obj, material, bevel, segs)

    def frustum(self, bottom, top, z0, z1, material, loc=(0, 0, 0), chamfer=0.25, bevel=0.06, segs=2):
        """Многоугольная «башня»: прямоугольники bottom=(sx,sy) → top со срезанными углами."""
        def ring(sx, sy, z, c):
            hx, hy = sx / 2, sy / 2
            cx, cy = min(c, hx * .9), min(c, hy * .9)
            pts = [(hx, -hy + cy), (hx, hy - cy), (hx - cx, hy), (-hx + cx, hy), (-hx, hy - cy), (-hx, -hy + cy), (-hx + cx, -hy), (hx - cx, -hy)]
            return [(x, y, z) for x, y in pts]
        bm = bmesh.new()
        r0 = [bm.verts.new(p) for p in ring(*bottom, z0, chamfer)]
        r1 = [bm.verts.new(p) for p in ring(*top, z1, chamfer * top[0] / bottom[0])]
        bm.faces.new(list(reversed(r0)))
        bm.faces.new(r1)
        for i in range(8):
            bm.faces.new((r0[i], r0[(i + 1) % 8], r1[(i + 1) % 8], r1[i]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        obj = _mesh_obj(self.name + '_frustum', bm)
        obj.location = loc
        self._bake_transform(obj)
        return self._add(obj, material, bevel, segs)

    def cyl(self, r, depth, loc, material, axis='z', verts=16, r2=None, bevel=0.03, segs=2, smooth=True):
        """Цилиндр (r2 — радиус второго торца, конус). axis — вдоль какой оси."""
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=depth)
        rot = {'z': Matrix.Identity(3), 'x': Matrix.Rotation(math.pi / 2, 3, 'Y'), 'y': Matrix.Rotation(math.pi / 2, 3, 'X')}[axis]
        bmesh.ops.rotate(bm, verts=bm.verts, matrix=rot)
        obj = _mesh_obj(self.name + '_cyl', bm)
        obj.location = loc
        self._bake_transform(obj)
        return self._add(obj, material, bevel, segs, smooth=smooth, angle=30)

    def torus(self, R, r, loc, material, axis='y', segs=(12, 6)):
        rot = {'z': (0, 0, 0), 'x': (0, math.pi / 2, 0), 'y': (math.pi / 2, 0, 0)}[axis]
        bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=segs[0], minor_segments=segs[1], location=loc, rotation=rot)
        obj = bpy.context.active_object
        self._bake_transform(obj)
        return self._add(obj, material, 0, 1)

    def star(self, R, loc, normal_axis, material, depth=0.012, inner=0.42, ring=None):
        """Звезда-эмблема (тонкая пластинка) на грани; ring=(r_out, r_in) — кольцо вокруг."""
        bm = bmesh.new()
        pts = []
        for i in range(10):
            a = math.pi / 2 + i * math.pi / 5
            rr = R if i % 2 == 0 else R * inner
            pts.append((math.cos(a) * rr, math.sin(a) * rr))
        vs0 = [bm.verts.new((x, y, 0)) for x, y in pts]
        vs1 = [bm.verts.new((x, y, depth)) for x, y in pts]
        bm.faces.new(list(reversed(vs0))); bm.faces.new(vs1)
        for i in range(10):
            bm.faces.new((vs0[i], vs0[(i + 1) % 10], vs1[(i + 1) % 10], vs1[i]))
        if ring:
            ro, ri = ring
            n = 32
            a0 = [bm.verts.new((math.cos(t) * ro, math.sin(t) * ro, 0)) for t in [k * 2 * math.pi / n for k in range(n)]]
            b0 = [bm.verts.new((math.cos(t) * ri, math.sin(t) * ri, 0)) for t in [k * 2 * math.pi / n for k in range(n)]]
            a1 = [bm.verts.new((v.co.x, v.co.y, depth)) for v in a0]
            b1 = [bm.verts.new((v.co.x, v.co.y, depth)) for v in b0]
            for k in range(n):
                j = (k + 1) % n
                bm.faces.new((a1[k], a1[j], b1[j], b1[k]))
                bm.faces.new((a0[k], b0[k], b0[j], a0[j]))
                bm.faces.new((a0[k], a0[j], a1[j], a1[k]))
                bm.faces.new((b0[k], b1[k], b1[j], b0[j]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        # повернуть плоскость XY так, чтобы нормаль смотрела по normal_axis
        rot = {'+x': Euler((0, math.pi / 2, 0)), '-x': Euler((0, -math.pi / 2, 0)), '+y': Euler((-math.pi / 2, 0, 0)),
               '-y': Euler((math.pi / 2, 0, 0)), '+z': Euler((0, 0, 0))}[normal_axis]
        bmesh.ops.rotate(bm, verts=bm.verts, matrix=rot.to_matrix())
        obj = _mesh_obj(self.name + '_star', bm)
        obj.location = loc
        self._bake_transform(obj)
        return self._add(obj, material, 0, 1, smooth=False)

    def sphere(self, r, loc, material, subdiv=1, scale=(1, 1, 1), rot=(0, 0, 0), smooth=False, colors=None):
        """Гранёный шар (икосфера). colors(центр грани) -> имя материала — раскраска по граням."""
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=r)
        for v in bm.verts:
            v.co.x *= scale[0]; v.co.y *= scale[1]; v.co.z *= scale[2]
        face_mat = [colors(f.calc_center_median()) for f in bm.faces] if colors else None
        obj = _mesh_obj(self.name + '_sph', bm)
        obj.rotation_euler = Euler(rot)
        obj.location = loc
        self._bake_transform(obj)
        if not face_mat:
            return self._add(obj, material, 0, 1, smooth=smooth)
        names = list(dict.fromkeys(face_mat))
        for n in names:
            obj.data.materials.append(mat(n))
        for poly, n in zip(obj.data.polygons, face_mat):
            poly.material_index = names.index(n)
        if smooth:
            smooth_by_angle(obj, 35)
        self.objs.append(obj)
        return obj

    def add_obj(self, obj, material, bevel=0.0, segs=1, smooth=True):
        self._bake_transform(obj)
        return self._add(obj, material, bevel, segs, smooth)

    def mirror_y(self, objs):
        """Копия деталей, отражённая по Y (левый/правый борт)."""
        out = []
        for o in objs:
            c = o.copy()
            c.data = o.data.copy()
            _link(c)
            c.data.transform(Matrix.Scale(-1, 4, Vector((0, 1, 0))))
            c.data.flip_normals()
            self.objs.append(c)
            out.append(c)
        return out

    @staticmethod
    def _bake_transform(obj):
        _activate(obj)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    def join(self):
        for o in bpy.context.selected_objects:
            o.select_set(False)
        for o in self.objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = self.objs[0]
        if len(self.objs) > 1:
            bpy.ops.object.join()
        obj = bpy.context.active_object
        obj.name = self.name
        obj.data.name = self.name
        # pivot: сдвинуть геометрию, чтобы начало координат узла было в точке вращения
        obj.data.transform(Matrix.Translation(-self.pivot))
        obj.location = self.pivot
        self.obj = obj
        return obj


# ---------------------------------------------------------------- запекание краски

def _setup_cycles(samples=48):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'CUDA'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        sc.cycles.device = 'GPU'
    except Exception as e:  # noqa
        print('GPU недоступен, запекаю на процессоре:', e)
    sc.cycles.samples = samples
    sc.cycles.use_denoising = False


def _bake_tree(m, img):
    """Материал → эмиссия цвета: база, светлые рёбра, сколы краски, затенение углов, лёгкий градиент сверху."""
    nt = m.node_tree
    N = nt.nodes
    for n in list(N):
        N.remove(n)
    out = N.new('ShaderNodeOutputMaterial')
    emit = N.new('ShaderNodeEmission')
    nt.links.new(emit.outputs[0], out.inputs['Surface'])
    tex = N.new('ShaderNodeTexImage'); tex.image = img
    N.active = tex; tex.select = True

    if m.get('emissive'):
        e = EMISSIVE[m['pal']]
        emit.inputs['Color'].default_value = hex2lin(e['c'])
        return
    p = PALETTE[m['pal']]
    def rgb(h):
        n = N.new('ShaderNodeRGB'); n.outputs[0].default_value = hex2lin(h); return n.outputs[0]
    def mix(a, b, fac, blend='MIX'):
        n = N.new('ShaderNodeMix'); n.data_type = 'RGBA'; n.blend_type = blend
        nt.links.new(fac, n.inputs['Factor'])
        nt.links.new(a, n.inputs['A']); nt.links.new(b, n.inputs['B'])
        return n.outputs['Result']
    def maprange(src, a, b, c=0.0, d=1.0):
        n = N.new('ShaderNodeMapRange'); n.clamp = True; n.interpolation_type = 'SMOOTHSTEP'
        nt.links.new(src, n.inputs['Value'])
        n.inputs['From Min'].default_value = a; n.inputs['From Max'].default_value = b
        n.inputs['To Min'].default_value = c; n.inputs['To Max'].default_value = d
        return n.outputs['Result']

    # нарисованный свет: грани, смотрящие вниз, — в тень с тёплым оттенком, вверх — к светлому тону
    geo = N.new('ShaderNodeNewGeometry')
    sep = N.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Normal'], sep.inputs[0])
    shade_dn = maprange(sep.outputs['Z'], 0.35, -0.9, 0.0, 0.55)
    light_up = maprange(sep.outputs['Z'], 0.55, 1.0, 0.0, 0.28)
    # мягкая подсветка выпуклых рёбер (без сколов)
    ao_in = N.new('ShaderNodeAmbientOcclusion'); ao_in.inside = True; ao_in.only_local = True
    ao_in.inputs['Distance'].default_value = 0.12; ao_in.samples = 16
    edge = maprange(ao_in.outputs['AO'], 0.95, 0.6, 0.0, 0.45)
    # затенение углов цветом тени
    ao = N.new('ShaderNodeAmbientOcclusion'); ao.only_local = False
    ao.inputs['Distance'].default_value = 0.4; ao.samples = 16
    occl = maprange(ao.outputs['AO'], 0.3, 1.0, 0.75, 0.0)

    # градиент по высоте детали: низ темнее (в цвет тени), верх светлее — как «свет сверху» в Clash Royale
    tc = N.new('ShaderNodeTexCoord')
    gz = N.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Generated'], gz.inputs[0])
    low = maprange(gz.outputs['Z'], 0.0, 0.55, 0.45, 0.0)
    high = maprange(gz.outputs['Z'], 0.7, 1.0, 0.0, 0.18)

    col = rgb(p['c'])
    col = mix(col, rgb(p['lo']), low)
    col = mix(col, rgb(p['hi']), high)
    col = mix(col, rgb(p['lo']), shade_dn)
    col = mix(col, rgb(p['hi']), light_up)
    col = mix(col, rgb(p['hi']), edge)
    col = mix(col, rgb(p['lo']), occl)
    nt.links.new(col, emit.inputs['Color'])


def bake_part(obj, size=1024, samples=48):
    _activate(obj)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.006, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    img = bpy.data.images.new(obj.name + '_paint', size, size)
    # временные копии материалов с деревом запекания
    originals = [s.material for s in obj.material_slots]
    temps = []
    for i, s in enumerate(obj.material_slots):
        t = s.material.copy(); t['pal'] = s.material['pal']; t['emissive'] = s.material['emissive']
        _bake_tree(t, img)
        s.material = t
        temps.append(t)
    _setup_cycles(samples)
    bpy.context.scene.render.bake.margin = 6
    bpy.ops.object.bake(type='EMIT')
    img.pack()
    # итоговые материалы: одна краска + свои светящиеся
    paint = bpy.data.materials.new(obj.name + '_paint')
    paint.use_nodes = True
    nt = paint.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.38
    for i, s in enumerate(obj.material_slots):
        s.material = originals[i] if originals[i].get('emissive') else paint
    for t in temps:
        bpy.data.materials.remove(t)
    merge_slots(obj)
    return img


def merge_slots(obj):
    """Слоты с одинаковым материалом → один слот: в glb выйдет один кусок на материал (меньше вызовов отрисовки)."""
    mats = [s.material for s in obj.material_slots]
    uniq = list(dict.fromkeys(mats))
    if len(uniq) == len(mats):
        return
    remap = [uniq.index(m) for m in mats]
    for poly in obj.data.polygons:
        poly.material_index = remap[poly.material_index]
    obj.data.materials.clear()
    for m in uniq:
        obj.data.materials.append(m)


def finish(parts, out_dir, name, bake=True, size=1024):
    """Запекание и экспорт. Текстуры — WebP (в игре все модели встроены в один файл);
    в игру модель попадает через `node tools/pack-models.mjs` (сжатие meshopt → assets/models)."""
    os.makedirs(out_dir, exist_ok=True)
    objs = []
    for p in parts:
        objs.append(p.join())
    for p in parts:
        if p.parent is not None:
            p.obj.parent = p.parent.obj
            p.obj.matrix_parent_inverse = p.parent.obj.matrix_world.inverted()
    if bake:
        for o in objs:
            bake_part(o, size)
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    path = os.path.join(out_dir, name + '.glb')
    opts = dict(export_format='GLB', use_selection=True, export_apply=True, export_yup=True)
    try:
        bpy.ops.export_scene.gltf(filepath=path, export_image_format='WEBP', export_image_quality=88, **opts)
    except TypeError:
        bpy.ops.export_scene.gltf(filepath=path, **opts)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_dir, name + '.blend'))
    print('EXPORTED', path)
    return path
