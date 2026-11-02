import { ImageAsset, Texture2D, SpriteFrame } from 'cc';
import { AnimalType, SpecialType } from './Types';
import { ArtKey, VisualAssets } from './VisualAssets';

/** 将完整的原创 PNG/JPEG 资源转换成 Cocos SpriteFrame。每种道具都是独立图块。 */
export class ArtFactory {
    private static cache: Map<string, SpriteFrame> = new Map();

    private static frame(key: ArtKey, width: number = 256, height: number = 256, alpha: number = 1): SpriteFrame {
        const cacheKey = `${key}_${alpha}`;
        const existing = this.cache.get(cacheKey);
        if (existing) return existing;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        const image = VisualAssets.getImage(key);
        if (image) {
            ctx.globalAlpha = alpha;
            ctx.drawImage(image, 0, 0, width, height);
        }
        const texture = new Texture2D();
        texture.image = new ImageAsset(canvas);
        const spriteFrame = new SpriteFrame();
        spriteFrame.texture = texture;
        this.cache.set(cacheKey, spriteFrame);
        return spriteFrame;
    }

    public static getTileSprite(type: AnimalType, special: SpecialType): SpriteFrame {
        const specials: Partial<Record<SpecialType, ArtKey>> = {
            [SpecialType.HORIZONTAL]: 'special_horizontal',
            [SpecialType.VERTICAL]: 'special_vertical',
            [SpecialType.BOMB]: 'special_bomb',
            [SpecialType.RAINBOW]: 'special_rainbow',
        };
        if (special !== SpecialType.NONE) return this.frame(specials[special]!);
        const animals: ArtKey[] = ['chicken', 'frog', 'bear', 'fox', 'owl'];
        return this.frame(animals[type] || 'bear');
    }

    public static getIceSprite(level: number): SpriteFrame {
        return this.frame('ice', 256, 256, level >= 2 ? 1 : 0.72);
    }

    public static getVineSprite(): SpriteFrame {
        return this.frame('vine');
    }

    public static getBackgroundSprite(): SpriteFrame {
        return this.frame('background', 750, 1334);
    }
}
