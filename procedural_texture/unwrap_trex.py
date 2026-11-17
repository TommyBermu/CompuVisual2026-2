import sys, numpy as np, xatlas

src, dst = "trex.obj", "trex_uv.obj"

# ---------- Parse OBJ ----------
positions = []   # (V,3)
normals   = []    # (Nn,3)
faces     = []    # list of lists of position indices (0-based)

with open(src) as f:
    for line in f:
        s = line.split()
        if not s:
            continue
        if s[0] == "v":
            positions.append([float(x) for x in s[1:4]])
        elif s[0] == "vn":
            normals.append([float(x) for x in s[1:4]])
        elif s[0] == "f":
            idx = []
            for tok in s[1:]:
                # formats: "v", "v/vt", "v//vn", "v/vt/vn"
                v = tok.split("/")
                idx.append(int(v[0]) - 1)   # position index, 0-based
            faces.append(idx)

P = np.asarray(positions, dtype=np.float32)
print(f"parsed: {len(positions)} verts, {len(normals)} normals, {len(faces)} face polygons")

# ---------- Triangulate (fan) ----------
tris = []
for poly in faces:
    for k in range(1, len(poly) - 1):
        tris.append([poly[0], poly[k], poly[k+1]])
tris = np.asarray(tris, dtype=np.int32)
print(f"triangles: {len(tris)}")

# ---------- xatlas unwrap ----------
atlas = xatlas.Atlas()
atlas.add_mesh(P, tris)
atlas.generate()
mesh = atlas.get_mesh(0)
remap, Fm, Uv = mesh          # (M,) uint32 -> orig vertex, (T,3) uint32, (M,2) float
Fm  = np.asarray(Fm, dtype=np.int64)
Uv  = np.asarray(Uv, dtype=np.float32)
Vm  = P[np.asarray(remap, dtype=np.int64)]   # (M,3) positions
print("Vm", Vm.shape, "Fm", Fm.shape, "Uv", Uv.shape)
print(f"new verts: {len(Vm)}  new tris: {len(Fm)}  uvs: {len(Uv)}")

# ---------- Write OBJ with v/vt (p5.js computes smooth normals automatically) ----------
with open(dst, "w") as f:
    f.write("# unwrapped with xatlas (UVs added; normals computed by p5.js)\n")
    for v, uv in zip(Vm, Uv):
        f.write(f"v {v[0]:.2f} {v[1]:.2f} {v[2]:.2f}\n")
        f.write(f"vt {uv[0]:.3f} {uv[1]:.3f}\n")
    # v and vt share the same index (one of each per vertex, in order)
    for tri in Fm:
        i, j, k = tri[0]+1, tri[1]+1, tri[2]+1
        f.write(f"f {i}/{i} {j}/{j} {k}/{k}\n")

print("wrote", dst)
