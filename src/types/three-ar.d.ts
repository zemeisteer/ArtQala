// The two three.js add-ons WallPreviewModal uses (only on iPhone/iPad, to
// turn the painting's .glb into a wall-anchored USDZ for Quick Look).
declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  export class GLTFLoader {
    loadAsync(url: string): Promise<{ scene: unknown }>;
  }
}

declare module 'three/examples/jsm/exporters/USDZExporter.js' {
  export class USDZExporter {
    parseAsync(
      scene: unknown,
      options?: {
        ar?: { anchoring: { type: 'plane' }; planeAnchoring: { alignment: 'horizontal' | 'vertical' | 'any' } };
        quickLookCompatible?: boolean;
        maxTextureSize?: number;
      }
    ): Promise<ArrayBuffer>;
  }
}
