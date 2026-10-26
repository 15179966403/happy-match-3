import { Color, Graphics } from 'cc';
import { AnimalType, SpecialType, GAME_CONFIG } from './Types';

/**
 * 纯矢量矢量可爱小动物绘制器
 * 无需外部图片，自包含，画质高清无锯齿
 */
export class TileRenderer {

    // 基础主题颜色
    public static readonly COLORS = {
        [AnimalType.CHICKEN]: { main: new Color(255, 208, 0), dark: new Color(230, 160, 0) }, // 黄
        [AnimalType.FROG]:    { main: new Color(76, 217, 100), dark: new Color(40, 170, 70) },  // 绿
        [AnimalType.BEAR]:    { main: new Color(52, 170, 245), dark: new Color(20, 120, 210) }, // 蓝
        [AnimalType.FOX]:     { main: new Color(255, 105, 70), dark: new Color(210, 60, 30) },  // 橙红
        [AnimalType.OWL]:     { main: new Color(175, 82, 222), dark: new Color(130, 45, 180) }, // 紫
        [AnimalType.HIPPO]:   { main: new Color(255, 159, 10), dark: new Color(215, 110, 0) },  // 橙
    };

    /**
     * 绘制动物图块完整外观
     */
    public static render(g: Graphics, type: AnimalType, special: SpecialType, isSelected: boolean = false) {
        g.clear();
        const size = GAME_CONFIG.TILE_SIZE;
        const half = size / 2;
        const rad = 14;

        // 1. 如果是普通动物或带条纹/炸弹的动物
        if (special !== SpecialType.RAINBOW) {
            const theme = this.COLORS[type] || this.COLORS[AnimalType.CHICKEN];

            // 绘制圆角底托 / 身体
            g.fillColor = isSelected ? new Color(255, 255, 255, 255) : theme.main;
            g.strokeColor = isSelected ? new Color(255, 215, 0, 255) : theme.dark;
            g.lineWidth = isSelected ? 4 : 2;
            g.roundRect(-half + 3, -half + 3, size - 6, size - 6, rad);
            g.fill();
            g.stroke();

            // 内部高光浅弧
            g.fillColor = new Color(255, 255, 255, 70);
            g.ellipse(0, half - 12, half - 10, 6);
            g.fill();

            // 绘制具体的五官表情
            switch (type) {
                case AnimalType.CHICKEN:
                    this.drawChicken(g, half);
                    break;
                case AnimalType.FROG:
                    this.drawFrog(g, half);
                    break;
                case AnimalType.BEAR:
                    this.drawBear(g, half);
                    break;
                case AnimalType.FOX:
                    this.drawFox(g, half);
                    break;
                case AnimalType.OWL:
                    this.drawOwl(g, half);
                    break;
                default:
                    this.drawBear(g, half);
                    break;
            }
        } else {
            // 魔力鸟 / 彩虹球 (RAINBOW)
            this.drawRainbowBird(g, half, isSelected);
        }

        // 2. 特效装饰层
        if (special === SpecialType.HORIZONTAL) {
            this.drawHorizontalStripes(g, half);
        } else if (special === SpecialType.VERTICAL) {
            this.drawVerticalStripes(g, half);
        } else if (special === SpecialType.BOMB) {
            this.drawBombAura(g, half);
        }
    }

    /**
     * 黄色小鸡
     */
    private static drawChicken(g: Graphics, half: number) {
        // 红鸡冠
        g.fillColor = new Color(245, 60, 60);
        g.circle(0, half - 7, 5);
        g.circle(-4, half - 9, 3.5);
        g.circle(4, half - 9, 3.5);
        g.fill();

        // 眼睛
        g.fillColor = new Color(30, 30, 30);
        g.circle(-9, 3, 3.5);
        g.circle(9, 3, 3.5);
        g.fill();
        // 眼睛反光
        g.fillColor = new Color(255, 255, 255);
        g.circle(-8, 4.5, 1.3);
        g.circle(10, 4.5, 1.3);
        g.fill();

        // 橙色三角小嘴
        g.fillColor = new Color(255, 120, 10);
        g.moveTo(0, 3);
        g.lineTo(-6, -4);
        g.lineTo(6, -4);
        g.close();
        g.fill();

        // 腮红
        g.fillColor = new Color(255, 100, 100, 120);
        g.circle(-14, -2, 4);
        g.circle(14, -2, 4);
        g.fill();
    }

    /**
     * 绿色青蛙
     */
    private static drawFrog(g: Graphics, half: number) {
        // 大凸起眼球底
        g.fillColor = new Color(255, 255, 255);
        g.strokeColor = new Color(40, 170, 70);
        g.lineWidth = 1.5;
        g.circle(-11, 10, 8.5);
        g.circle(11, 10, 8.5);
        g.fill();
        g.stroke();

        // 黑眼珠
        g.fillColor = new Color(30, 30, 30);
        g.circle(-10, 10, 4.5);
        g.circle(10, 10, 4.5);
        g.fill();
        // 高光
        g.fillColor = new Color(255, 255, 255);
        g.circle(-9, 11.5, 1.8);
        g.circle(11, 11.5, 1.8);
        g.fill();

        // 微笑大嘴弧线
        g.strokeColor = new Color(30, 120, 50);
        g.lineWidth = 2.5;
        g.moveTo(-10, -5);
        g.quadraticCurveTo(0, -14, 10, -5);
        g.stroke();

        // 粉腮红
        g.fillColor = new Color(255, 130, 150, 130);
        g.circle(-15, -4, 4);
        g.circle(15, -4, 4);
        g.fill();
    }

    /**
     * 蓝色小熊
     */
    private static drawBear(g: Graphics, half: number) {
        // 圆耳朵
        g.fillColor = new Color(52, 170, 245);
        g.circle(-16, 14, 7);
        g.circle(16, 14, 7);
        g.fill();
        // 耳窝粉色
        g.fillColor = new Color(255, 200, 220);
        g.circle(-16, 14, 3.5);
        g.circle(16, 14, 3.5);
        g.fill();

        // 眼睛
        g.fillColor = new Color(30, 30, 30);
        g.circle(-10, 3, 3.2);
        g.circle(10, 3, 3.2);
        g.fill();

        // 白色口鼻椭圆区
        g.fillColor = new Color(255, 255, 255);
        g.ellipse(0, -6, 10, 7);
        g.fill();

        // 黑色小倒三角鼻子
        g.fillColor = new Color(40, 40, 40);
        g.moveTo(-3, -3);
        g.lineTo(3, -3);
        g.lineTo(0, -6);
        g.close();
        g.fill();
    }

    /**
     * 红色小狐狸
     */
    private static drawFox(g: Graphics, half: number) {
        // 尖耳朵
        g.fillColor = new Color(255, 105, 70);
        g.moveTo(-18, 5);
        g.lineTo(-12, 18);
        g.lineTo(-6, 8);
        g.close();
        g.fill();

        g.moveTo(18, 5);
        g.lineTo(12, 18);
        g.lineTo(6, 8);
        g.close();
        g.fill();

        // 内耳浅黄
        g.fillColor = new Color(255, 240, 200);
        g.moveTo(-16, 6);
        g.lineTo(-12, 15);
        g.lineTo(-8, 8);
        g.close();
        g.fill();
        g.moveTo(16, 6);
        g.lineTo(12, 15);
        g.lineTo(8, 8);
        g.close();
        g.fill();

        // 白色脸颊胡须
        g.fillColor = new Color(255, 250, 240);
        g.ellipse(0, -8, 14, 8);
        g.fill();

        // 眼睛
        g.fillColor = new Color(30, 30, 30);
        g.circle(-9, 4, 3.2);
        g.circle(9, 4, 3.2);
        g.fill();

        // 黑色小尖鼻
        g.circle(0, -6, 2.5);
        g.fill();
    }

    /**
     * 紫色猫头鹰
     */
    private static drawOwl(g: Graphics, half: number) {
        // 头顶羽毛角
        g.fillColor = new Color(140, 50, 190);
        g.moveTo(-14, 10);
        g.lineTo(-10, 18);
        g.lineTo(-6, 12);
        g.close();
        g.fill();

        g.moveTo(14, 10);
        g.lineTo(10, 18);
        g.lineTo(6, 12);
        g.close();
        g.fill();

        // 大圆眼镜框
        g.fillColor = new Color(255, 255, 255);
        g.circle(-9, 3, 8);
        g.circle(9, 3, 8);
        g.fill();

        // 瞳孔
        g.fillColor = new Color(40, 40, 40);
        g.circle(-9, 3, 4.5);
        g.circle(9, 3, 4.5);
        g.fill();

        // 反光
        g.fillColor = new Color(255, 255, 255);
        g.circle(-7.5, 4.5, 1.8);
        g.circle(10.5, 4.5, 1.8);
        g.fill();

        // 黄色三角尖喙
        g.fillColor = new Color(255, 200, 20);
        g.moveTo(0, 1);
        g.lineTo(-4, -6);
        g.lineTo(4, -6);
        g.close();
        g.fill();
    }

    /**
     * 魔力鸟 / 彩虹球 (Rainbow Bird)
     */
    private static drawRainbowBird(g: Graphics, half: number, isSelected: boolean) {
        // 主球体 (炫彩深邃渐变底)
        g.fillColor = new Color(45, 30, 75);
        g.strokeColor = isSelected ? new Color(255, 255, 255) : new Color(255, 215, 0);
        g.lineWidth = 3.5;
        g.circle(0, 0, half - 6);
        g.fill();
        g.stroke();

        // 七彩同心环光彩
        const ringColors = [
            new Color(255, 80, 80, 200),
            new Color(255, 200, 50, 200),
            new Color(80, 220, 100, 200),
            new Color(60, 170, 255, 200),
            new Color(200, 100, 255, 200),
        ];

        ringColors.forEach((color, i) => {
            g.strokeColor = color;
            g.lineWidth = 2.5;
            g.circle(0, 0, (half - 10) - i * 3);
            g.stroke();
        });

        // 中心闪耀金星
        this.drawStar(g, 0, 0, 4, 11, 5, new Color(255, 245, 140));
    }

    /**
     * 绘制五角星或四角闪耀星
     */
    private static drawStar(g: Graphics, cx: number, cy: number, spikes: number, outerRad: number, innerRad: number, color: Color) {
        g.fillColor = color;
        let rot = (Math.PI / 2) * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        g.moveTo(cx, cy - outerRad);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRad;
            y = cy + Math.sin(rot) * outerRad;
            g.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRad;
            y = cy + Math.sin(rot) * innerRad;
            g.lineTo(x, y);
            rot += step;
        }
        g.lineTo(cx, cy - outerRad);
        g.close();
        g.fill();
    }

    /**
     * 横向条纹特效光带
     */
    private static drawHorizontalStripes(g: Graphics, half: number) {
        g.fillColor = new Color(255, 255, 255, 180);
        g.rect(-half + 4, -4, (half - 4) * 2, 8);
        g.fill();

        // 左右白色发光小箭头
        g.fillColor = new Color(255, 255, 255, 230);
        g.moveTo(-half + 5, 0);
        g.lineTo(-half + 11, 5);
        g.lineTo(-half + 11, -5);
        g.close();
        g.fill();

        g.moveTo(half - 5, 0);
        g.lineTo(half - 11, 5);
        g.lineTo(half - 11, -5);
        g.close();
        g.fill();
    }

    /**
     * 纵向条纹特效光带
     */
    private static drawVerticalStripes(g: Graphics, half: number) {
        g.fillColor = new Color(255, 255, 255, 180);
        g.rect(-4, -half + 4, 8, (half - 4) * 2);
        g.fill();

        // 上下白色发光小箭头
        g.fillColor = new Color(255, 255, 255, 230);
        g.moveTo(0, half - 5);
        g.lineTo(5, half - 11);
        g.lineTo(-5, half - 11);
        g.close();
        g.fill();

        g.moveTo(0, -half + 5);
        g.lineTo(5, -half + 11);
        g.lineTo(-5, -half + 11);
        g.close();
        g.fill();
    }

    /**
     * 炸弹范围包裹光环
     */
    private static drawBombAura(g: Graphics, half: number) {
        // 闪耀光环边框
        g.strokeColor = new Color(255, 230, 60, 220);
        g.lineWidth = 3.5;
        g.roundRect(-half + 1, -half + 1, half * 2 - 2, half * 2 - 2, 16);
        g.stroke();

        // 右上角点缀闪烁小火花
        this.drawStar(g, half - 6, half - 6, 4, 6, 2.5, new Color(255, 80, 20));
    }
}
