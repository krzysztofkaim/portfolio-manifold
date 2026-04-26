import { describe, expect, it, vi } from 'vitest';
import { disposeObject } from '../../../src/engine/dispose';
import { Texture } from 'three';

// Mock Three.js classes
vi.mock('three', () => ({
  Texture: class {
    dispose = vi.fn();
  },
  Object3D: class {
    traverse = vi.fn().mockImplementation(function(this: any, cb: any) {
      cb(this);
    });
  },
  Material: class {
    dispose = vi.fn();
  }
}));

describe('disposeObject', () => {
  it('disposes geometry and boundsTree if present', () => {
    const mockGeometry = {
      dispose: vi.fn(),
      boundsTree: {},
      disposeBoundsTree: vi.fn(),
    };
    const mockObject = {
      traverse: vi.fn().mockImplementation((cb) => cb({ geometry: mockGeometry })),
    } as any;

    disposeObject(mockObject);

    expect(mockGeometry.disposeBoundsTree).toHaveBeenCalled();
    expect(mockGeometry.dispose).toHaveBeenCalled();
  });

  it('disposes geometry without boundsTree', () => {
    const mockGeometry = {
      dispose: vi.fn(),
    };
    const mockObject = {
      traverse: vi.fn().mockImplementation((cb) => cb({ geometry: mockGeometry })),
    } as any;

    disposeObject(mockObject);

    expect(mockGeometry.dispose).toHaveBeenCalled();
  });

  it('disposes materials and textures', () => {
    const mockTexture = new Texture();
    const mockMaterial = {
      dispose: vi.fn(),
      map: mockTexture, // Property that is an instance of Texture
    } as any;

    const mockObject = {
      traverse: vi.fn().mockImplementation((cb) => cb({ material: mockMaterial })),
    } as any;

    disposeObject(mockObject);

    expect(mockTexture.dispose).toHaveBeenCalled();
    expect(mockMaterial.dispose).toHaveBeenCalled();
  });

  it('disposes array of materials', () => {
    const mockMaterials = [
      { dispose: vi.fn() },
      { dispose: vi.fn() },
    ] as any;

    const mockObject = {
      traverse: vi.fn().mockImplementation((cb) => cb({ material: mockMaterials })),
    } as any;

    disposeObject(mockObject);

    expect(mockMaterials[0].dispose).toHaveBeenCalled();
    expect(mockMaterials[1].dispose).toHaveBeenCalled();
  });

  it('handles child without geometry or material', () => {
    const mockObject = {
      traverse: vi.fn().mockImplementation((cb) => cb({})),
    } as any;

    // Should not throw
    expect(() => disposeObject(mockObject)).not.toThrow();
  });
});
