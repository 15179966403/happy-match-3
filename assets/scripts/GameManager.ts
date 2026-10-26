import { _decorator, Component, Node, Graphics, UITransform, Label, Color, v3, Vec3, EventTouch, tween, Tween, Layers, Camera } from 'cc';
import { AnimalType, SpecialType, TileData, MatchGroup, GAME_CONFIG } from './Types';
import { TileItem } from './TileItem';
import { MatchLogic } from './MatchLogic';
import { AudioService } from './AudioService';

const { ccclass } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    // 节点容器
    private boardContainer: Node = null!;
    private tileItems: (TileItem | null)[][] = [];
    private gridData: (TileData | null)[][] = [];

    // UI 组件
    private scoreLabel: Label = null!;
    private movesLabel: Label = null!;
    private bannerNode: Node = null!;
    private bannerLabel: Label = null!;
    private modalNode: Node = null!;

    // 游戏数值
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

        this.buildGameUI();
        this.startNewGame();
    }

    /**
     * 构建高美感糖果森林童话 UI
     */
    private buildGameUI() {
        // 1. 梦幻晨曦森林背景
        const bgNode = this.createUINode('Background', 750, 1334);
        const bgG = bgNode.addComponent(Graphics);

        // 主底色：天空水蓝
        bgG.fillColor = new Color(225, 245, 255);
        bgG.rect(-375, -667, 750, 1334);
        bgG.fill();

        // 柔和薄荷青草丘陵色块
        bgG.fillColor = new Color(205, 238, 225);
        bgG.circle(-180, -450, 320);
        bgG.circle(220, -500, 360);
        bgG.fill();

        // 梦幻柔光光斑
        bgG.fillColor = new Color(255, 255, 255, 120);
        bgG.circle(-160, 380, 140);
        bgG.circle(180, 220, 180);
        bgG.circle(0, -120, 260);
        bgG.fill();

        this.node.addChild(bgNode);

        // 2. 顶部主标题 (带立体厚边与爱心挂饰)
        const titleNode = this.createUINode('Title', 500, 80);
        titleNode.setPosition(0, 565, 0);

        const titleG = titleNode.addComponent(Graphics);
        titleG.fillColor = new Color(255, 255, 255, 220);
        titleG.roundRect(-210, -32, 420, 64, 32);
        titleG.fill();
        titleG.strokeColor = new Color(255, 205, 75);
        titleG.lineWidth = 3.5;
        titleG.stroke();

        const titleTextNode = this.createUINode('TitleText', 460, 60);
        const titleLabel = titleTextNode.addComponent(Label);
        titleLabel.string = '✨ 开心消消乐 ✨';
        titleLabel.fontSize = 36;
        titleLabel.lineHeight = 38;
        titleLabel.color = new Color(75, 45, 30);
        titleLabel.isBold = true;
        titleNode.addChild(titleTextNode);
        this.node.addChild(titleNode);

        // 标题轻微治愈悬浮呼吸动画
        tween(titleNode)
            .to(1.8, { position: v3(0, 570, 0) }, { easing: 'sineInOut' })
            .to(1.8, { position: v3(0, 560, 0) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();

        // 3. 计分板与步数信息栏 (果冻曲奇立体卡片)
        const infoBar = this.createUINode('InfoBar', 700, 110);
        infoBar.setPosition(0, 465, 0);
        this.node.addChild(infoBar);

        // 步数卡片 (金黄香脆曲奇风)
        const movesCard = this.createUINode('MovesCard', 220, 84);
        movesCard.setPosition(-165, 0, 0);
        const movesBg = movesCard.addComponent(Graphics);

        // 阴影底衬
        movesBg.fillColor = new Color(210, 105, 0);
        movesBg.roundRect(-102, -40, 204, 80, 22);
        movesBg.fill();

        // 表面亮色卡板
        movesBg.fillColor = new Color(255, 155, 25);
        movesBg.roundRect(-102, -36, 204, 76, 20);
        movesBg.fill();

        // 顶部高光条
        movesBg.fillColor = new Color(255, 255, 255, 70);
        movesBg.roundRect(-90, 8, 180, 16, 8);
        movesBg.fill();

        const movesText = this.createUINode('MovesText', 200, 50);
        this.movesLabel = movesText.addComponent(Label);
        this.movesLabel.string = `⚡ 步数: ${this.remainingMoves}`;
        this.movesLabel.fontSize = 25;
        this.movesLabel.lineHeight = 26;
        this.movesLabel.color = Color.WHITE;
        this.movesLabel.isBold = true;
        movesCard.addChild(movesText);
        infoBar.addChild(movesCard);

        // 分数卡片 (翡翠薄荷糖果风)
        const scoreCard = this.createUINode('ScoreCard', 250, 84);
        scoreCard.setPosition(165, 0, 0);
        const scoreBg = scoreCard.addComponent(Graphics);

        // 阴影底衬
        scoreBg.fillColor = new Color(25, 135, 80);
        scoreBg.roundRect(-122, -40, 244, 80, 22);
        scoreBg.fill();

        // 表面亮色卡板
        scoreBg.fillColor = new Color(46, 204, 113);
        scoreBg.roundRect(-122, -36, 244, 76, 20);
        scoreBg.fill();

        // 顶部高光条
        scoreBg.fillColor = new Color(255, 255, 255, 70);
        scoreBg.roundRect(-110, 8, 220, 16, 8);
        scoreBg.fill();

        const scoreText = this.createUINode('ScoreText', 230, 50);
        this.scoreLabel = scoreText.addComponent(Label);
        this.scoreLabel.string = `⭐ 得分: 0 / ${GAME_CONFIG.TARGET_SCORE}`;
        this.scoreLabel.fontSize = 20;
        this.scoreLabel.lineHeight = 22;
        this.scoreLabel.color = Color.WHITE;
        this.scoreLabel.isBold = true;
        scoreCard.addChild(scoreText);
        infoBar.addChild(scoreCard);

        // 4. 棋盘底盘 (果冻模具立体凹槽底盘)
        const totalW = GAME_CONFIG.COLS * (GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_GAP) + 20;
        const totalH = GAME_CONFIG.ROWS * (GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_GAP) + 20;

        const boardBgNode = this.createUINode('BoardBackground', totalW, totalH);
        boardBgNode.setPosition(0, -35, 0);
        const boardBgG = boardBgNode.addComponent(Graphics);

        // 外层阴影底座
        boardBgG.fillColor = new Color(160, 190, 215, 180);
        boardBgG.roundRect(-totalW / 2, -totalH / 2 - 8, totalW, totalH + 8, 30);
        boardBgG.fill();

        // 奶油白象牙底盘
        boardBgG.fillColor = new Color(248, 252, 255);
        boardBgG.roundRect(-totalW / 2, -totalH / 2, totalW, totalH, 28);
        boardBgG.fill();

        // 边框描边
        boardBgG.strokeColor = new Color(205, 225, 245);
        boardBgG.lineWidth = 4;
        boardBgG.stroke();

        // 内部温和半透明冰晶层
        boardBgG.fillColor = new Color(228, 240, 252, 210);
        boardBgG.roundRect(-totalW / 2 + 6, -totalH / 2 + 6, totalW - 12, totalH - 12, 24);
        boardBgG.fill();

        // 绘制每个单元格的内凹布丁凹槽
        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                const pos = TileItem.getPos(r, c);
                const half = GAME_CONFIG.TILE_SIZE / 2;

                // 凹槽内暗角
                boardBgG.fillColor = new Color(195, 215, 235, 140);
                boardBgG.roundRect(pos.x - half + 1, pos.y - half + 1, GAME_CONFIG.TILE_SIZE - 2, GAME_CONFIG.TILE_SIZE - 2, 16);
                boardBgG.fill();

                // 凹槽下缘高光线 (增强立体下沉深度)
                boardBgG.fillColor = new Color(255, 255, 255, 180);
                boardBgG.roundRect(pos.x - half + 3, pos.y - half + 3, GAME_CONFIG.TILE_SIZE - 6, GAME_CONFIG.TILE_SIZE - 8, 14);
                boardBgG.fill();
            }
        }
        this.node.addChild(boardBgNode);

        // 5. 棋盘动物元素容器
        this.boardContainer = this.createUINode('BoardContainer', totalW, totalH);
        this.boardContainer.setPosition(0, -35, 0);
        this.node.addChild(this.boardContainer);

        // 监听全局触摸
        this.boardContainer.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.boardContainer.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.boardContainer.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.boardContainer.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        // 6. 浮动连击/赞美飘字节点 (Combo Banner)
        this.bannerNode = this.createUINode('BannerNode', 340, 80);
        this.bannerNode.setPosition(0, 75, 0);
        this.bannerNode.setScale(0, 0, 1);

        const bannerG = this.bannerNode.addComponent(Graphics);
        bannerG.fillColor = new Color(255, 75, 95);
        bannerG.roundRect(-160, -38, 320, 76, 24);
        bannerG.fill();
        bannerG.strokeColor = new Color(255, 225, 90);
        bannerG.lineWidth = 4;
        bannerG.stroke();

        const bannerTextNode = this.createUINode('BannerText', 300, 60);
        this.bannerLabel = bannerTextNode.addComponent(Label);
        this.bannerLabel.fontSize = 32;
        this.bannerLabel.color = Color.WHITE;
        this.bannerLabel.isBold = true;
        this.bannerNode.addChild(bannerTextNode);
        this.node.addChild(this.bannerNode);

        // 7. 结算弹窗模态层
        this.modalNode = this.createUINode('ModalNode', 750, 1334);
        this.modalNode.active = false;
        this.node.addChild(this.modalNode);
    }

    /**
     * 开启新一局游戏
     */
    public startNewGame() {
        this.isGameOver = false;
        this.score = 0;
        this.remainingMoves = GAME_CONFIG.MAX_MOVES;
        this.currentCombo = 0;
        this.modalNode.active = false;
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

    private updateUI() {
        if (this.movesLabel) this.movesLabel.string = `⚡ 步数: ${this.remainingMoves}`;
        if (this.scoreLabel) this.scoreLabel.string = `⭐ 得分: ${this.score} / ${GAME_CONFIG.TARGET_SCORE}`;
    }

    // ==================== 触摸与滑动手势交互 ====================

    private onTouchStart(event: EventTouch) {
        if (this.isBusy || this.isGameOver) return;
        AudioService.enableAudioOnFirstTouch();

        const loc = event.getUILocation();
        const localPos = this.boardContainer.getComponent(UITransform)!.convertToNodeSpaceAR(v3(loc.x, loc.y, 0));
        const tile = this.getTileAtPos(localPos);

        if (tile) {
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

        // 如果是特效双组合，优先执行特效组合爆发
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
     * 判断是否是双特殊元素交换
     */
    private checkSpecialCombo(t1: TileItem, t2: TileItem): boolean {
        return (t1.data.special === SpecialType.RAINBOW || t2.data.special === SpecialType.RAINBOW) ||
               (t1.data.special !== SpecialType.NONE && t2.data.special !== SpecialType.NONE);
    }

    /**
     * 执行双特殊元素互换的爆炸效果
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
        // 5. 魔力鸟 + 条纹动物：全屏同色动物全部转变为条纹，并同时触发
        else if ((s1 === SpecialType.RAINBOW && (s2 === SpecialType.HORIZONTAL || s2 === SpecialType.VERTICAL)) ||
                 (s2 === SpecialType.RAINBOW && (s1 === SpecialType.HORIZONTAL || s1 === SpecialType.VERTICAL))) {
            AudioService.playRainbow();
            const stripeTile = s1 === SpecialType.RAINBOW ? t2 : t1;
            const targetColor = stripeTile.data.type;
            toEliminate.add(t1.data);
            toEliminate.add(t2.data);
            for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
                for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                    const item = this.gridData[r][c];
                    if (item && item.type === targetColor) {
                        item.special = Math.random() > 0.5 ? SpecialType.HORIZONTAL : SpecialType.VERTICAL;
                        const view = this.tileItems[r][c];
                        if (view) view.renderView();
                        toEliminate.add(item);
                    }
                }
            }
        }
        // 6. 魔力鸟 + 普通动物：全屏同色消除
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
        const { drops, newTiles } = MatchLogic.calculateDrop(this.gridData);
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

        const words = ['Good!', 'Great!', 'Amazing!', 'Unbelievable!', '炸裂连击!'];
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
     * 胜负判定与防死局洗牌检测
     */
    private checkGameStatus() {
        // 胜利达成目标
        if (this.score >= GAME_CONFIG.TARGET_SCORE) {
            this.isGameOver = true;
            AudioService.playWin();
            this.showEndModal(true, '🎉 恭喜通关！', `最终得分: ${this.score}\n太棒了，完美通关！`);
            return;
        }

        // 步数耗尽失败
        if (this.remainingMoves <= 0) {
            this.isGameOver = true;
            this.showEndModal(false, '💔 步数用尽', `当前得分: ${this.score}\n离目标还差一点点，再来一次吧！`);
            return;
        }

        // 死局检测
        if (!MatchLogic.hasValidMove(this.gridData)) {
            this.showShuffleNotice();
        }
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
     * 结算模态弹窗
     */
    private showEndModal(isWin: boolean, title: string, desc: string) {
        this.modalNode.removeAllChildren();
        this.modalNode.active = true;

        // 半透明遮罩
        const mask = this.createUINode('Mask', 750, 1334);
        const maskG = mask.addComponent(Graphics);
        maskG.fillColor = new Color(0, 0, 0, 150);
        maskG.rect(-375, -667, 750, 1334);
        maskG.fill();
        this.modalNode.addChild(mask);

        // 对话框面板
        const panel = this.createUINode('Panel', 500, 360);
        const panelG = panel.addComponent(Graphics);
        panelG.fillColor = Color.WHITE;
        panelG.roundRect(-250, -180, 500, 360, 28);
        panelG.fill();

        panelG.strokeColor = isWin ? new Color(255, 205, 50) : new Color(200, 215, 230);
        panelG.lineWidth = 4;
        panelG.stroke();

        // 标题
        const titleN = this.createUINode('Title', 440, 50);
        titleN.setPosition(0, 95, 0);
        const titleL = titleN.addComponent(Label);
        titleL.string = title;
        titleL.fontSize = 36;
        titleL.color = isWin ? new Color(255, 140, 0) : new Color(100, 100, 100);
        titleL.isBold = true;
        panel.addChild(titleN);

        // 描述
        const descN = this.createUINode('Desc', 440, 90);
        descN.setPosition(0, 15, 0);
        const descL = descN.addComponent(Label);
        descL.string = desc;
        descL.fontSize = 24;
        descL.lineHeight = 34;
        descL.color = new Color(80, 80, 80);
        panel.addChild(descN);

        // 重新开始按钮
        const btnNode = this.createUINode('RestartBtn', 260, 68);
        btnNode.setPosition(0, -95, 0);
        const btnG = btnNode.addComponent(Graphics);
        btnG.fillColor = isWin ? new Color(46, 204, 113) : new Color(52, 152, 219);
        btnG.roundRect(-130, -34, 260, 68, 20);
        btnG.fill();

        const btnText = this.createUINode('BtnText', 220, 40);
        const btnL = btnText.addComponent(Label);
        btnL.string = isWin ? '下一关' : '再试一次';
        btnL.fontSize = 28;
        btnL.color = Color.WHITE;
        btnL.isBold = true;
        btnNode.addChild(btnText);

        btnNode.on(Node.EventType.TOUCH_END, () => {
            this.startNewGame();
        });

        panel.addChild(btnNode);
        this.modalNode.addChild(panel);

        // 弹窗弹出动画
        panel.setScale(0, 0, 1);
        tween(panel)
            .to(0.2, { scale: v3(1.05, 1.05, 1) })
            .to(0.1, { scale: v3(1, 1, 1) })
            .start();
    }
}
