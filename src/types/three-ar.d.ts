// The two three.js add-ons WallPreviewModal uses (only on iPhone/iPad, to
// turn the painting's .glb into a wall-anchored USDZ for Quick Look).
declare module 'three' {
  export class Group {
    add(object: unknown): this;
    updateMatrixWorld(force?: boolean): void;
  }
}

declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  export class GLTFLoader {
    loadAsync(url: string): Promise<{ scene: { rotation: { x: number } } }>;
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
