# 果园奇遇 · Happy Match-3

基于 **Cocos Creator 3.8 / TypeScript** 的原创童话果园三消游戏。滑动或点选交换棋子，四连生成横向或纵向特殊动物，五连生成彩鸟，L/T 消除生成发光爆炸动物。

## 视觉设计

- 原创果园背景、五种动物棋子、各动物的横向/纵向/爆炸状态、彩鸟，以及冰块和藤蔓障碍物贴图。
- 五种动物分别拥有三张完整特殊状态图片，共 15 张。特殊状态保留原动物的颜色和特征，没有叠加的独立道具图标。
- 奶油色信息卡、目标进度条、暖色棋盘、底部提示栏和统一配色的结算弹窗。
- 道具触发时显示行列扫光、范围扩散光环和彩鸟连线；新道具生成时带弹出动画。
- 横向、纵向和爆炸动物需要与同种普通动物匹配才会触发；彩鸟与任何动物交换可直接触发，两个特殊动物交换可触发组合效果。

所有美术源文件位于 `assets/textures/`。运行时由 `VisualAssets.ts` 预加载内嵌图片，确保首帧不会显示旧图或临时占位图。棋子和背景由 `ArtFactory.ts` 转为 Cocos SpriteFrame。

## 运行

1. 用 **Cocos Creator 3.8.x** 打开项目。
2. 打开 `assets/scene.scene`。
3. 点击编辑器顶部的运行预览按钮，推荐使用浏览器预览。

## 主要代码

- `assets/scripts/GameManager.ts`：界面、棋盘、交互、消除和视觉反馈。
- `assets/scripts/MatchLogic.ts`：匹配、特殊道具组合、掉落和洗牌。
- `assets/scripts/TileItem.ts`：单个棋子的显示与移动动画。
- `assets/scripts/ArtFactory.ts`、`VisualAssets.ts`：贴图预加载和 SpriteFrame 创建。
- `assets/scripts/AudioService.ts`：程序生成音效。
