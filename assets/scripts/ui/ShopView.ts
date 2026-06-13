import { _decorator, Button, Component, instantiate, Label, Node, Prefab, Vec3 } from 'cc';
import type { RunState } from '../core/RunState';
import type { ShopState } from '../core/ShopState';
import { JokerView } from './JokerView';

const { ccclass, property } = _decorator;

export type ShopCallbacks = {
    /** 买/重摇后通知外部刷新（持有小丑牌行、HUD 金币等）。 */
    onChanged: () => void;
    /** 点击离开商店（进入下一盲注）。 */
    onLeave: () => void;
};

/**
 * 商店表现层。挂在商店面板节点上。
 * 货架复用 JokerView 预制体；买/重摇的扣款走 RunState，摆货走 ShopState。
 */
@ccclass('ShopView')
export class ShopView extends Component {
    @property({ type: Node, tooltip: '商店面板根节点（会被开关 active）' })
    public panel: Node | null = null;

    @property({ type: Node, tooltip: '货架容器，offer 会生成在这下面' })
    public offerContainer: Node | null = null;

    @property({ type: Prefab, tooltip: 'JokerView 预制体（和桌面小丑牌同一个）' })
    public offerPrefab: Prefab | null = null;

    @property({ tooltip: '货位水平间距' })
    public offerSpacingX = 130;

    @property({ type: Label, tooltip: '金币显示' })
    public moneyLabel: Label | null = null;

    @property({ type: Button, tooltip: '重摇按钮' })
    public rerollButton: Button | null = null;

    @property({ type: Label, tooltip: '重摇花费显示' })
    public rerollCostLabel: Label | null = null;

    @property({ type: Button, tooltip: '离开商店按钮' })
    public leaveButton: Button | null = null;

    private run: RunState | null = null;
    private shop: ShopState | null = null;
    private callbacks: ShopCallbacks | null = null;
    private offerViews: JokerView[] = [];

    protected onLoad(): void {
        this.rerollButton?.node.on(Button.EventType.CLICK, this.onReroll, this);
        this.leaveButton?.node.on(Button.EventType.CLICK, this.onLeave, this);
    }

    public open(run: RunState, shop: ShopState, callbacks: ShopCallbacks): void {
        this.run = run;
        this.shop = shop;
        this.callbacks = callbacks;
        if (this.panel) {
            this.panel.active = true;
        }
        this.render();
    }

    public close(): void {
        this.clearOffers();
        if (this.panel) {
            this.panel.active = false;
        }
    }

    private render(): void {
        this.renderOffers();
        this.updateMoney();
        this.updateReroll();
    }

    private renderOffers(): void {
        this.clearOffers();
        if (!this.shop || !this.offerPrefab || !this.offerContainer) {
            return;
        }

        const offers = this.shop.offers;
        const startX = -((offers.length - 1) * this.offerSpacingX) / 2;
        for (let i = 0; i < offers.length; i += 1) {
            const offer = offers[i];
            const node = instantiate(this.offerPrefab) as Node;
            const view = node.getComponent(JokerView);
            if (!view) {
                node.destroy();
                continue;
            }

            node.setParent(this.offerContainer);
            node.setPosition(new Vec3(startX + i * this.offerSpacingX, 0, 0));

            if (offer.sold) {
                node.active = false;
            } else {
                const index = i;
                view.setup(offer.def, () => this.onBuy(index));
                view.setBasePosition(new Vec3(startX + i * this.offerSpacingX, 0, 0));
                view.setPrice(offer.cost);
            }

            this.offerViews.push(view);
        }
    }

    private onBuy(index: number): void {
        if (!this.run || !this.shop || !this.callbacks) {
            return;
        }

        const offer = this.shop.offers[index];
        if (!offer || offer.sold) {
            return;
        }
        if (!this.run.hasFreeJokerSlot || this.run.money < offer.cost) {
            return;
        }
        if (!this.run.trySpend(offer.cost)) {
            return;
        }

        this.run.addJoker(offer.def);
        this.shop.markSold(index);
        this.render();
        this.callbacks.onChanged();
    }

    private onReroll(): void {
        if (!this.run || !this.shop) {
            return;
        }
        if (!this.run.trySpend(this.shop.rerollCost)) {
            return;
        }

        this.shop.reroll();
        this.render();
        this.callbacks?.onChanged();
    }

    private onLeave(): void {
        this.close();
        this.callbacks?.onLeave();
    }

    private updateMoney(): void {
        if (this.moneyLabel && this.run) {
            this.moneyLabel.string = `$${this.run.money}`;
        }
    }

    private updateReroll(): void {
        if (this.rerollCostLabel && this.shop) {
            this.rerollCostLabel.string = `重摇 $${this.shop.rerollCost}`;
        }
        if (this.rerollButton && this.run && this.shop) {
            this.rerollButton.interactable = this.run.money >= this.shop.rerollCost;
        }
    }

    private clearOffers(): void {
        for (const view of this.offerViews) {
            view.node.destroy();
        }
        this.offerViews = [];
    }
}
