// The painting as a .usdz for iPhone/iPad AR Quick Look, built on the server
// so it has a real URL — Chrome and other non-Safari iOS browsers can only
// open Quick Look from a real link, not from a file made in the page.
//
// Same box as paintingGlb.ts (front +Z, back at z=0), wrapped in a transform
// that tips it back 90°: Quick Look's wall anchor uses Y as the wall normal
// and -Z as up, so the front ends up facing out of the wall, top up.
// A .usdz is an uncompressed zip whose files start on 64-byte boundaries,
// with the .usda first. No dependencies.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStored(files: { name: string; data: Buffer }[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name);
    const crc = crc32(f.data);
    // Pad the local header's extra field so the data starts at a multiple of 64.
    const headerLen = 30 + name.length;
    const pad = (64 - ((offset + headerLen + 4) % 64)) % 64;
    const extra = Buffer.alloc(4 + pad);
    extra.writeUInt16LE(0x1986, 0); // private "alignment" extra field id
    extra.writeUInt16LE(pad, 2);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(0, 10); // time
    local.writeUInt16LE(0x21, 12); // date (1980-01-01)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(f.data.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(extra.length, 28);
    parts.push(local, name, extra, f.data);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(0, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt16LE(0x21, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(f.data.length, 20);
    cen.writeUInt32LE(f.data.length, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt16LE(0, 30); // extra
    cen.writeUInt16LE(0, 32); // comment
    cen.writeUInt16LE(0, 34); // disk
    cen.writeUInt16LE(0, 36); // internal attrs
    cen.writeUInt32LE(0, 38); // external attrs
    cen.writeUInt32LE(offset, 42);
    central.push(cen, name);

    offset += 30 + name.length + extra.length + f.data.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, centralBuf, end]);
}

const f = (n: number) => n.toFixed(5);
const vec = (v: number[]) => `(${v.map(f).join(', ')})`;

export function paintingUsdz(jpeg: Buffer, widthCm: number, heightCm: number, depthCm = 2): Buffer {
  const w = widthCm / 100 / 2;
  const h = heightCm / 100 / 2;
  const d = depthCm / 100;

  // Front (textured). USD's st origin is bottom-left.
  const front = [[-w, -h, d], [w, -h, d], [w, h, d], [-w, h, d]];
  // Back + four sides, counter-clockwise seen from outside.
  const quads: { p: number[][]; n: number[] }[] = [
    { p: [[w, -h, 0], [-w, -h, 0], [-w, h, 0], [w, h, 0]], n: [0, 0, -1] },
    { p: [[-w, h, d], [w, h, d], [w, h, 0], [-w, h, 0]], n: [0, 1, 0] },
    { p: [[-w, -h, 0], [w, -h, 0], [w, -h, d], [-w, -h, d]], n: [0, -1, 0] },
    { p: [[-w, -h, 0], [-w, -h, d], [-w, h, d], [-w, h, 0]], n: [-1, 0, 0] },
    { p: [[w, -h, d], [w, -h, 0], [w, h, 0], [w, h, d]], n: [1, 0, 0] },
  ];
  const sidePoints = quads.flatMap((q) => q.p);
  const sideNormals = quads.flatMap((q) => [q.n, q.n, q.n, q.n]);
  const sideIdx = quads.flatMap((_, i) => [i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 3]);

  const usda = `#usda 1.0
(
    defaultPrim = "Root"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Root"
{
    def Scope "Scenes" (
        kind = "sceneLibrary"
    )
    {
        def Xform "Scene" (
            customData = {
                bool preliminary_collidesWithEnvironment = 0
                string sceneName = "Scene"
            }
            sceneName = "Scene"
        )
        {
            token preliminary:anchoring:type = "plane"
            token preliminary:planeAnchoring:alignment = "vertical"

            def Xform "Painting"
            {
                matrix4d xformOp:transform = ( (1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1) )
                uniform token[] xformOpOrder = ["xformOp:transform"]

                def Mesh "Front" (
                    prepend apiSchemas = ["MaterialBindingAPI"]
                )
                {
                    int[] faceVertexCounts = [4]
                    int[] faceVertexIndices = [0, 1, 2, 3]
                    normal3f[] normals = [(0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1)] (
                        interpolation = "vertex"
                    )
                    point3f[] points = [${front.map(vec).join(', ')}]
                    texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)] (
                        interpolation = "vertex"
                    )
                    uniform token subdivisionScheme = "none"
                    rel material:binding = </Root/Materials/Artwork>
                }

                def Mesh "Edges" (
                    prepend apiSchemas = ["MaterialBindingAPI"]
                )
                {
                    int[] faceVertexCounts = [4, 4, 4, 4, 4]
                    int[] faceVertexIndices = [${sideIdx.join(', ')}]
                    normal3f[] normals = [${sideNormals.map(vec).join(', ')}] (
                        interpolation = "vertex"
                    )
                    point3f[] points = [${sidePoints.map(vec).join(', ')}]
                    uniform token subdivisionScheme = "none"
                    rel material:binding = </Root/Materials/Edge>
                }
            }
        }
    }

    def Scope "Materials"
    {
        def Material "Artwork"
        {
            token outputs:surface.connect = </Root/Materials/Artwork/Surface.outputs:surface>

            def Shader "St"
            {
                uniform token info:id = "UsdPrimvarReader_float2"
                string inputs:varname = "st"
                float2 outputs:result
            }

            def Shader "Image"
            {
                uniform token info:id = "UsdUVTexture"
                asset inputs:file = @textures/artwork.jpg@
                float2 inputs:st.connect = </Root/Materials/Artwork/St.outputs:result>
                token inputs:sourceColorSpace = "sRGB"
                token inputs:wrapS = "clamp"
                token inputs:wrapT = "clamp"
                float3 outputs:rgb
            }

            def Shader "Glow"
            {
                uniform token info:id = "UsdUVTexture"
                asset inputs:file = @textures/artwork.jpg@
                float2 inputs:st.connect = </Root/Materials/Artwork/St.outputs:result>
                float4 inputs:scale = (0.6, 0.6, 0.6, 1)
                token inputs:sourceColorSpace = "sRGB"
                token inputs:wrapS = "clamp"
                token inputs:wrapT = "clamp"
                float3 outputs:rgb
            }

            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor.connect = </Root/Materials/Artwork/Image.outputs:rgb>
                color3f inputs:emissiveColor.connect = </Root/Materials/Artwork/Glow.outputs:rgb>
                float inputs:roughness = 0.85
                float inputs:metallic = 0
                token outputs:surface
            }
        }

        def Material "Edge"
        {
            token outputs:surface.connect = </Root/Materials/Edge/Surface.outputs:surface>

            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (0.16, 0.13, 0.11)
                float inputs:roughness = 0.9
                float inputs:metallic = 0
                token outputs:surface
            }
        }
    }
}
`;
  return zipStored([
    { name: 'painting.usda', data: Buffer.from(usda) },
    { name: 'textures/artwork.jpg', data: jpeg },
  ]);
}
