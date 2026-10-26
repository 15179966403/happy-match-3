import { _decorator, Component, Node, Sprite, UITransform, tween, Vec3, v3, Tween, Layers } from 'cc';
import { AnimalType, SpecialType, TileData, GAME_CONFIG } from './Types';
import { ArtFactory } from './ArtFactory';

const { ccclass } = _decorator;

@ccclass('TileItem')
export class TileItem extends Component {
    public data: TileData = null!;
    public row: number = 0;
    public col: number = 0;

    private sprite: Sprite = null!;
    private uiTransform: UITransform = null!;
    private selectTween: Tween<Node> | null = null;

    onLoad() {
        this.node.layer = Layers.Enum.UI_2D;
        this.uiTransform = this.getComponent(UITransform) || this.addComponent(UITransform);
        this.uiTransform.setContentSize(GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
        this.sprite = this.getComponent(Sprite) || this.addComponent(Sprite);
        this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    }

    /**
     * 计算指定行列的绝对本地像素坐标
     */
    public static getPos(row: number, col: number): Vec3 {
        const step = GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_GAP;
        const totalW = (GAME_CONFIG.COLS - 1) * step;
        const totalH = (GAME_CONFIG.ROWS - 1) * step;
        const x = -totalW / 2 + col * step;
        const y = -totalH / 2 + row * step;
        return v3(x, y, 0);
    }

    /**
     * 初始化格子数据与位置
     */
    public init(data: TileData) {
        this.data = data;
        this.row = data.row;
        this.col = data.col;
        this.node.setPosition(TileItem.getPos(this.row, this.col));
        this.renderView();
    }

    /**
     * 刷新外观贴图
     */
    public renderView() {
        if (!this.sprite) {
            this.sprite = this.getComponent(Sprite) || this.addComponent(Sprite);
            this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        }
        const sf = ArtFactory.getTileSprite(this.data.type, this.data.special);
        this.sprite.spriteFrame = sf;
    }

    /**
     * 平滑移动到目标行列 (带高级果冻挤压弹性动画)
     */
    public moveTo(targetRow: number, targetCol: number, duration: number = 0.2, bounce: boolean = false): Promise<void> {
        this.row = targetRow;
        this.col = targetCol;
        this.data.row = targetRow;
        this.data.col = targetCol;

        const targetPos = TileItem.getPos(targetRow, targetCol);

        return new Promise((resolve) => {
            Tween.stopAllByTarget(this.node);
            const tw = tween(this.node);

            if (bounce) {
                // 果冻下落落地挤压回弹手感 (Squash & Stretch)
                tw.to(duration * 0.75, { position: targetPos }, { easing: 'quadIn' })
                  .to(0.07, { scale: v3(1.18, 0.82, 1) })
                  .to(0.08, { scale: v3(0.92, 1.08, 1) })
                  .to(0.07, { scale: v3(1, 1, 1) })
                  .call(() => resolve())
                  .start();
            } else {
                tw.to(duration, { position: targetPos }, { easing: 'sineInOut' })
                  .call(() => resolve())
                  .start();
            }
        });
    }

    /**
     * 被选中效果 (Q 弹果冻呼吸脉冲)
     */
    public setSelected(selected: boolean) {
        if (selected) {
            Tween.stopAllByTarget(this.node);
            this.selectTween = tween(this.node)
                .to(0.2, { scale: v3(1.18, 1.18, 1) }, { easing: 'sineOut' })
                .to(0.2, { scale: v3(1.08, 1.08, 1) }, { easing: 'sineIn' })
                .union()
                .repeatForever()
                .start();
        } else {
            if (this.selectTween) {
                this.selectTween.stop();
                this.selectTween = null;
            }
            Tween.stopAllByTarget(this.node);
            tween(this.node)
                .to(0.12, { scale: v3(1, 1, 1) }, { easing: 'backOut' })
                .start();
        }
    }

    /**
     * 抖动效果 (不能交换时的反弹果冻弹动)
     */
    public shake(): Promise<void> {
        const origin = TileItem.getPos(this.row, this.col);
        return new Promise((resolve) => {
            tween(this.node)
                .to(0.04, { position: v3(origin.x - 7, origin.y, 0), scale: v3(0.95, 1.05, 1) })
                .to(0.04, { position: v3(origin.x + 7, origin.y, 0), scale: v3(1.05, 0.95, 1) })
                .to(0.04, { position: v3(origin.x - 4, origin.y, 0) })
                .to(0.04, { position: origin, scale: v3(1, 1, 1) })
                .call(() => resolve())
                .start();
        });
    }

    /**
     * 消除动画 (如果冻水泡般微胀后晶莹破裂)
     */
    public playEliminate(): Promise<void> {
        return new Promise((resolve) => {
            Tween.stopAllByTarget(this.node);
            tween(this.node)
                .to(0.08, { scale: v3(1.3, 1.3, 1) }, { easing: 'quadOut' })
                .to(0.12, { scale: v3(0, 0, 1) }, { easing: 'quadIn' })
                .call(() => {
                    this.node.destroy();
                    resolve();
                })
                .start();
        });
    }
}
