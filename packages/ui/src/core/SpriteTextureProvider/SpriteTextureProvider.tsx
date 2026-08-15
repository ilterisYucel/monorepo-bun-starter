import React, { createContext, useContext, useEffect, useState } from "react";
import { Assets, Rectangle, Texture } from "pixi.js";
import type { ReactNode } from "react";
import type { SpriteAssetMeta } from "../../graphics/textures";

interface SpriteTextureContextValue {
  readonly textures: ReadonlyMap<string, Texture>;
}

const SpriteTextureContext = createContext<SpriteTextureContextValue>({ textures: new Map() });

export interface SpriteTextureProviderProps {
  assets: Readonly<Record<string, SpriteAssetMeta>>;
  children: ReactNode;
}

export const SpriteTextureProvider: React.FC<SpriteTextureProviderProps> = ({ assets, children }) => {
  const [textures, setTextures] = useState<ReadonlyMap<string, Texture>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const entries = Object.values(assets);

    Promise.allSettled(
      entries.map(async (asset): Promise<readonly [string, Texture]> => {
        const loaded = await Assets.load<Texture>(asset.url);
        const frame = asset.frame;
        const texture = new Texture({
          source: loaded.source,
          frame: new Rectangle(frame.x, frame.y, frame.width, frame.height),
        });
        return [asset.key, texture] as const;
      }),
    ).then((results) => {
      if (cancelled) return;
      const map = new Map<string, Texture>();
      for (const result of results) {
        if (result.status === "fulfilled") {
          map.set(result.value[0], result.value[1]);
        }
      }
      setTextures(map);
    });

    return () => {
      cancelled = true;
    };
  }, [assets]);

  const value = React.useMemo(() => ({ textures }), [textures]);

  return <SpriteTextureContext.Provider value={value}>{children}</SpriteTextureContext.Provider>;
};

SpriteTextureProvider.displayName = "SpriteTextureProvider";

export function useSpriteTexture(key: string): Texture | undefined {
  const ctx = useContext(SpriteTextureContext);
  return ctx.textures.get(key);
}
