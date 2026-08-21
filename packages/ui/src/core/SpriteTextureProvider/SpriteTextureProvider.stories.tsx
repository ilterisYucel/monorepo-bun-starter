import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { SpriteTextureProvider, useSpriteTexture } from "./SpriteTextureProvider";
import { SPRITE_ASSETS } from "../../graphics/textures";
import { COLORS } from "../../colors";

const meta: Meta<typeof SpriteTextureProvider> = {
  title: "Core/SpriteTextureProvider",
  component: SpriteTextureProvider,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof SpriteTextureProvider>;

const TextureStatus: React.FC = () => {
  const keys = Object.keys(SPRITE_ASSETS);
  return (
    <div style={{ padding: 24, background: COLORS.bgCard, borderRadius: 12 }}>
      <h3 style={{ color: COLORS.textWhite, margin: 0, fontSize: 14 }}>
        Sprite Yükleme Durumu ({keys.length} varlık)
      </h3>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
        {keys.map((key) => (
          <TextureRow key={key} assetKey={key} />
        ))}
      </ul>
    </div>
  );
};

const TextureRow: React.FC<{ assetKey: string }> = ({ assetKey }) => {
  const texture = useSpriteTexture(assetKey);
  return (
    <li
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: `1px solid ${COLORS.borderDefault}`,
        color: texture ? COLORS.success : COLORS.textMuted,
        fontSize: 13,
      }}
    >
      <span>{assetKey}</span>
      <span>{texture ? "yüklendi" : "yükleniyor/fallback"}</span>
    </li>
  );
};

export const LoadStatus: Story = {
  render: () => (
    <SpriteTextureProvider assets={SPRITE_ASSETS}>
      <TextureStatus />
    </SpriteTextureProvider>
  ),
};
