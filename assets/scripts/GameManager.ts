import { _decorator, Component, Node, Graphics, UITransform, Label, Color, v3, Vec3, EventTouch, tween, Tween, Layers, Camera, Sprite, SpriteFrame, UIOpacity } from 'cc';
import { AnimalType, SpecialType, TileData, MatchGroup, ObstacleData, GAME_CONFIG } from './Types';
import { TileItem } from './TileItem';
import { MatchLogic } from './MatchLogic';
import { AudioService } from './AudioService';
import { ArtFactory } from './ArtFactory';
import { VisualAssets } from './VisualAssets';

const { ccclass } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    // 节点容器
    private boardContainer: Node = null!;
    private tileItems: (TileItem | null)[][] = [];
    private gridData: (TileData | null)[][] = [];

    // UI 组件
    private titleLabel: Label = null!;
    private scoreLabel: Label = null!;
    private movesLabel: Label = null!;
    private iceLabel: Label = null!;
    private goalLabel: Label = null!;
    private progressFill: Node = null!;
    private bannerNode: Node = null!;
    private bannerLabel: Label = null!;
    private modalNode: Node = null!;

    // 障碍物系统 (冰块与藤蔓)
    private iceContainer: Node = null!;
    private vineContainer: Node = null!;
    private obstacleData: ObstacleData[][] = [];
    private iceNodes: (Node | null)[][] = [];
    private vineNodes: (Node | null)[][] = [];
    private totalIceCount: number = 0;

    // 游戏数值与连续无尽闯关
    private currentLevel: number = 1;
    private targetScore: number = GAME_CONFIG.TARGET_SCORE;
    private score: number = 0;
    private remainingMoves: number = GAME_CONFIG.MAX_MOVES;
    private isBusy: boolean = false;
    private isGameOver: boolean = false;
    private currentCombo: number = 0;

    // 手势与选中交互
    private selectedTile: TileItem | null = null;
    private touchStartPos: Vec3 = v3();
    private touchStartTile: TileItem | null = null;

    /**
     * 创建标准化 2D UI 节点
     */
    private createUINode(name: string, width: number = 0, height: number = 0): Node {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        const trans = node.addComponent(UITransform);
        if (width > 0 && height > 0) {
            trans.setContentSize(width, height);
        }
        return node;
    }

    private createObstacleSpriteNode(name: string, sf: SpriteFrame): Node {
        const node = this.createUINode(name, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
        const sp = node.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.spriteFrame = sf;
        return node;
    }

    onLoad() {
        this.node.layer = Layers.Enum.UI_2D;
        const rootTransform = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        rootTransform.setContentSize(750, 1334);

        // 确保 Canvas 下具备专用的 2D 渲染相机
        let camera = this.node.getComponentInChildren(Camera);
        if (!camera) {
            const camNode = new Node('UICamera');
            camNode.layer = Layers.Enum.UI_2D;
            camera = camNode.addComponent(Camera);
            camera.projection = Camera.ProjectionType.ORTHO;
            camera.visibility = Layers.Enum.UI_2D;
            camera.priority = 65535;
            this.node.addChild(camNode);
        }

        VisualAssets.init(() => {
            if (!this.node.isValid) return;
            this.buildGameUI();
            this.startNewGame();
        });
    }

    /** 童话果园主题界面：背景画、奶油色 HUD、棋盘和底部提示栏。 */
    private buildGameUI() {
        const ink = new Color(91, 57, 37);
        const cream = new Color(255, 248, 225);
        const white = new Color(255, 255, 255);
        const addLabel = (parent: Node, name: string, value: string, size: number,
                          color: Color, x: number, y: number, width: number, height: number): Label => {
            const node = this.createUINode(name, width, height);
            node.setPosition(x, y, 0);
            const label = node.addComponent(Label);
            label.string = value;
            label.fontSize = size;
            label.lineHeight = size + 5;
            label.color = color;
            label.isBold = true;
            parent.addChild(node);
            return label;
        };
        const panel = (parent: Node, name: string, x: number, y: number, w: number, h: number,
                       fill: Color, edge: Color): Node => {
            const node = this.createUINode(name, w, h);
            node.setPosition(x, y, 0);
            const g = node.addComponent(Graphics);
            g.fillColor = new Color(125, 78, 41, 75);
            g.roundRect(-w / 2, -h / 2 - 7, w, h, 24);
            g.fill();
            g.fillColor = fill;
            g.roundRect(-w / 2, -h / 2, w, h, 24);
            g.fill();
            g.strokeColor = edge;
            g.lineWidth = 4;
            g.stroke();
            parent.addChild(node);
            return node;
        };

        const bgNode = this.createUINode('OrchardBackground', 750, 1334);
        const bgSprite = bgNode.addComponent(Sprite);
        bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        bgSprite.spriteFrame = ArtFactory.getBackgroundSprite();
        this.node.addChild(bgNode);

        const titlePanel = panel(this.node, 'TitlePanel', 0, 575, 520, 105,
            new Color(255, 249, 228, 238), new Color(255, 214, 125));
        addLabel(titlePanel, 'GameTitle', '果 园 奇 遇', 43, ink, 0, 15, 480, 55);
        addLabel(titlePanel, 'Subtitle', '和小伙伴一起消除吧', 22,
            new Color(176, 108, 66), 0, -29, 470, 30);

        const levelPill = panel(this.node, 'LevelPill', 0, 485, 230, 48,
            new Color(255, 151, 95), new Color(255, 234, 181));
        this.titleLabel = addLabel(levelPill, 'LevelLabel', '第 1 关', 27, white, 0, 0, 200, 42);

        const hud = this.createUINode('Hud', 720, 105);
        hud.setPosition(0, 406, 0);
        this.node.addChild(hud);
        const cardSpecs: Array<[string, number, Color, Color, string]> = [
            ['MovesCard', -222, new Color(255, 246, 223), new Color(255, 185, 87), '剩余步数'],
            ['IceCard', 0, new Color(236, 250, 255), new Color(113, 201, 237), '冰块目标'],
            ['ScoreCard', 222, new Color(255, 241, 248), new Color(255, 159, 181), '当前积分'],
        ];
        const cards = cardSpecs.map(([name, x, fill, edge, caption]) => {
            const card = panel(hud, name, x, 0, 204, 94, fill, edge);
            addLabel(card, `${name}Caption`, caption, 20, new Color(137, 91, 69), 0, 23, 185, 27);
            return card;
        });
        this.movesLabel = addLabel(cards[0], 'MovesValue', '35', 36, new Color(218, 106, 46), 0, -15, 185, 46);
        this.iceLabel = addLabel(cards[1], 'IceValue', '0', 36, new Color(43, 137, 184), 0, -15, 185, 46);
        this.scoreLabel = addLabel(cards[2], 'ScoreValue', '0', 34, new Color(209, 87, 126), 0, -15, 185, 46);

        const progressPanel = panel(this.node, 'ProgressPanel', 0, 311, 610, 54,
            new Color(255, 250, 230, 245), new Color(255, 219, 145));
        const track = this.createUINode('ProgressTrack', 350, 22);
        track.setPosition(-74, 0, 0);
        const trackG = track.addComponent(Graphics);
        trackG.fillColor = new Color(228, 195, 160);
        trackG.roundRect(-175, -11, 350, 22, 11);
        trackG.fill();
        progressPanel.addChild(track);
        this.progressFill = this.createUINode('ProgressFill', 334, 16);
        this.progressFill.setPosition(-241, 0, 0);
        const fillG = this.progressFill.addComponent(Graphics);
        fillG.fillColor = new Color(255, 141, 93);
        fillG.roundRect(0, -8, 334, 16, 8);
        fillG.fill();
        progressPanel.addChild(this.progressFill);
        this.goalLabel = addLabel(progressPanel, 'GoalLabel', '目标 6000', 20, ink, 205, 0, 170, 34);

        const totalW = GAME_CONFIG.COLS * (GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_GAP) + 24;
        const totalH = GAME_CONFIG.ROWS * (GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_GAP) + 24;
        const boardBgNode = this.createUINode('BoardBackground', totalW, totalH);
        boardBgNode.setPosition(0, -50, 0);
        const board = boardBgNode.addComponent(Graphics);
        board.fillColor = new Color(136, 83, 53, 105);
        board.roundRect(-totalW / 2, -totalH / 2 - 12, totalW, totalH, 36);
        board.fill();
        board.fillColor = new Color(255, 244, 211);
        board.roundRect(-totalW / 2, -totalH / 2, totalW, totalH, 36);
        board.fill();
        board.strokeColor = new Color(255, 205, 129);
        board.lineWidth = 5;
        board.stroke();
        board.fillColor = new Color(247, 211, 160);
        board.roundRect(-totalW / 2 + 9, -totalH / 2 + 9, totalW - 18, totalH - 18, 27);
        board.fill();
        for (let row = 0; row < GAME_CONFIG.ROWS; row++) {
            for (let col = 0; col < GAME_CONFIG.COLS; col++) {
                const pos = TileItem.getPos(row, col);
                board.fillColor = (row + col) % 2 === 0
                    ? new Color(255, 235, 195) : new Color(255, 225, 177);
                board.roundRect(pos.x - 35, pos.y - 35, 70, 70, 16);
                board.fill();
            }
        }
        this.node.addChild(boardBgNode);

        this.iceContainer = this.createUINode('IceContainer', totalW, totalH);
        this.iceContainer.setPosition(0, -50, 0);
        this.node.addChild(this.iceContainer);
        this.boardContainer = this.createUINode('BoardContainer', totalW, totalH);
        this.boardContainer.setPosition(0, -50, 0);
        this.node.addChild(this.boardContainer);
        this.vineContainer = this.createUINode('VineContainer', totalW, totalH);
        this.vineContainer.setPosition(0, -50, 0);
        this.node.addChild(this.vineContainer);
        this.boardContainer.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.boardContainer.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.boardContainer.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.boardContainer.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        const tip = panel(this.node, 'TipPanel', 0, -474, 610, 66,
            new Color(255, 247, 221, 235), new Color(255, 209, 138));
        addLabel(tip, 'TipText', '三连消除 · 四连得道具 · 五连得彩鸟', 24, ink, 0, 0, 570, 42);

        this.bannerNode = panel(this.node, 'BannerNode', 0, 65, 440, 82,
            new Color(255, 118, 104), new Color(255, 239, 177));
        this.bannerNode.setScale(0, 0, 1);
        this.bannerLabel = addLabel(this.bannerNode, 'BannerText', '', 29, white, 0, 0, 410, 58);

        this.modalNode = this.createUINode('ModalNode', 750, 1334);
        this.modalNode.active = false;
        this.node.addChild(this.modalNode);
    }

    /**
     * 开启新一局游戏
     */
    public startNewGame() {
        this.currentLevel = 1;
        this.targetScore = GAME_CONFIG.TARGET_SCORE;
        this.score = 0;
        this.remainingMoves = GAME_CONFIG.MAX_MOVES;
        this.currentCombo = 0;
        this.isGameOver = false;
        this.modalNode.active = false;

        // 初始化障碍物 (冰块与藤蔓)
        this.initObstacles(this.currentLevel);
        this.updateUI();

        // 清理旧图块
        this.boardContainer.removeAllChildren();
        this.tileItems = [];
        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            this.tileItems[r] = [];
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                this.tileItems[r][c] = null;
            }
        }

        // 初始化棋盘数据模型
        this.gridData = MatchLogic.initBoard();

        // 实例化视图
        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                const tileData = this.gridData[r][c]!;
                const node = this.createUINode(`Tile_${r}_${c}`, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
                const item = node.addComponent(TileItem);
                this.boardContainer.addChild(node);
                item.init(tileData);
                this.tileItems[r][c] = item;
            }
        }
    }

    /**
     * 根据关卡初始化冰块与藤蔓障碍物
     */
    public initObstacles(level: number) {
        if (!this.iceContainer || !this.vineContainer) return;
        this.iceContainer.removeAllChildren();
        this.vineContainer.removeAllChildren();
        this.obstacleData = [];
        this.iceNodes = [];
        this.vineNodes = [];
        this.totalIceCount = 0;

        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            this.obstacleData[r] = [];
            this.iceNodes[r] = [];
            this.vineNodes[r] = [];
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                this.obstacleData[r][c] = { ice: 0, vine: 0 };
                this.iceNodes[r][c] = null;
                this.vineNodes[r][c] = null;
            }
        }

        if (level === 1) {
            // 第 1 关：底部薄冰阵，中间两处荆棘
            for (let c = 1; c <= 6; c++) {
                this.setIce(0, c, 1);
                this.setIce(1, c, 1);
            }
            this.setVine(3, 2);
            this.setVine(3, 5);
        } else if (level === 2) {
            // 第 2 关：四角坚冰阵，中间四角荆棘
            const corners = [
                [0, 0], [0, 1], [1, 0], [1, 1],
                [0, 6], [0, 7], [1, 6], [1, 7],
                [6, 0], [6, 1], [7, 0], [7, 1],
                [6, 6], [6, 7], [7, 6], [7, 7]
            ];
            corners.forEach(([r, c]) => this.setIce(r, c, 2));
            this.setVine(3, 3);
            this.setVine(3, 4);
            this.setVine(4, 3);
            this.setVine(4, 4);
        } else {
            // 第 3 关及以上：冰霜十字 + 荆棘阵列
            for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
                for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                    if ((r <= 1 || r >= 6) && (c >= 1 && c <= 6)) {
                        this.setIce(r, c, level >= 4 ? 2 : 1);
                    }
                }
            }
            this.setVine(2, 2);
            this.setVine(2, 5);
            this.setVine(5, 2);
            this.setVine(5, 5);
        }
    }

    private setIce(r: number, c: number, iceLevel: number) {
        if (r < 0 || r >= GAME_CONFIG.ROWS || c < 0 || c >= GAME_CONFIG.COLS) return;
        this.obstacleData[r][c].ice = iceLevel;
        this.totalIceCount++;

        const sf = ArtFactory.getIceSprite(iceLevel);
        const node = this.createObstacleSpriteNode(`Ice_${r}_${c}`, sf);
        node.setPosition(TileItem.getPos(r, c));
        this.iceContainer.addChild(node);
        this.iceNodes[r][c] = node;
    }

    private setVine(r: number, c: number) {
        if (r < 0 || r >= GAME_CONFIG.ROWS || c < 0 || c >= GAME_CONFIG.COLS) return;
        this.obstacleData[r][c].vine = 1;

        const sf = ArtFactory.getVineSprite();
        const node = this.createObstacleSpriteNode(`Vine_${r}_${c}`, sf);
        node.setPosition(TileItem.getPos(r, c));
        this.vineContainer.addChild(node);
        this.vineNodes[r][c] = node;
    }

    private shakeVine(r: number, c: number) {
        const node = this.vineNodes[r][c];
        if (node) {
            Tween.stopAllByTarget(node);
            tween(node)
                .to(0.04, { scale: v3(0.9, 1.15, 1) })
                .to(0.04, { scale: v3(1.15, 0.9, 1) })
                .to(0.05, { scale: v3(1, 1, 1) })
                .start();
        }
    }

    /**
     * 对命中的坐标位置执行破冰与解开荆棘藤蔓
     */
    private async hitObstaclesAtPositions(positions: { row: number; col: number }[]) {
        const iceCracked: Node[] = [];
        const iceDestroyed: Node[] = [];
        const vineSnapped: Node[] = [];

        const handled = new Set<string>();

        for (const pos of positions) {
            const key = `${pos.row}_${pos.col}`;
            if (handled.has(key)) continue;
            handled.add(key);

            const r = pos.row, c = pos.col;
            if (r < 0 || r >= GAME_CONFIG.ROWS || c < 0 || c >= GAME_CONFIG.COLS) continue;

            // 1. 解开藤蔓
            if (this.obstacleData[r][c].vine > 0) {
                this.obstacleData[r][c].vine = 0;
                const vn = this.vineNodes[r][c];
                if (vn) {
                    this.vineNodes[r][c] = null;
                    vineSnapped.push(vn);
                }
                this.score += 150;
            }

            // 2. 击碎冰块
            if (this.obstacleData[r][c].ice > 0) {
                this.obstacleData[r][c].ice--;
                const inode = this.iceNodes[r][c];
                this.score += 200;

                if (this.obstacleData[r][c].ice > 0) {
                    // 变成薄冰
                    if (inode) {
                        const sp = inode.getComponent(Sprite);
                        if (sp) sp.spriteFrame = ArtFactory.getIceSprite(this.obstacleData[r][c].ice);
                        iceCracked.push(inode);
                    }
                } else {
                    // 彻底破碎
                    if (inode) {
                        this.iceNodes[r][c] = null;
                        iceDestroyed.push(inode);
                    }
                    this.totalIceCount--;
                }
            }
        }

        // 播放藤蔓断裂音效与动画
        if (vineSnapped.length > 0) {
            AudioService.playVineSnap();
            vineSnapped.forEach(node => {
                tween(node)
                    .to(0.1, { scale: v3(1.3, 1.3, 1) })
                    .to(0.12, { scale: v3(0, 0, 1) })
                    .call(() => node.destroy())
                    .start();
            });
        }

        // 播放碎冰微震音效与动画
        if (iceCracked.length > 0) {
            AudioService.playIceCrack();
            iceCracked.forEach(node => {
                tween(node)
                    .to(0.05, { scale: v3(0.92, 0.92, 1) })
                    .to(0.08, { scale: v3(1, 1, 1) })
                    .start();
            });
        }

        // 播放完全碎裂音效与飞散动画
        if (iceDestroyed.length > 0) {
            AudioService.playIceCrack();
            iceDestroyed.forEach(node => {
                tween(node)
                    .to(0.08, { scale: v3(1.25, 1.25, 1) })
                    .to(0.12, { scale: v3(0, 0, 1) })
                    .call(() => node.destroy())
                    .start();
            });
        }

        this.updateUI();

        // 检查是否清空了全场所有冰块！
        if (this.totalIceCount <= 0 && handled.size > 0 && positions.length > 0) {
            this.showIceClearBonus();
        }
    }

    /**
     * 全部冰块清除奖励
     */
    private showIceClearBonus() {
        this.score += 2500;
        this.remainingMoves += 5;
        this.updateUI();
        AudioService.playWin();

        this.bannerLabel.string = '冰块全清！奖励 5 步';
        Tween.stopAllByTarget(this.bannerNode);
        this.bannerNode.setScale(0, 0, 1);
        tween(this.bannerNode)
            .to(0.18, { scale: v3(1.15, 1.15, 1) }, { easing: 'backOut' })
            .delay(1.2)
            .to(0.18, { scale: v3(0, 0, 1) }, { easing: 'backIn' })
            .start();
    }

    /**
     * 关卡无缝升级时为现有棋盘补充新一轮冰霜与荆棘
     */
    private addNewObstaclesForLevel(level: number) {
        let addedIce = 0;
        let addedVine = 0;

        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                // 如果该格还没有冰块，且在特征区域，铺设新冰块
                if (this.obstacleData[r][c].ice === 0 && (r <= 1 || r >= 6 || (r + c) % 3 === 0)) {
                    if (addedIce < 8 + level * 2) {
                        this.setIce(r, c, (level >= 3 && Math.random() > 0.4) ? 2 : 1);
                        addedIce++;
                    }
                }
                // 补充 2~3 处新藤蔓
                if (this.obstacleData[r][c].vine === 0 && addedVine < Math.min(3, level) && Math.random() < 0.25) {
                    this.setVine(r, c);
                    addedVine++;
                }
            }
        }
    }

    private showBannerMessage(msg: string) {
        this.bannerLabel.string = msg;
        Tween.stopAllByTarget(this.bannerNode);
        this.bannerNode.setScale(0, 0, 1);
        tween(this.bannerNode)
            .to(0.12, { scale: v3(1.1, 1.1, 1) })
            .delay(0.7)
            .to(0.15, { scale: v3(0, 0, 1) })
            .start();
    }

    private updateUI() {
        if (this.titleLabel) this.titleLabel.string = `第 ${this.currentLevel} 关`;
        if (this.movesLabel) this.movesLabel.string = String(this.remainingMoves);
        if (this.iceLabel) this.iceLabel.string = String(this.totalIceCount);
        if (this.scoreLabel) this.scoreLabel.string = this.score.toLocaleString();
        if (this.goalLabel) this.goalLabel.string = `目标 ${this.targetScore.toLocaleString()}`;
        if (this.progressFill) {
            const levelStart = this.targetScore - GAME_CONFIG.TARGET_SCORE;
            const progress = (this.score - levelStart) / GAME_CONFIG.TARGET_SCORE;
            this.progressFill.setScale(Math.max(0.01, Math.min(1, progress)), 1, 1);
        }
    }

    // ==================== 触摸与滑动手势交互 ====================

    private onTouchStart(event: EventTouch) {
        if (this.isBusy || this.isGameOver) return;
        AudioService.enableAudioOnFirstTouch();

        const loc = event.getUILocation();
        const localPos = this.boardContainer.getComponent(UITransform)!.convertToNodeSpaceAR(v3(loc.x, loc.y, 0));
        const tile = this.getTileAtPos(localPos);

        if (tile) {
            // 被藤蔓锁定的格子无法主动拖动
            if (this.obstacleData[tile.row]?.[tile.col]?.vine > 0) {
                AudioService.playLocked();
                this.shakeVine(tile.row, tile.col);
                this.showBannerMessage('荆棘缠绕，无法移动！');
                return;
            }
            this.touchStartPos = localPos;
            this.touchStartTile = tile;
            AudioService.playTap();
        }
    }

    private onTouchMove(event: EventTouch) {
        if (this.isBusy || this.isGameOver || !this.touchStartTile) return;

        const loc = event.getUILocation();
        const localPos = this.boardContainer.getComponent(UITransform)!.convertToNodeSpaceAR(v3(loc.x, loc.y, 0));
        const dx = localPos.x - this.touchStartPos.x;
        const dy = localPos.y - this.touchStartPos.y;

        const threshold = 28; // 滑动触发阈值
        if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
            let tr = this.touchStartTile.row;
            let tc = this.touchStartTile.col;

            if (Math.abs(dx) > Math.abs(dy)) {
                tc += dx > 0 ? 1 : -1;
            } else {
                tr += dy > 0 ? 1 : -1;
            }

            if (tr >= 0 && tr < GAME_CONFIG.ROWS && tc >= 0 && tc < GAME_CONFIG.COLS) {
                const targetTile = this.tileItems[tr][tc];
                if (targetTile) {
                    const originTile = this.touchStartTile;
                    this.touchStartTile = null;
                    if (this.selectedTile) {
                        this.selectedTile.setSelected(false);
                        this.selectedTile = null;
                    }
                    this.trySwap(originTile, targetTile);
                }
            }
        }
    }

    private onTouchEnd(event: EventTouch) {
        if (this.isBusy || this.isGameOver || !this.touchStartTile) return;

        // 如果没有触发滑动，则视为点击
        const clickedTile = this.touchStartTile;
        this.touchStartTile = null;

        if (!this.selectedTile) {
            this.selectedTile = clickedTile;
            this.selectedTile.setSelected(true);
        } else if (this.selectedTile === clickedTile) {
            this.selectedTile.setSelected(false);
            this.selectedTile = null;
        } else {
            // 点击了第二个格子
            const rDiff = Math.abs(this.selectedTile.row - clickedTile.row);
            const cDiff = Math.abs(this.selectedTile.col - clickedTile.col);
            if ((rDiff === 1 && cDiff === 0) || (rDiff === 0 && cDiff === 1)) {
                const first = this.selectedTile;
                this.selectedTile.setSelected(false);
                this.selectedTile = null;
                this.trySwap(first, clickedTile);
            } else {
                // 不相邻，改选新格子
                this.selectedTile.setSelected(false);
                this.selectedTile = clickedTile;
                this.selectedTile.setSelected(true);
            }
        }
    }

    private getTileAtPos(localPos: Vec3): TileItem | null {
        const step = GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_GAP;
        const totalW = (GAME_CONFIG.COLS - 1) * step;
        const totalH = (GAME_CONFIG.ROWS - 1) * step;

        const c = Math.round((localPos.x + totalW / 2) / step);
        const r = Math.round((localPos.y + totalH / 2) / step);

        if (r >= 0 && r < GAME_CONFIG.ROWS && c >= 0 && c < GAME_CONFIG.COLS) {
            return this.tileItems[r][c];
        }
        return null;
    }

    // ==================== 核心游戏流水线 ====================

    /**
     * 尝试交换两个格子并进入结算流
     */
    private async trySwap(tile1: TileItem, tile2: TileItem) {
        this.isBusy = true;
        AudioService.playSwap();

        const r1 = tile1.row, c1 = tile1.col;
        const r2 = tile2.row, c2 = tile2.col;

        // 校验藤蔓锁定拦截
        if (this.obstacleData[r1]?.[c1]?.vine > 0 || this.obstacleData[r2]?.[c2]?.vine > 0) {
            AudioService.playLocked();
            if (this.obstacleData[r1]?.[c1]?.vine > 0) this.shakeVine(r1, c1);
            if (this.obstacleData[r2]?.[c2]?.vine > 0) this.shakeVine(r2, c2);
            await Promise.all([tile1.shake(), tile2.shake()]);
            this.showBannerMessage('荆棘缠绕，无法移动！');
            this.isBusy = false;
            return;
        }

        // 1. 播放交换平滑位移动画
        await Promise.all([
            tile1.moveTo(r2, c2, 0.16),
            tile2.moveTo(r1, c1, 0.16)
        ]);

        // 更新矩阵位置
        this.tileItems[r1][c1] = tile2;
        this.tileItems[r2][c2] = tile1;
        this.gridData[r1][c1] = tile2.data;
        this.gridData[r2][c2] = tile1.data;

        // 2. 检测特效双组合交换
        const isSpecialCombo = this.checkSpecialCombo(tile1, tile2);

        // 3. 检测常规匹配
        const matches = MatchLogic.findMatches(this.gridData, { row: r2, col: c2 });

        if (!isSpecialCombo && matches.length === 0) {
            // 无效交换，弹回原位
            await Promise.all([
                tile1.moveTo(r1, c1, 0.16),
                tile2.moveTo(r2, c2, 0.16)
            ]);
            this.tileItems[r1][c1] = tile1;
            this.tileItems[r2][c2] = tile2;
            this.gridData[r1][c1] = tile1.data;
            this.gridData[r2][c2] = tile2.data;

            await Promise.all([tile1.shake(), tile2.shake()]);
            this.isBusy = false;
            return;
        }

        // 消耗 1 步
        this.remainingMoves--;
        this.currentCombo = 0;
        this.updateUI();

        // 彩鸟或双特殊动物组合直接触发；单个特殊动物仍需参与同种匹配。
        if (isSpecialCombo) {
            await this.executeSpecialCombo(tile1, tile2);
            // 特殊消除完毕后，立即进行重力下落并填补空缺
            await this.dropAndFill();
        }

        // 循环消除与重力下落流程
        await this.runEliminateCycle();

        // 胜负与死局检测
        this.checkGameStatus();
        this.isBusy = false;
    }

    /**
     * 彩鸟交换或两个特殊动物交换可直接触发。
     */
    private checkSpecialCombo(t1: TileItem, t2: TileItem): boolean {
        return t1.data.special === SpecialType.RAINBOW || t2.data.special === SpecialType.RAINBOW ||
               (t1.data.special !== SpecialType.NONE && t2.data.special !== SpecialType.NONE);
    }

    /**
     * 执行彩鸟或双特殊动物组合效果。
     */
    private async executeSpecialCombo(t1: TileItem, t2: TileItem) {
        const s1 = t1.data.special;
        const s2 = t2.data.special;
        const toEliminate = new Set<TileData>();

        // 双魔力鸟：全屏清屏！
        if (s1 === SpecialType.RAINBOW && s2 === SpecialType.RAINBOW) {
            AudioService.playRainbow();
            for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
                for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                    if (this.gridData[r][c]) toEliminate.add(this.gridData[r][c]!);
                }
            }
        }
        // 彩鸟 + 方向动物：同种动物变成相同方向的特殊状态并一起触发。
        else if ((s1 === SpecialType.RAINBOW && (s2 === SpecialType.HORIZONTAL || s2 === SpecialType.VERTICAL)) ||
                 (s2 === SpecialType.RAINBOW && (s1 === SpecialType.HORIZONTAL || s1 === SpecialType.VERTICAL))) {
            AudioService.playRainbow();
            const stripeTile = s1 === SpecialType.RAINBOW ? t2 : t1;
            toEliminate.add(t1.data);
            toEliminate.add(t2.data);
            for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
                for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                    const item = this.gridData[r][c];
                    if (item && item.type === stripeTile.data.type && item.special !== SpecialType.RAINBOW) {
                        if (item.special === SpecialType.NONE) {
                            item.special = stripeTile.data.special;
                            this.tileItems[r][c]?.renderView();
                        }
                        toEliminate.add(item);
                    }
                }
            }
        }
        // 彩鸟 + 爆炸动物：同种动物变成发光爆炸状态并连锁引爆。
        else if ((s1 === SpecialType.RAINBOW && s2 === SpecialType.BOMB) ||
                 (s2 === SpecialType.RAINBOW && s1 === SpecialType.BOMB)) {
            AudioService.playRainbow();
            const bomb = s1 === SpecialType.BOMB ? t1 : t2;
            toEliminate.add(t1.data);
            toEliminate.add(t2.data);
            for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
                for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                    const item = this.gridData[r][c];
                    if (item && item.type === bomb.data.type && item.special !== SpecialType.RAINBOW) {
                        if (item.special === SpecialType.NONE) {
                            item.special = SpecialType.BOMB;
                            this.tileItems[r][c]?.renderView();
                        }
                        toEliminate.add(item);
                    }
                }
            }
        }
        // 彩鸟 + 普通动物：消除该动物的所有棋子。
        else if (s1 === SpecialType.RAINBOW || s2 === SpecialType.RAINBOW) {
            AudioService.playRainbow();
            const normalTile = s1 === SpecialType.RAINBOW ? t2 : t1;
            const targetColor = normalTile.data.type;
            toEliminate.add(t1.data);
            toEliminate.add(t2.data);
            for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
                for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                    const item = this.gridData[r][c];
                    if (item && item.type === targetColor) toEliminate.add(item);
                }
            }
        }
        // 7. 条纹 + 条纹：十字消除
        else if ((s1 === SpecialType.HORIZONTAL || s1 === SpecialType.VERTICAL) &&
                 (s2 === SpecialType.HORIZONTAL || s2 === SpecialType.VERTICAL)) {
            AudioService.playLineSpecial();
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                if (this.gridData[t2.row][c]) toEliminate.add(this.gridData[t2.row][c]!);
            }
            for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
                if (this.gridData[r][t2.col]) toEliminate.add(this.gridData[r][t2.col]!);
            }
        }
        // 8. 炸弹 + 炸弹：5x5 范围超大爆炸
        else if (s1 === SpecialType.BOMB && s2 === SpecialType.BOMB) {
            AudioService.playBomb();
            for (let dr = -2; dr <= 2; dr++) {
                for (let dc = -2; dc <= 2; dc++) {
                    const nr = t2.row + dr, nc = t2.col + dc;
                    if (nr >= 0 && nr < GAME_CONFIG.ROWS && nc >= 0 && nc < GAME_CONFIG.COLS) {
                        if (this.gridData[nr][nc]) toEliminate.add(this.gridData[nr][nc]!);
                    }
                }
            }
        }
        // 9. 条纹 + 炸弹：巨型十字消除 (3行 + 3列)
        else {
            AudioService.playBomb();
            for (let dr = -1; dr <= 1; dr++) {
                const nr = t2.row + dr;
                if (nr >= 0 && nr < GAME_CONFIG.ROWS) {
                    for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                        if (this.gridData[nr][c]) toEliminate.add(this.gridData[nr][c]!);
                    }
                }
            }
            for (let dc = -1; dc <= 1; dc++) {
                const nc = t2.col + dc;
                if (nc >= 0 && nc < GAME_CONFIG.COLS) {
                    for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
                        if (this.gridData[r][nc]) toEliminate.add(this.gridData[r][nc]!);
                    }
                }
            }
        }

        // 连锁扩散（如果有炸弹或条纹被卷入，继续引爆）
        const allToEliminate = MatchLogic.expandElimination(this.gridData, Array.from(toEliminate));
        this.playSpecialVisuals(Array.from(allToEliminate));

        // 攻击命中的冰块与藤蔓
        const hitPositions: { row: number; col: number }[] = [];
        allToEliminate.forEach(t => hitPositions.push({ row: t.row, col: t.col }));
        await this.hitObstaclesAtPositions(hitPositions);

        // 累积分数
        const addScore = allToEliminate.size * 100;
        this.score += addScore;
        this.updateUI();

        // 弹出酷炫赞美飘字
        if (allToEliminate.size >= 12) {
            this.showComboFeedback(4); // Amazing! / Unbelievable!
        } else if (allToEliminate.size >= 6) {
            this.showComboFeedback(3); // Great!
        }

        await this.eliminateTiles(Array.from(allToEliminate));
    }

    /** 道具触发时的棋盘光效。与图标分开绘制，保证消除方向清楚可见。 */
    private playSpecialVisuals(tiles: TileData[]) {
        const rows = new Set<number>();
        const cols = new Set<number>();
        const rainbow = tiles.find(t => t.special === SpecialType.RAINBOW);

        for (const tile of tiles) {
            if (tile.special === SpecialType.HORIZONTAL) rows.add(tile.row);
            if (tile.special === SpecialType.VERTICAL) cols.add(tile.col);
            if (tile.special === SpecialType.BOMB) this.playBurstRing(tile.row, tile.col, new Color(255, 166, 72, 230));
        }
        for (const row of rows) this.playLineSweep(row, 0, true);
        for (const col of cols) this.playLineSweep(0, col, false);
        if (rainbow) this.playRainbowBurst(rainbow, tiles);
    }

    private playLineSweep(row: number, col: number, horizontal: boolean) {
        const pos = TileItem.getPos(
            horizontal ? row : (GAME_CONFIG.ROWS - 1) / 2,
            horizontal ? (GAME_CONFIG.COLS - 1) / 2 : col
        );
        const length = (horizontal ? GAME_CONFIG.COLS : GAME_CONFIG.ROWS) *
            (GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_GAP);
        const flash = this.createUINode(horizontal ? 'HorizontalSweep' : 'VerticalSweep', length, length);
        flash.setPosition(pos);
        this.boardContainer.addChild(flash);
        const g = flash.addComponent(Graphics);
        const half = length / 2;
        const drawLine = (width: number, color: Color) => {
            g.lineWidth = width;
            g.strokeColor = color;
            g.moveTo(horizontal ? -half : 0, horizontal ? 0 : -half);
            g.lineTo(horizontal ? half : 0, horizontal ? 0 : half);
            g.stroke();
        };
        drawLine(31, new Color(68, 222, 255, 75));
        drawLine(14, new Color(54, 217, 255, 210));
        drawLine(5, new Color(255, 255, 255, 255));
        const alpha = flash.addComponent(UIOpacity);
        flash.setScale(horizontal ? 0.03 : 1, horizontal ? 1 : 0.03, 1);
        tween(flash)
            .to(0.15, { scale: v3(1, 1, 1) }, { easing: 'quadOut' })
            .delay(0.25)
            .call(() => flash.destroy())
            .start();
        tween(alpha).delay(0.12).to(0.25, { opacity: 0 }).start();
    }

    private playBurstRing(row: number, col: number, color: Color) {
        const flash = this.createUINode('SpecialBurst', GAME_CONFIG.TILE_SIZE * 2, GAME_CONFIG.TILE_SIZE * 2);
        flash.setPosition(TileItem.getPos(row, col));
        this.boardContainer.addChild(flash);
        const g = flash.addComponent(Graphics);
        g.lineWidth = 9;
        g.strokeColor = color;
        g.circle(0, 0, GAME_CONFIG.TILE_SIZE * 0.43);
        g.stroke();
        g.lineWidth = 3;
        g.strokeColor = new Color(255, 255, 255, 220);
        g.circle(0, 0, GAME_CONFIG.TILE_SIZE * 0.55);
        g.stroke();
        const alpha = flash.addComponent(UIOpacity);
        flash.setScale(0.5, 0.5, 1);
        tween(flash).to(0.36, { scale: v3(2, 2, 1) }, { easing: 'quadOut' })
            .call(() => flash.destroy()).start();
        tween(alpha).to(0.36, { opacity: 0 }).start();
    }

    private playRainbowBurst(origin: TileData, targets: TileData[]) {
        const flash = this.createUINode('RainbowRays', 0, 0);
        this.boardContainer.addChild(flash);
        const g = flash.addComponent(Graphics);
        const start = TileItem.getPos(origin.row, origin.col);
        const colors = [
            new Color(255, 111, 159, 175), new Color(255, 205, 84, 175),
            new Color(107, 224, 149, 175), new Color(96, 202, 255, 175),
            new Color(185, 139, 255, 175),
        ];
        targets.forEach((tile, index) => {
            if (tile === origin) return;
            const end = TileItem.getPos(tile.row, tile.col);
            g.lineWidth = 3.5;
            g.strokeColor = colors[index % colors.length];
            g.moveTo(start.x, start.y);
            g.lineTo(end.x, end.y);
            g.stroke();
        });
        const alpha = flash.addComponent(UIOpacity);
        tween(alpha).delay(0.05).to(0.36, { opacity: 0 })
            .call(() => flash.destroy()).start();
        this.playBurstRing(origin.row, origin.col, new Color(255, 225, 104, 240));
    }

    /**
     * 循环检测消除、重力下落、连锁判定
     */
    private async runEliminateCycle() {
        let hasCycle = true;

        while (hasCycle) {
            const matches = MatchLogic.findMatches(this.gridData);
            if (matches.length === 0) {
                hasCycle = false;
                break;
            }

            this.currentCombo++;
            this.showComboFeedback(this.currentCombo);
            AudioService.playMatch(this.currentCombo);

            // 收集所有匹配到的图块
            const matchedTiles: TileData[] = [];
            const newSpecials: { pos: { row: number; col: number }; special: SpecialType; type: AnimalType }[] = [];

            for (const g of matches) {
                matchedTiles.push(...g.tiles);
                if (g.specialToGenerate !== SpecialType.NONE) {
                    newSpecials.push({
                        pos: g.targetPos,
                        special: g.specialToGenerate,
                        type: g.animalType
                    });
                }
            }

            // 连锁扩散（如果有条纹或炸弹）
            const allToEliminate = MatchLogic.expandElimination(this.gridData, matchedTiles);
            this.playSpecialVisuals(Array.from(allToEliminate));

            // 攻击命中的冰块与藤蔓
            const hitPositions: { row: number; col: number }[] = [];
            allToEliminate.forEach(t => hitPositions.push({ row: t.row, col: t.col }));
            await this.hitObstaclesAtPositions(hitPositions);

            // 执行消除动画并加分
            const baseScore = allToEliminate.size * 100 * this.currentCombo;
            this.score += baseScore;
            this.updateUI();

            await this.eliminateTiles(Array.from(allToEliminate));

            // 生成新合成的特殊元素
            for (const sp of newSpecials) {
                const r = sp.pos.row;
                const c = sp.pos.col;
                // 如果该位置已被消除置空，重新生成特殊图块
                if (this.gridData[r][c] === null) {
                    const spData: TileData = {
                        id: Date.now() + Math.random(),
                        type: sp.special === SpecialType.RAINBOW ? AnimalType.CHICKEN : sp.type,
                        special: sp.special,
                        row: r,
                        col: c
                    };
                    this.gridData[r][c] = spData;
                    const node = this.createUINode(`Special_${r}_${c}`, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
                    const item = node.addComponent(TileItem);
                    this.boardContainer.addChild(node);
                    item.init(spData);
                    node.setScale(0.2, 0.2, 1);
                    tween(node).to(0.22, { scale: v3(1.18, 1.18, 1) }, { easing: 'backOut' })
                        .to(0.1, { scale: v3(1, 1, 1) }).start();
                    this.tileItems[r][c] = item;
                }
            }

            // 下落补充新元素
            await this.dropAndFill();
        }
    }

    /**
     * 消除指定的图块列表
     */
    private async eliminateTiles(tiles: TileData[]) {
        const anims: Promise<void>[] = [];

        for (const t of tiles) {
            const item = this.tileItems[t.row][t.col];
            if (item) {
                this.tileItems[t.row][t.col] = null;
                this.gridData[t.row][t.col] = null;
                anims.push(item.playEliminate());
            }
        }

        await Promise.all(anims);
    }

    /**
     * 重力下落与新块生成
     */
    private async dropAndFill() {
        const { drops, newTiles } = MatchLogic.calculateDrop(
            this.gridData,
            (r, c) => this.obstacleData[r]?.[c]?.vine > 0
        );
        const anims: Promise<void>[] = [];

        // 1. 创建新生节点的视图
        for (const drop of drops) {
            if (drop.isNew) {
                const node = this.createUINode(`Tile_${drop.tile.row}_${drop.tile.col}`, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE);
                const item = node.addComponent(TileItem);
                this.boardContainer.addChild(node);

                // 初始位置在棋盘外顶部
                const spawnPos = TileItem.getPos(drop.fromRow, drop.fromCol);
                node.setPosition(spawnPos);
                item.init(drop.tile);

                this.tileItems[drop.toRow][drop.toCol] = item;
                anims.push(item.moveTo(drop.toRow, drop.toCol, 0.28, true));
            } else {
                // 原有图块下移
                const item = this.tileItems[drop.fromRow][drop.fromCol]!;
                this.tileItems[drop.fromRow][drop.fromCol] = null;
                this.tileItems[drop.toRow][drop.toCol] = item;
                anims.push(item.moveTo(drop.toRow, drop.toCol, 0.25, true));
            }
        }

        await Promise.all(anims);
    }

    /**
     * 弹出连击与赞叹飘字动画
     */
    private showComboFeedback(combo: number) {
        if (combo < 2) return;

        const words = ['好棒！', '太厉害啦！', '精彩连消！', '超神连消！', '果园大丰收！'];
        const word = words[Math.min(combo - 2, words.length - 1)];

        this.bannerLabel.string = `${word} x${combo}`;
        Tween.stopAllByTarget(this.bannerNode);
        this.bannerNode.setScale(0, 0, 1);

        tween(this.bannerNode)
            .to(0.12, { scale: v3(1.2, 1.2, 1) })
            .to(0.08, { scale: v3(1.0, 1.0, 1) })
            .delay(0.6)
            .to(0.15, { scale: v3(0, 0, 1) })
            .start();
    }

    /**
     * 胜负判定与防死局洗牌检测 (无缝连续闯关，绝不刷新地图)
     */
    private checkGameStatus() {
        // 达成关卡目标：无缝进入下一关，奖励步数，绝不刷新地图！
        if (this.score >= this.targetScore) {
            this.currentLevel++;
            this.targetScore += 6000;
            const bonusMoves = 15;
            this.remainingMoves += bonusMoves;
            AudioService.playWin();
            this.showLevelUpBanner(this.currentLevel, bonusMoves);
            // 为新关卡在当前地图无缝补充新一轮冰霜与荆棘挑战
            this.addNewObstaclesForLevel(this.currentLevel);
            this.updateUI();
        }

        // 步数耗尽检测
        if (this.remainingMoves <= 0) {
            this.isGameOver = true;
            this.showEndModal(false, '本轮挑战结束', `到达第 ${this.currentLevel} 关\n收获积分 ${this.score.toLocaleString()}`);
            return;
        }

        // 死局检测
        if (!MatchLogic.hasValidMove(this.gridData)) {
            this.showShuffleNotice();
        }
    }

    /**
     * 弹出关卡升级飘字横幅 (轻量提示，不打断手指操作)
     */
    private showLevelUpBanner(level: number, bonusMoves: number) {
        this.bannerLabel.string = `第${level}关完成 +${bonusMoves}步`;
        Tween.stopAllByTarget(this.bannerNode);
        this.bannerNode.setScale(0, 0, 1);

        tween(this.bannerNode)
            .to(0.18, { scale: v3(1.15, 1.15, 1) }, { easing: 'backOut' })
            .delay(1.2)
            .to(0.18, { scale: v3(0, 0, 1) }, { easing: 'backIn' })
            .start();
    }

    /**
     * 弹出洗牌提示并打乱棋盘
     */
    private showShuffleNotice() {
        this.bannerLabel.string = '无路可走，重新洗牌！';
        tween(this.bannerNode)
            .to(0.15, { scale: v3(1.1, 1.1, 1) })
            .delay(0.8)
            .to(0.15, { scale: v3(0, 0, 1) })
            .call(() => {
                MatchLogic.shuffle(this.gridData);
                for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
                    for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                        const item = this.tileItems[r][c];
                        if (item) item.init(this.gridData[r][c]!);
                    }
                }
            })
            .start();
    }

    /**
     * 结算模态弹窗 (支持保留当前棋盘加步继续玩)
     */
    private showEndModal(isWin: boolean, title: string, desc: string) {
        this.modalNode.removeAllChildren();
        this.modalNode.active = true;

        // 半透明遮罩
        const mask = this.createUINode('Mask', 750, 1334);
        const maskG = mask.addComponent(Graphics);
        maskG.fillColor = new Color(53, 37, 42, 175);
        maskG.rect(-375, -667, 750, 1334);
        maskG.fill();
        this.modalNode.addChild(mask);

        // 对话框面板
        const panel = this.createUINode('Panel', 520, 380);
        const panelG = panel.addComponent(Graphics);
        panelG.fillColor = new Color(146, 86, 50, 100);
        panelG.roundRect(-260, -199, 520, 380, 32);
        panelG.fill();
        panelG.fillColor = new Color(255, 249, 227);
        panelG.roundRect(-260, -190, 520, 380, 28);
        panelG.fill();

        panelG.strokeColor = new Color(255, 192, 113);
        panelG.lineWidth = 5;
        panelG.stroke();
        panelG.fillColor = new Color(255, 222, 164);
        panelG.roundRect(-240, 106, 480, 60, 22);
        panelG.fill();

        // 标题
        const titleN = this.createUINode('Title', 460, 50);
        titleN.setPosition(0, 105, 0);
        const titleL = titleN.addComponent(Label);
        titleL.string = title;
        titleL.fontSize = 36;
        titleL.color = new Color(166, 82, 44);
        titleL.isBold = true;
        panel.addChild(titleN);

        // 描述
        const descN = this.createUINode('Desc', 460, 90);
        descN.setPosition(0, 35, 0);
        const descL = descN.addComponent(Label);
        descL.string = desc;
        descL.fontSize = 24;
        descL.lineHeight = 34;
        descL.color = new Color(91, 57, 37);
        panel.addChild(descN);

        // 按钮 1：补充 +10 步继续玩 (保留现有地图不刷新)
        const addMovesBtn = this.createUINode('AddMovesBtn', 220, 64);
        addMovesBtn.setPosition(-120, -85, 0);
        const btnG1 = addMovesBtn.addComponent(Graphics);
        btnG1.fillColor = new Color(232, 112, 82);
        btnG1.roundRect(-110, -32, 220, 64, 18);
        btnG1.fill();
        btnG1.strokeColor = new Color(255, 200, 145);
        btnG1.lineWidth = 3;
        btnG1.stroke();

        const text1 = this.createUINode('BtnText1', 200, 40);
        const l1 = text1.addComponent(Label);
        l1.string = '+10 步继续';
        l1.fontSize = 24;
        l1.color = Color.WHITE;
        l1.isBold = true;
        addMovesBtn.addChild(text1);

        addMovesBtn.on(Node.EventType.TOUCH_END, () => {
            this.remainingMoves += 10;
            this.isGameOver = false;
            this.modalNode.active = false;
            this.updateUI();
        });
        panel.addChild(addMovesBtn);

        // 按钮 2：重新开新局 (重置地图)
        const restartBtn = this.createUINode('RestartBtn', 200, 64);
        restartBtn.setPosition(130, -85, 0);
        const btnG2 = restartBtn.addComponent(Graphics);
        btnG2.fillColor = new Color(80, 176, 132);
        btnG2.roundRect(-100, -32, 200, 64, 18);
        btnG2.fill();
        btnG2.strokeColor = new Color(190, 235, 174);
        btnG2.lineWidth = 3;
        btnG2.stroke();

        const text2 = this.createUINode('BtnText2', 180, 40);
        const l2 = text2.addComponent(Label);
        l2.string = '重新开始';
        l2.fontSize = 24;
        l2.color = Color.WHITE;
        l2.isBold = true;
        restartBtn.addChild(text2);

        restartBtn.on(Node.EventType.TOUCH_END, () => {
            this.startNewGame();
        });
        panel.addChild(restartBtn);

        this.modalNode.addChild(panel);

        // 弹窗弹出动画
        panel.setScale(0, 0, 1);
        tween(panel)
            .to(0.2, { scale: v3(1.05, 1.05, 1) })
            .to(0.1, { scale: v3(1, 1, 1) })
            .start();
    }
}
