import { _decorator, Component, instantiate, Node, Prefab, Vec3 } from 'cc';
import type { JokerInstance } from '../core/JokerEffect';
import { JokerView } from './JokerView';

const { ccclass, property } = _decorator;

/**
 * 桌面上那一排小丑牌的容器，挂在 JokerArea 节点上。
 * HandDemo 把当前生效的小丑牌交给它，它负责生成/排列/清空 JokerView。
 * 显示顺序＝结算顺序（从左到右），和计分管线保持一致。
 */
@ccclass('JokerRow')
export class JokerRow extends Component {
    @property({ type: Prefab, tooltip: 'JokerView 预制体' })
    public jokerPrefab: Prefab | null = null;

    @property({ tooltip: '相邻小丑牌的水平间距' })
    public spacingX = 120;

    @property({ tooltip: '整排在父节点内的垂直位置' })
    public rowY = 0;

    private views: JokerView[] = [];

    public setJokers(jokers: JokerInstance[]): void {
        this.clear();

        if (!this.jokerPrefab) {
            return;
        }

        const startX = -((jokers.length - 1) * this.spacingX) / 2;
        for (let i = 0; i < jokers.length; i += 1) {
            const node = instantiate(this.jokerPrefab) as Node;
            const view = node.getComponent(JokerView);
            if (!view) {
                node.destroy();
                continue;
            }

            node.setParent(this.node);
            view.setup(jokers[i].def);

            const position = new Vec3(startX + i * this.spacingX, this.rowY, 0);
            node.setPosition(position);
            view.setBasePosition(position);
            this.views.push(view);
        }
    }

    public clear(): void {
        for (const view of this.views) {
            view.node.destroy();
        }
        this.views = [];
    }
}
