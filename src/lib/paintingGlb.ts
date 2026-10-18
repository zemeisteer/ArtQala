// A painting as a minimal glTF 2.0 binary (.glb) for phone AR (Android's
// Scene Viewer; iOS converts it to USDZ in the browser): a thin box of the
// real outer size in metres, the photo on its front face (+Z, so the back
// goes against the wall), plain dark edges and back. No dependencies.

export function paintingGlb(jpeg: Buffer, widthCm: number, heightCm: number, depthCm = 2.5): Buffer {
  const w = widthCm / 100 / 2;
  const h = heightCm / 100 / 2;
  const d = depthCm / 100;

  // Front face: textured. UV origin is the image's top-left.
  const front = {
    pos: [-w, -h, d, w, -h, d, w, h, d, -w, h, d],
    nrm: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    uv: [0, 1, 1, 1, 1, 0, 0, 0],
    idx: [0, 1, 2, 0, 2, 3],
  };

  // Back + four sides: one flat-shaded quad each (counter-clockwise seen
  // from outside).
  const quads: { p: number[][]; n: number[] }[] = [
    { p: [[w, -h, 0], [-w, -h, 0], [-w, h, 0], [w, h, 0]], n: [0, 0, -1] }, // back
    { p: [[-w, h, d], [w, h, d], [w, h, 0], [-w, h, 0]], n: [0, 1, 0] }, // top
    { p: [[-w, -h, 0], [w, -h, 0], [w, -h, d], [-w, -h, d]], n: [0, -1, 0] }, // bottom
    { p: [[-w, -h, 0], [-w, -h, d], [-w, h, d], [-w, h, 0]], n: [-1, 0, 0] }, // left
    { p: [[w, -h, d], [w, -h, 0], [w, h, 0], [w, h, d]], n: [1, 0, 0] }, // right
  ];
  const sides = { pos: [] as number[], nrm: [] as number[], idx: [] as number[] };
  quads.forEach((q, i) => {
    q.p.forEach((v) => {
      sides.pos.push(...v);
      sides.nrm.push(...q.n);
    });
    const b = i * 4;
    sides.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });

  // --- binary buffer: every view 4-byte aligned ---
  const chunks: Buffer[] = [];
  const views: { buffer: 0; byteOffset: number; byteLength: number; target?: number }[] = [];
  let offset = 0;
  const addView = (buf: Buffer, target?: number) => {
    const pad = (4 - (buf.length % 4)) % 4;
    views.push({ buffer: 0, byteOffset: offset, byteLength: buf.length, ...(target && { target }) });
    chunks.push(buf, Buffer.alloc(pad));
    offset += buf.length + pad;
    return views.length - 1;
  };
  const f32 = (a: number[]) => Buffer.from(new Float32Array(a).buffer);
  const u16 = (a: number[]) => Buffer.from(new Uint16Array(a).buffer);
  const ARRAY_BUFFER = 34962;
  const ELEMENT_ARRAY_BUFFER = 34963;

  const accessors: Record<string, unknown>[] = [];
  const addAccessor = (view: number, componentType: number, count: number, type: string, extra = {}) => {
    accessors.push({ bufferView: view, componentType, count, type, ...extra });
    return accessors.length - 1;
  };
  const bounds = (pos: number[]) => {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], pos[i + k]);
        max[k] = Math.max(max[k], pos[i + k]);
      }
    }
    return { min, max };
  };

  const FLOAT = 5126;
  const USHORT = 5123;
  const fPos = addAccessor(addView(f32(front.pos), ARRAY_BUFFER), FLOAT, 4, 'VEC3', bounds(front.pos));
  const fNrm = addAccessor(addView(f32(front.nrm), ARRAY_BUFFER), FLOAT, 4, 'VEC3');
  const fUv = addAccessor(addView(f32(front.uv), ARRAY_BUFFER), FLOAT, 4, 'VEC2');
  const fIdx = addAccessor(addView(u16(front.idx), ELEMENT_ARRAY_BUFFER), USHORT, front.idx.length, 'SCALAR');
  const sPos = addAccessor(addView(f32(sides.pos), ARRAY_BUFFER), FLOAT, sides.pos.length / 3, 'VEC3', bounds(sides.pos));
  const sNrm = addAccessor(addView(f32(sides.nrm), ARRAY_BUFFER), FLOAT, sides.nrm.length / 3, 'VEC3');
  const sIdx = addAccessor(addView(u16(sides.idx), ELEMENT_ARRAY_BUFFER), USHORT, sides.idx.length, 'SCALAR');
  const imageView = addView(jpeg);

  const gltf = {
    asset: { version: '2.0', generator: 'Art Qala' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'Painting' }],
    meshes: [
      {
        primitives: [
          { attributes: { POSITION: fPos, NORMAL: fNrm, TEXCOORD_0: fUv }, indices: fIdx, material: 0 },
          { attributes: { POSITION: sPos, NORMAL: sNrm }, indices: sIdx, material: 1 },
        ],
      },
    ],
    materials: [
      {
        name: 'Artwork',
        pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.85 },
      },
      {
        name: 'Edge',
        pbrMetallicRoughness: { baseColorFactor: [0.16, 0.13, 0.11, 1], metallicFactor: 0, roughnessFactor: 0.9 },
      },
    ],
    textures: [{ source: 0, sampler: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
    images: [{ bufferView: imageView, mimeType: 'image/jpeg' }],
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: offset }],
  };

  let json = Buffer.from(JSON.stringify(gltf));
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const bin = Buffer.concat(chunks);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(json.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // "BIN\0"
  return Buffer.concat([header, jsonHeader, json, binHeader, bin]);
}
