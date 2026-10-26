import { ImageAsset, Texture2D, SpriteFrame } from 'cc';
import { AnimalType, SpecialType } from './Types';

/**
 * 工业级 Q 弹果冻糖果萌宠艺术工坊 (ArtFactory)
 * 启动时瞬时烘焙 256x256 视网膜级超清贴图
 * 具备多层径向球体光影、果冻水滴高光、水汪汪大眼睛与丰富立体质感
 */
export class ArtFactory {
    private static cache: Map<string, SpriteFrame> = new Map();

    /**
     * 获取指定动物与特效的高清精致 SpriteFrame
     */
    public static getTileSprite(type: AnimalType, special: SpecialType): SpriteFrame {
        const key = `${type}_${special}`;
        if (this.cache.has(key)) {
            return this.cache.get(key)!;
        }

        const size = 256; // 视网膜级超高采样率
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // 绘制果冻动物
        if (special === SpecialType.RAINBOW) {
            this.drawRainbowBird(ctx, size);
        } else {
            this.drawJellyAnimal(ctx, size, type);
        }

        // 绘制特殊特效图层
        if (special === SpecialType.HORIZONTAL) {
            this.drawHorizontalBeam(ctx, size);
        } else if (special === SpecialType.VERTICAL) {
            this.drawVerticalBeam(ctx, size);
        } else if (special === SpecialType.BOMB) {
            this.drawBombAura(ctx, size);
        }

        // 转为 Cocos 3.8 专用的 SpriteFrame
        const imgAsset = new ImageAsset(canvas);
        const texture = new Texture2D();
        texture.image = imgAsset;
        const sf = new SpriteFrame();
        sf.texture = texture;

        this.cache.set(key, sf);
        return sf;
    }

    /**
     * 获取冰块纹理 (level: 1 薄冰, 2 厚冰)
     */
    public static getIceSprite(level: number): SpriteFrame {
        const key = `ice_${level}`;
        if (this.cache.has(key)) return this.cache.get(key)!;

        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        const pad = 12;
        const w = size - pad * 2;
        const h = size - pad * 2;
        const rad = 28;

        ctx.save();
        // 冰块晶莹底托
        const isThick = level >= 2;
        const grad = ctx.createLinearGradient(pad, pad, size - pad, size - pad);
        if (isThick) {
            grad.addColorStop(0, 'rgba(235, 250, 255, 0.92)');
            grad.addColorStop(0.5, 'rgba(165, 215, 255, 0.82)');
            grad.addColorStop(1, 'rgba(120, 185, 245, 0.88)');
        } else {
            grad.addColorStop(0, 'rgba(240, 252, 255, 0.72)');
            grad.addColorStop(0.6, 'rgba(180, 230, 255, 0.55)');
            grad.addColorStop(1, 'rgba(140, 210, 250, 0.65)');
        }

        ctx.beginPath();
        ctx.roundRect(pad, pad, w, h, rad);
        ctx.fillStyle = grad;
        ctx.fill();

        // 冰晶高光边框
        ctx.lineWidth = isThick ? 6 : 4;
        ctx.strokeStyle = isThick ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.8)';
        ctx.stroke();

        // 冰块内部冰裂纹与晶花
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        // 左上到中央折裂纹
        ctx.moveTo(pad + 30, pad + 35);
        ctx.lineTo(size * 0.42, size * 0.38);
        ctx.lineTo(size * 0.52, size * 0.55);
        if (isThick) {
            ctx.lineTo(size * 0.75, size * 0.62);
            ctx.lineTo(size - pad - 25, size * 0.82);
            // 次级裂纹
            ctx.moveTo(size * 0.42, size * 0.38);
            ctx.lineTo(size * 0.35, size * 0.68);
            ctx.moveTo(size * 0.52, size * 0.55);
            ctx.lineTo(size * 0.68, size * 0.35);
        }
        ctx.stroke();

        // 四角冰晶小雪花/十字星芒
        this.drawIceStar(ctx, pad + 36, pad + 36, 12);
        this.drawIceStar(ctx, size - pad - 36, size - pad - 36, 10);
        if (isThick) {
            this.drawIceStar(ctx, size - pad - 42, pad + 40, 14);
        }

        ctx.restore();

        const imgAsset = new ImageAsset(canvas);
        const texture = new Texture2D();
        texture.image = imgAsset;
        const sf = new SpriteFrame();
        sf.texture = texture;
        this.cache.set(key, sf);
        return sf;
    }

    /**
     * 获取荆棘藤蔓锁定纹理
     */
    public static getVineSprite(): SpriteFrame {
        const key = 'vine_lock';
        if (this.cache.has(key)) return this.cache.get(key)!;

        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        const cx = size / 2;
        const cy = size / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;

        // 粗壮荆棘交叉藤条 (从四角向中心交叉)
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#27ae60';

        // 枝条 1：左上到右下
        ctx.beginPath();
        ctx.moveTo(35, 45);
        ctx.quadraticCurveTo(cx - 15, cy + 10, size - 35, size - 45);
        ctx.stroke();

        // 枝条 2：右上到左下
        ctx.beginPath();
        ctx.moveTo(size - 35, 45);
        ctx.quadraticCurveTo(cx + 15, cy - 10, 35, size - 45);
        ctx.stroke();

        // 深绿阴影内芯
        ctx.lineWidth = 7;
        ctx.strokeStyle = '#1e824c';
        ctx.beginPath();
        ctx.moveTo(35, 45);
        ctx.quadraticCurveTo(cx - 15, cy + 10, size - 35, size - 45);
        ctx.moveTo(size - 35, 45);
        ctx.quadraticCurveTo(cx + 15, cy - 10, 35, size - 45);
        ctx.stroke();

        // 中心木质荆棘结扣
        ctx.beginPath();
        ctx.arc(cx, cy, 16, 0, Math.PI * 2);
        ctx.fillStyle = '#145a32';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        ctx.fillStyle = '#2ecc71';
        ctx.fill();

        // 点缀鲜嫩小绿叶
        this.drawLeaf(ctx, 65, 75, -0.6);
        this.drawLeaf(ctx, size - 65, 80, 0.7);
        this.drawLeaf(ctx, 75, size - 85, 2.2);
        this.drawLeaf(ctx, size - 75, size - 80, -2.4);
        this.drawLeaf(ctx, cx, cy - 35, 0.1);

        ctx.restore();

        const imgAsset = new ImageAsset(canvas);
        const texture = new Texture2D();
        texture.image = imgAsset;
        const sf = new SpriteFrame();
        sf.texture = texture;
        this.cache.set(key, sf);
        return sf;
    }

    private static drawIceStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x - r, y);
        ctx.lineTo(x + r, y);
        ctx.moveTo(x, y - r);
        ctx.lineTo(x, y + r);
        ctx.moveTo(x - r * 0.6, y - r * 0.6);
        ctx.lineTo(x + r * 0.6, y + r * 0.6);
        ctx.moveTo(x + r * 0.6, y - r * 0.6);
        ctx.lineTo(x - r * 0.6, y + r * 0.6);
        ctx.stroke();
        ctx.restore();
    }

    private static drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(12, -10, 22, 0);
        ctx.quadraticCurveTo(12, 10, 0, 0);
        ctx.fillStyle = '#2ecc71';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(16, 0);
        ctx.stroke();
        ctx.restore();
    }
    private static drawJellyAnimal(ctx: CanvasRenderingContext2D, size: number, type: AnimalType) {
        const cx = size / 2;
        const cy = size / 2;
        const r = size * 0.41;

        // 获取该动物的治愈系糖果配色
        const palette = this.getPalette(type);

        // 1. 底层柔和环境光阴影 (Drop Shadow)
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 10;

        // 绘制圆角果冻外形 (略带下沉微胖的可爱梨形/水滴圆)
        ctx.beginPath();
        this.drawPlumpBody(ctx, cx, cy, r);
        ctx.fillStyle = palette.dark;
        ctx.fill();
        ctx.restore();

        // 2. 身体主球体立体球形渐变 (光源位于左上方)
        ctx.save();
        ctx.beginPath();
        this.drawPlumpBody(ctx, cx, cy, r);
        ctx.clip();

        const lightX = cx - r * 0.35;
        const lightY = cy - r * 0.35;
        const radGrad = ctx.createRadialGradient(lightX, lightY, r * 0.1, cx, cy, r * 1.05);
        radGrad.addColorStop(0, palette.light);
        radGrad.addColorStop(0.45, palette.main);
        radGrad.addColorStop(1, palette.dark);

        ctx.fillStyle = radGrad;
        ctx.fill();

        // 3. 底部次表面散射反光 (Subsurface Scattering / Rim Light)
        const rimGrad = ctx.createRadialGradient(cx, cy + r * 0.75, r * 0.1, cx, cy + r * 0.75, r * 0.85);
        rimGrad.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
        rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = rimGrad;
        ctx.fill();

        // 4. 顶部晶莹玻璃月牙高光 (Glass / Jelly Highlight)
        ctx.beginPath();
        ctx.ellipse(cx, cy - r * 0.48, r * 0.62, r * 0.32, -0.05, 0, Math.PI * 2);
        const glassGrad = ctx.createLinearGradient(cx, cy - r * 0.8, cx, cy - r * 0.15);
        glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
        glassGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
        glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glassGrad;
        ctx.fill();

        // 5. 左上方小水珠反光点
        ctx.beginPath();
        ctx.arc(cx - r * 0.45, cy - r * 0.45, r * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();

        ctx.restore();

        // 6. 绘制各动物的精致立体五官与装饰
        switch (type) {
            case AnimalType.CHICKEN:
                this.renderCuteChick(ctx, cx, cy, r);
                break;
            case AnimalType.FROG:
                this.renderCuteFrog(ctx, cx, cy, r);
                break;
            case AnimalType.BEAR:
                this.renderCuteBear(ctx, cx, cy, r);
                break;
            case AnimalType.FOX:
                this.renderCuteFox(ctx, cx, cy, r);
                break;
            case AnimalType.OWL:
                this.renderCuteOwl(ctx, cx, cy, r);
                break;
            default:
                this.renderCuteBear(ctx, cx, cy, r);
                break;
        }
    }

    /**
     * 微胖水滴果冻形轮廓
     */
    private static drawPlumpBody(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }

    // ==================== 萌宠具体五官绘制 ====================

    /**
     * 🐥 嘟嘟黄小鸡 (甜心柠檬布丁风)
     */
    private static renderCuteChick(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
        // 头顶小红爱心鸡冠
        ctx.save();
        ctx.fillStyle = '#ff3b30';
        ctx.shadowColor = 'rgba(255, 59, 48, 0.4)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(cx - 10, cy - r + 4, 13, 0, Math.PI * 2);
        ctx.arc(cx + 8, cy - r + 7, 10, 0, Math.PI * 2);
        ctx.arc(cx, cy - r - 2, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 扑闪扑闪大眼睛
        this.drawSparkleEye(ctx, cx - r * 0.36, cy - r * 0.05, 14);
        this.drawSparkleEye(ctx, cx + r * 0.36, cy - r * 0.05, 14);

        // 软糯蜜桃腮红 (心形/柔和椭圆)
        this.drawBlush(ctx, cx - r * 0.52, cy + r * 0.18, 16, 10, 'rgba(255, 95, 105, 0.45)');
        this.drawBlush(ctx, cx + r * 0.52, cy + r * 0.18, 16, 10, 'rgba(255, 95, 105, 0.45)');

        // 肉嘟嘟小红心翘嘴 (立体小鸟嘴)
        ctx.save();
        ctx.fillStyle = '#ff7a00';
        ctx.shadowColor = 'rgba(255, 122, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 2);
        ctx.quadraticCurveTo(cx + 16, cy + 8, cx, cy + 18);
        ctx.quadraticCurveTo(cx - 16, cy + 8, cx, cy - 2);
        ctx.fill();

        // 嘴巴小高光
        ctx.beginPath();
        ctx.ellipse(cx, cy + 5, 6, 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
        ctx.restore();
    }

    /**
     * 🐸 波波蛙 (抹茶青苹果冻风)
     */
    private static renderCuteFrog(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
        // 头顶两只圆润立体大眼窝
        const eyeOffset = r * 0.48;
        const eyeY = cy - r * 0.65;
        const eyeRadius = 24;

        // 左眼窝
        ctx.beginPath();
        ctx.arc(cx - eyeOffset, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#4cd964';
        ctx.fill();

        // 右眼窝
        ctx.beginPath();
        ctx.arc(cx + eyeOffset, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#4cd964';
        ctx.fill();

        // 眼球内嵌大黑瞳孔与闪光
        this.drawSparkleEye(ctx, cx - eyeOffset, eyeY + 2, 17);
        this.drawSparkleEye(ctx, cx + eyeOffset, eyeY + 2, 17);

        // 微笑大弧线嘴巴
        ctx.beginPath();
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1b7a2b';
        ctx.arc(cx, cy + 4, r * 0.32, 0.25 * Math.PI, 0.75 * Math.PI);
        ctx.stroke();

        // 腮红
        this.drawBlush(ctx, cx - r * 0.42, cy + 12, 14, 9, 'rgba(255, 130, 80, 0.5)');
        this.drawBlush(ctx, cx + r * 0.42, cy + 12, 14, 9, 'rgba(255, 130, 80, 0.5)');
    }

    /**
     * 🐻 泡泡熊 (海盐奶盖蓝莓风)
     */
    private static renderCuteBear(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
        // 立体圆耳朵
        const earX = r * 0.68;
        const earY = cy - r * 0.65;
        const earR = 26;

        // 左耳
        ctx.beginPath();
        ctx.arc(cx - earX, earY, earR, 0, Math.PI * 2);
        ctx.fillStyle = '#34aadc';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - earX, earY, earR * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = '#ffccd5';
        ctx.fill();

        // 右耳
        ctx.beginPath();
        ctx.arc(cx + earX, earY, earR, 0, Math.PI * 2);
        ctx.fillStyle = '#34aadc';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + earX, earY, earR * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = '#ffccd5';
        ctx.fill();

        // 纯白立体口鼻包
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 14, r * 0.4, r * 0.28, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();

        // 巧克力小鼻头
        ctx.beginPath();
        ctx.arc(cx, cy + 6, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = '#223344';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - 2, cy + 4, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 倒三瓣唇
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#223344';
        ctx.moveTo(cx, cy + 13);
        ctx.lineTo(cx, cy + 20);
        ctx.stroke();

        // 眼睛
        this.drawSparkleEye(ctx, cx - r * 0.38, cy - 2, 13);
        this.drawSparkleEye(ctx, cx + r * 0.38, cy - 2, 13);

        // 浅粉腮红
        this.drawBlush(ctx, cx - r * 0.48, cy + 16, 12, 7, 'rgba(255, 120, 160, 0.4)');
        this.drawBlush(ctx, cx + r * 0.48, cy + 16, 12, 7, 'rgba(255, 120, 160, 0.4)');
    }

    /**
     * 🦊 小暖狐 (蜜桃枫糖甜心风)
     */
    private static renderCuteFox(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
        // 立体尖耳朵
        const earOffset = r * 0.62;
        const earBaseY = cy - r * 0.4;
        const earTipY = cy - r * 1.05;

        // 左耳
        ctx.beginPath();
        ctx.moveTo(cx - earOffset - 18, earBaseY);
        ctx.lineTo(cx - earOffset + 8, earTipY);
        ctx.lineTo(cx - earOffset + 24, earBaseY + 10);
        ctx.closePath();
        ctx.fillStyle = '#ff6b4a';
        ctx.fill();
        // 左耳内毛
        ctx.beginPath();
        ctx.moveTo(cx - earOffset - 10, earBaseY - 2);
        ctx.lineTo(cx - earOffset + 6, earTipY + 16);
        ctx.lineTo(cx - earOffset + 16, earBaseY + 4);
        ctx.closePath();
        ctx.fillStyle = '#fff4e6';
        ctx.fill();

        // 右耳
        ctx.beginPath();
        ctx.moveTo(cx + earOffset + 18, earBaseY);
        ctx.lineTo(cx + earOffset - 8, earTipY);
        ctx.lineTo(cx + earOffset - 24, earBaseY + 10);
        ctx.closePath();
        ctx.fillStyle = '#ff6b4a';
        ctx.fill();
        // 右耳内毛
        ctx.beginPath();
        ctx.moveTo(cx + earOffset + 10, earBaseY - 2);
        ctx.lineTo(cx + earOffset - 6, earTipY + 16);
        ctx.lineTo(cx + earOffset - 16, earBaseY + 4);
        ctx.closePath();
        ctx.fillStyle = '#fff4e6';
        ctx.fill();

        // 脸颊两侧雪白蓬松毛弧
        ctx.beginPath();
        ctx.ellipse(cx - r * 0.35, cy + 16, r * 0.3, r * 0.22, -0.2, 0, Math.PI * 2);
        ctx.ellipse(cx + r * 0.35, cy + 16, r * 0.3, r * 0.22, 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 眼睛
        this.drawSparkleEye(ctx, cx - r * 0.35, cy - 2, 13);
        this.drawSparkleEye(ctx, cx + r * 0.35, cy - 2, 13);

        // 黑色小纽扣鼻
        ctx.beginPath();
        ctx.arc(cx, cy + 15, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#2d1b18';
        ctx.fill();

        // 腮红
        this.drawBlush(ctx, cx - r * 0.46, cy + 18, 12, 7, 'rgba(255, 80, 100, 0.45)');
        this.drawBlush(ctx, cx + r * 0.46, cy + 18, 12, 7, 'rgba(255, 80, 100, 0.45)');
    }

    /**
     * 🦉 梦梦猫头鹰 (香芋紫夜晶风)
     */
    private static renderCuteOwl(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
        // 头顶两簇灵动羽毛
        ctx.beginPath();
        ctx.moveTo(cx - 24, cy - r + 8);
        ctx.lineTo(cx - 36, cy - r - 12);
        ctx.lineTo(cx - 8, cy - r + 16);
        ctx.closePath();
        ctx.fillStyle = '#9b51e0';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + 24, cy - r + 8);
        ctx.lineTo(cx + 36, cy - r - 12);
        ctx.lineTo(cx + 8, cy - r + 16);
        ctx.closePath();
        ctx.fillStyle = '#9b51e0';
        ctx.fill();

        // 猫头鹰大眼圈镜框底
        const eyeOffset = r * 0.36;
        const eyeY = cy;
        const frameR = 27;

        ctx.beginPath();
        ctx.arc(cx - eyeOffset, eyeY, frameR, 0, Math.PI * 2);
        ctx.arc(cx + eyeOffset, eyeY, frameR, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 萌动黑曜石大眼球
        this.drawSparkleEye(ctx, cx - eyeOffset, eyeY, 19);
        this.drawSparkleEye(ctx, cx + eyeOffset, eyeY, 19);

        // 明黄色宝石尖喙
        ctx.beginPath();
        ctx.moveTo(cx, cy + 2);
        ctx.lineTo(cx - 8, cy + 18);
        ctx.lineTo(cx + 8, cy + 18);
        ctx.closePath();
        ctx.fillStyle = '#ffcc00';
        ctx.fill();

        // 腮红
        this.drawBlush(ctx, cx - r * 0.52, cy + 16, 12, 7, 'rgba(255, 120, 200, 0.5)');
        this.drawBlush(ctx, cx + r * 0.52, cy + 16, 12, 7, 'rgba(255, 120, 200, 0.5)');
    }

    /**
     * 🌈 七彩神圣魔力鸟 (极光流转宝石风)
     */
    private static drawRainbowBird(ctx: CanvasRenderingContext2D, size: number) {
        const cx = size / 2;
        const cy = size / 2;
        const r = size * 0.42;

        // 外层极光流彩圆盘
        ctx.save();
        ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
        ctx.shadowBlur = 24;

        // 极光渐变背景
        const grad = ctx.createConicGradient ? ctx.createConicGradient(0, cx, cy) : ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
        if ('addColorStop' in grad) {
            grad.addColorStop(0.0, '#ff4757');
            grad.addColorStop(0.2, '#ffa502');
            grad.addColorStop(0.4, '#2ed573');
            grad.addColorStop(0.6, '#1e90ff');
            grad.addColorStop(0.8, '#9b59b6');
            grad.addColorStop(1.0, '#ff4757');
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        // 内部深邃星空水晶球
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
        const innerGrad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 5, cx, cy, r * 0.8);
        innerGrad.addColorStop(0, '#576574');
        innerGrad.addColorStop(0.6, '#222f3e');
        innerGrad.addColorStop(1, '#0a101d');
        ctx.fillStyle = innerGrad;
        ctx.fill();

        // 水晶反光
        ctx.beginPath();
        ctx.ellipse(cx, cy - r * 0.35, r * 0.45, r * 0.22, -0.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fill();
        ctx.restore();

        // 中心超华丽立体四角星芒
        this.drawGoldStar(ctx, cx, cy, 4, r * 0.62, r * 0.22);
    }

    // ==================== 辅助精细图形 ====================

    /**
     * 极具生机与灵气的水汪汪萌系黑眼珠 (两颗反光高光点)
     */
    private static drawSparkleEye(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
        // 主眼珠 (深邃黑)
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1e1c24';
        ctx.fill();

        // 主闪亮大高光
        ctx.beginPath();
        ctx.arc(x - radius * 0.35, y - radius * 0.35, radius * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 次闪亮小高光
        ctx.beginPath();
        ctx.arc(x + radius * 0.38, y + radius * 0.32, radius * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fill();
    }

    /**
     * 晕染粉嫩腮红
     */
    private static drawBlush(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }

    /**
     * 金色立体闪耀星芒
     */
    private static drawGoldStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRad: number, innerRad: number) {
        ctx.save();
        ctx.shadowColor = '#ffd32a';
        ctx.shadowBlur = 16;

        let rot = (Math.PI / 2) * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRad);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRad;
            y = cy + Math.sin(rot) * outerRad;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRad;
            y = cy + Math.sin(rot) * innerRad;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRad);
        ctx.closePath();

        const goldGrad = ctx.createLinearGradient(cx - outerRad, cy - outerRad, cx + outerRad, cy + outerRad);
        goldGrad.addColorStop(0, '#fffbe0');
        goldGrad.addColorStop(0.5, '#ffd32a');
        goldGrad.addColorStop(1, '#ff9f1a');
        ctx.fillStyle = goldGrad;
        ctx.fill();
        ctx.restore();
    }

    // ==================== 特效光束与光环 ====================

    /**
     * 横向条纹穿透光柱
     */
    private static drawHorizontalBeam(ctx: CanvasRenderingContext2D, size: number) {
        const cy = size / 2;
        ctx.save();
        ctx.shadowColor = '#00d2d3';
        ctx.shadowBlur = 12;

        // 贯穿发光能量带
        const beam = ctx.createLinearGradient(0, cy - 14, 0, cy + 14);
        beam.addColorStop(0, 'rgba(255, 255, 255, 0)');
        beam.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
        beam.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = beam;
        ctx.fillRect(8, cy - 14, size - 16, 28);

        // 左右两端发射小光标
        ctx.fillStyle = '#ffffff';
        this.drawArrow(ctx, 24, cy, 14, -1);
        this.drawArrow(ctx, size - 24, cy, 14, 1);
        ctx.restore();
    }

    /**
     * 纵向条纹穿透光柱
     */
    private static drawVerticalBeam(ctx: CanvasRenderingContext2D, size: number) {
        const cx = size / 2;
        ctx.save();
        ctx.shadowColor = '#00d2d3';
        ctx.shadowBlur = 12;

        const beam = ctx.createLinearGradient(cx - 14, 0, cx + 14, 0);
        beam.addColorStop(0, 'rgba(255, 255, 255, 0)');
        beam.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
        beam.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = beam;
        ctx.fillRect(cx - 14, 8, 28, size - 16);

        ctx.fillStyle = '#ffffff';
        this.drawVerticalArrow(ctx, cx, 24, 14, -1);
        this.drawVerticalArrow(ctx, cx, size - 24, 14, 1);
        ctx.restore();
    }

    /**
     * 炸弹华丽能量护盾
     */
    private static drawBombAura(ctx: CanvasRenderingContext2D, size: number) {
        const cx = size / 2;
        const cy = size / 2;
        const r = size * 0.44;

        ctx.save();
        ctx.shadowColor = '#ff9f43';
        ctx.shadowBlur = 16;
        ctx.strokeStyle = '#ffd32a';
        ctx.lineWidth = 8;
        ctx.setLineDash([14, 10]);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // 右上角点缀引燃小火花星
        this.drawGoldStar(ctx, cx + r * 0.7, cy - r * 0.7, 4, 18, 7);
        ctx.restore();
    }

    private static drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dir: number) {
        ctx.beginPath();
        ctx.moveTo(x + s * dir, y);
        ctx.lineTo(x, y - s * 0.7);
        ctx.lineTo(x, y + s * 0.7);
        ctx.closePath();
        ctx.fill();
    }

    private static drawVerticalArrow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dir: number) {
        ctx.beginPath();
        ctx.moveTo(x, y + s * dir);
        ctx.lineTo(x - s * 0.7, y);
        ctx.lineTo(x + s * 0.7, y);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * 各动物的高级治愈糖果调色盘
     */
    private static getPalette(type: AnimalType) {
        switch (type) {
            case AnimalType.CHICKEN: // 柠檬芒果黄
                return { light: '#fff475', main: '#ffcc00', dark: '#f39c12' };
            case AnimalType.FROG:    // 薄荷青苹果绿
                return { light: '#7bed9f', main: '#2ed573', dark: '#1e824c' };
            case AnimalType.BEAR:    // 海盐马卡龙蓝
                return { light: '#70a1ff', main: '#1e90ff', dark: '#0984e3' };
            case AnimalType.FOX:     // 暖心蜜桃红橙
                return { light: '#ff9f7a', main: '#ff6b4a', dark: '#d63031' };
            case AnimalType.OWL:     // 香芋葡萄梦幻紫
                return { light: '#d1a3ff', main: '#9b51e0', dark: '#6c2bb5' };
            default:
                return { light: '#fff475', main: '#ffcc00', dark: '#f39c12' };
        }
    }
}
