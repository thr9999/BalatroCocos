import {
    _decorator,
    AudioClip,
    AudioSource,
    Button,
    CCString,
    Component,
    instantiate,
    Label,
    Node,
    Prefab,
    tween,
    Vec3,
} from 'cc';
import type { PlayingCard } from '../core/PokerHand';
import { RoundEngine } from '../core/RoundEngine';
import type { PlayResult } from '../core/RoundEngine';
import { getJokerDef, JOKER_DEFS } from '../core/Jokers';
import { BLINDS } from '../core/Blinds';
import { RunState } from '../core/RunState';
import { ShopState } from '../core/ShopState';
import { computeReward } from '../core/Economy';
import type { RewardBreakdown } from '../core/Economy';
import { CardView } from './CardView';
import { JokerRow } from './JokerRow';
import { ShopView } from './ShopView';
import { ResponsiveRoot } from './ResponsiveRoot';

const { ccclass, property } = _decorator;

/** 出牌区 / 预览区都用这个最小形状显示，PokerScore 与 ScoreResult 都满足。 */
type ScoreDisplay = {
    name: string;
    displayName: string;
    chips: number;
    mult: number;
    total: number;
};

type HandCard = {
    node: Node;
    view: CardView;
    card: PlayingCard;
};

@ccclass('HandDemo')
export class HandDemo extends Component {
    @property({ type: Prefab })
    public cardPrefab: Prefab | null = null;

    @property({ tooltip: '手牌相邻卡的中心距（tile，比卡宽小则重叠）' })
    public handSpacingTiles = 1.5;

    @property({ tooltip: '出牌区相邻卡的中心距（tile）' })
    public playSpacingTiles = 2;

    @property({ tooltip: '手牌区→出牌区的垂直距离（tile，出牌动画目标高度）' })
    public playOffsetTiles = 3.5;

    // 下面是换算出的像素值，由 applyLayout() 用上面的 tile × 基础单位算出，不在 inspector 暴露
    private startX = -360;
    private spacingX = 120;
    private cardY = 0;

    @property
    public handSize = 8;

    @property
    public maxSelected = 5;

    @property
    public maxDiscards = 3;

    @property
    public maxHands = 4;

    @property
    public startingMoney = 4;

    @property({ tooltip: '小丑牌槽位数量' })
    public jokerSlots = 5;

    @property({ type: [CCString], tooltip: '调试用：开局白送的小丑牌 id（如 j_joker），正式玩法靠商店买' })
    public debugJokerIds: string[] = [];

    @property({ type: JokerRow, tooltip: '桌面上那排小丑牌的容器（挂在 JokerArea 上），留空则只参与计分不显示' })
    public jokerRow: JokerRow | null = null;

    @property({ type: ShopView, tooltip: '商店面板（过盲注后弹出），留空则跳过商店直接进下一盲注' })
    public shopView: ShopView | null = null;

    @property({ type: Label, tooltip: 'HUD 金币显示' })
    public moneyLabel: Label | null = null;

    private playY = 220;
    private playSpacingX = 104;

    @property({ type: Label })
    public handTypeLabel: Label | null = null;

    @property({ type: Label })
    public chipsLabel: Label | null = null;

    @property({ type: Label })
    public multLabel: Label | null = null;

    @property({ type: Label })
    public totalLabel: Label | null = null;

    @property({ type: Label })
    public discardsLabel: Label | null = null;

    @property({ type: Label })
    public handsLabel: Label | null = null;

    @property({ type: Label })
    public blindLabel: Label | null = null;

    @property({ type: Label })
    public targetLabel: Label | null = null;

    @property({ type: Label })
    public scoreLabel: Label | null = null;

    @property({ type: Label })
    public anteLabel: Label | null = null;

    @property({ type: Node })
    public resultPanel: Node | null = null;

    @property({ type: Label })
    public resultTitleLabel: Label | null = null;

    @property({ type: Label })
    public resultButtonLabel: Label | null = null;

    @property({ type: Button })
    public resultButton: Button | null = null;

    @property({ type: Button })
    public playButton: Button | null = null;

    @property({ type: Button })
    public discardButton: Button | null = null;

    @property({ type: AudioSource })
    public audioSource: AudioSource | null = null;

    @property({ type: AudioClip })
    public selectSound: AudioClip | null = null;

    @property({ type: AudioClip })
    public deselectSound: AudioClip | null = null;

    @property({ type: AudioClip })
    public buttonSound: AudioClip | null = null;

    @property({ type: AudioClip })
    public chipsSound: AudioClip | null = null;

    @property({ type: AudioClip })
    public multSound: AudioClip | null = null;

    private engine: RoundEngine | null = null;
    private run: RunState | null = null;
    private shop: ShopState | null = null;
    private handCards: HandCard[] = [];
    private playedCards: HandCard[] = [];
    private acceptingInput = false;

    protected start(): void {
        this.applyLayout();
        this.setupButtons();
        this.startRun();
    }

    /** 用本组件的 tile 间距 × 当前基础单位，算出手牌/出牌的像素布局。 */
    private applyLayout(): void {
        const unit = ResponsiveRoot.current?.unit ?? ResponsiveRoot.DEFAULT_UNIT;
        this.cardY = 0;
        this.spacingX = this.handSpacingTiles * unit;
        this.playSpacingX = this.playSpacingTiles * unit;
        this.startX = -((this.handSize - 1) * this.spacingX) / 2;
        this.playY = this.playOffsetTiles * unit;
    }

    /** 开新的一局：重置金币/小丑牌/底注，再开第一回合。 */
    private startRun(): void {
        this.run = new RunState({ startingMoney: this.startingMoney, jokerSlots: this.jokerSlots });
        this.shop = new ShopState(JOKER_DEFS, { slots: 2, baseRerollCost: 5 });

        for (const id of this.debugJokerIds) {
            const def = getJokerDef(id);
            if (def) {
                this.run.addJoker(def);
            } else if (id) {
                console.warn(`[HandDemo] 未知的小丑牌 id: ${id}`);
            }
        }

        this.shopView?.close();
        this.startRound();
    }

    private startRound(): void {
        this.clearCards();
        this.hideResultPanel();
        if (!this.run) {
            return;
        }

        const jokers = this.run.jokers.slice();
        this.jokerRow?.setJokers(jokers);

        this.engine = new RoundEngine({
            targetScore: this.run.currentTarget,
            hands: this.maxHands,
            discards: this.maxDiscards,
            handSize: this.handSize,
            maxSelected: this.maxSelected,
            jokers,
        });

        const dealt = this.engine.start();
        this.acceptingInput = false;
        this.spawnCards(dealt, true);
        this.updateHandText(null);
        this.updateRoundText();

        this.playSound('select');
        this.scheduleOnce(() => {
            this.acceptingInput = true;
            this.updateHandText(null);
        }, 0.18 + Math.max(0, dealt.length - 1) * 0.035);
    }

    private onCardClicked(cardView: CardView): void {
        if (!this.acceptingInput || !this.engine || !cardView.card) {
            return;
        }

        const entry = this.handCards.find((handCard) => handCard.view === cardView);
        if (!entry) {
            return;
        }

        const result = this.engine.toggleSelect(entry.card.code);
        if (result === 'rejected') {
            return;
        }

        const selected = result === 'selected';
        entry.view.setSelected(selected);
        this.playSound(selected ? 'select' : 'deselect');
        this.updateHandText(this.engine.previewScore());
    }

    private playSelected(): void {
        if (!this.acceptingInput || !this.engine || !this.engine.canPlay) {
            return;
        }

        const selected = this.takeEntries(this.engine.selectedCards);
        const result = this.engine.play();
        if (!result) {
            return;
        }

        this.acceptingInput = false;
        this.playedCards = selected;
        this.playSound('button');

        const startX = -((selected.length - 1) * this.playSpacingX) / 2;
        for (let i = 0; i < selected.length; i += 1) {
            const entry = selected[i];
            entry.view.clearSelectedVisual();
            entry.view.setInteractable(false);
            entry.view.juice();

            const target = new Vec3(startX + i * this.playSpacingX, this.playY, 0);
            tween(entry.node)
                .delay(i * 0.04)
                .to(0.22, { position: target }, { easing: 'quadOut' })
                .call(() => entry.view.setBasePosition(target))
                .start();
        }

        this.reflowHand();
        this.updateHandText(result.score);

        this.scheduleOnce(() => this.playSound('chips'), 0.16);
        this.scheduleOnce(() => {
            this.playSound('mult');
            this.updateRoundText();
        }, 0.34);

        this.scheduleOnce(() => {
            this.clearPlayedCards();

            if (result.status === 'playing') {
                this.spawnCards(result.drawnCards, false);
                this.reflowHand();
                this.acceptingInput = true;
                this.updateHandText(null);
                return;
            }

            this.onRoundEnd(result);
        }, 0.9 + Math.max(0, selected.length - 1) * 0.04);
    }

    private discardSelected(): void {
        if (!this.acceptingInput || !this.engine || !this.engine.canDiscard) {
            return;
        }

        const selected = this.takeEntries(this.engine.selectedCards);
        const result = this.engine.discard();
        if (!result) {
            return;
        }

        this.acceptingInput = false;
        this.playSound('button');
        this.updateRoundText();

        for (let i = 0; i < selected.length; i += 1) {
            const entry = selected[i];
            entry.view.clearSelectedVisual();
            entry.view.setInteractable(false);

            tween(entry.node)
                .delay(i * 0.035)
                .to(0.18, { position: new Vec3(entry.node.position.x, this.cardY - 220, 0) }, { easing: 'quadIn' })
                .call(() => entry.node.destroy())
                .start();
        }

        this.updateHandText(null);
        this.reflowHand();

        this.scheduleOnce(() => {
            this.spawnCards(result.drawnCards, false);
            this.reflowHand();
            this.acceptingInput = true;
            this.updateHandText(null);
        }, 0.22 + Math.max(0, selected.length - 1) * 0.035);
    }

    /** 回合结束（赢/输）的总处理：赢→结算金币→进商店；输或通关→结算面板。 */
    private onRoundEnd(result: PlayResult): void {
        if (!this.run) {
            return;
        }

        if (result.status === 'lost') {
            this.showResultPanel('lost', result, null);
            return;
        }

        // 赢了：先按当前盲注结算金币（利息基于结算前的金币）
        const reward = computeReward(BLINDS[this.run.blindIndex].reward, this.engine?.handsLeft ?? 0, this.run.money);
        this.run.earn(reward.total);
        this.updateMoney();

        if (this.run.isFinalBlind) {
            this.showResultPanel('won-run', result, reward);
            return;
        }

        this.openShop(reward);
    }

    private openShop(reward: RewardBreakdown): void {
        if (!this.run || !this.shop || !this.shopView) {
            // 没接商店面板：跳过商店，直接进下一盲注
            this.run?.advanceBlind();
            this.startRound();
            return;
        }

        this.playSound('button');
        this.shop.open();
        this.shopView.open(this.run, this.shop, {
            onChanged: () => {
                this.jokerRow?.setJokers(this.run!.jokers.slice());
                this.updateMoney();
            },
            onLeave: () => {
                this.playSound('button');
                this.run!.advanceBlind();
                this.startRound();
            },
        });
        void reward;
    }

    private onResultButton(): void {
        this.playSound('button');
        this.startRun();
    }

    private showResultPanel(kind: 'lost' | 'won-run', result: PlayResult, reward: RewardBreakdown | null): void {
        const title =
            kind === 'won-run'
                ? `通关！全部底注击败${reward ? `（+$${reward.total}）` : ''}`
                : `失败 ${result.roundScore} / ${this.engine?.targetScore ?? 0}`;
        const buttonText = kind === 'won-run' ? '新的一局' : '重新开始';

        this.setLabel(this.resultTitleLabel, title);
        this.setLabel(this.resultButtonLabel, buttonText);
        if (this.resultPanel) {
            this.resultPanel.active = true;
        }
    }

    private hideResultPanel(): void {
        if (this.resultPanel) {
            this.resultPanel.active = false;
        }
    }

    private spawnCards(cards: PlayingCard[], isInitialDeal: boolean): void {
        if (!this.cardPrefab) {
            return;
        }

        const existing = this.handCards.length;
        for (let i = 0; i < cards.length; i += 1) {
            const slot = existing + i;
            const from = new Vec3(this.startX + slot * this.spacingX, this.cardY - 180, 0);
            const entry = this.createHandCard(cards[i], from);
            if (!entry) {
                continue;
            }

            if (isInitialDeal) {
                const target = new Vec3(this.startX + slot * this.spacingX, this.cardY, 0);
                tween(entry.node)
                    .delay(slot * 0.035)
                    .to(0.18, { position: target }, { easing: 'quadOut' })
                    .call(() => entry.view.setBasePosition(target))
                    .start();
            }
        }
    }

    private createHandCard(card: PlayingCard, position: Vec3): HandCard | null {
        if (!this.cardPrefab) {
            return null;
        }

        const cardNode = instantiate(this.cardPrefab) as Node;
        const cardView = cardNode.getComponent(CardView);
        if (!cardView) {
            cardNode.destroy();
            return null;
        }

        cardNode.setParent(this.node);
        cardNode.setPosition(position);
        cardView.setup(card, this.onCardClicked.bind(this));
        cardView.setBasePosition(position);

        const entry: HandCard = { node: cardNode, view: cardView, card };
        this.handCards.push(entry);

        return entry;
    }

    private takeEntries(cards: PlayingCard[]): HandCard[] {
        const codes = new Set(cards.map((card) => card.code));
        const taken = this.handCards
            .filter((entry) => codes.has(entry.card.code))
            .sort((a, b) => a.node.position.x - b.node.position.x);
        this.handCards = this.handCards.filter((entry) => !codes.has(entry.card.code));
        return taken;
    }

    private reflowHand(): void {
        const startX = -((this.handCards.length - 1) * this.spacingX) / 2;

        for (let i = 0; i < this.handCards.length; i += 1) {
            const target = new Vec3(startX + i * this.spacingX, this.cardY, 0);
            this.handCards[i].view.setBasePosition(target, false);
        }
    }

    private updateHandText(score: ScoreDisplay | null): void {
        if (!score) {
            this.setLabel(this.handTypeLabel, '');
            this.setLabel(this.chipsLabel, '0');
            this.setLabel(this.multLabel, '0');
            this.setLabel(this.totalLabel, '0');
        } else {
            this.setLabel(this.handTypeLabel, score.name);
            this.setLabel(this.chipsLabel, `${score.chips}`);
            this.setLabel(this.multLabel, `${score.mult}`);
            this.setLabel(this.totalLabel, `${score.total}`);
        }

        this.refreshActionButtons();
    }

    private updateRoundText(): void {
        if (!this.engine || !this.run) {
            return;
        }

        const blind = BLINDS[this.run.blindIndex];
        // 只填"值"，标题(Score at least / Hands / Ante 等)是格子里手写的静态英文 Label
        this.setLabel(this.blindLabel, blind.name);
        this.setLabel(this.targetLabel, `${this.engine.targetScore}`);
        this.setLabel(this.scoreLabel, `${this.engine.roundScore}`);
        this.setLabel(this.discardsLabel, `${this.engine.discardsLeft}`);
        this.setLabel(this.handsLabel, `${this.engine.handsLeft}`);
        this.setLabel(this.anteLabel, `${this.run.ante}`);
        this.updateMoney();
    }

    private updateMoney(): void {
        if (this.moneyLabel && this.run) {
            this.moneyLabel.string = `$${this.run.money}`;
        }
    }

    private refreshActionButtons(): void {
        if (this.playButton) {
            this.playButton.interactable = this.acceptingInput && !!this.engine?.canPlay;
        }
        if (this.discardButton) {
            this.discardButton.interactable = this.acceptingInput && !!this.engine?.canDiscard;
        }
    }

    private setupButtons(): void {
        if (this.playButton) {
            this.playButton.node.on(Button.EventType.CLICK, this.playSelected, this);
        }

        if (this.discardButton) {
            this.discardButton.node.on(Button.EventType.CLICK, this.discardSelected, this);
        }

        if (this.resultButton) {
            this.resultButton.node.on(Button.EventType.CLICK, this.onResultButton, this);
        }
    }

    private playSound(key: 'select' | 'deselect' | 'button' | 'chips' | 'mult'): void {
        const clip =
            key === 'select'
                ? this.selectSound
                : key === 'deselect'
                  ? this.deselectSound
                  : key === 'button'
                    ? this.buttonSound
                    : key === 'chips'
                      ? this.chipsSound
                      : this.multSound;

        if (clip && this.audioSource) {
            this.audioSource.playOneShot(clip, 0.75);
        }
    }

    private setLabel(label: Label | null, text: string): void {
        if (label) {
            label.string = text;
        }
    }

    private clearCards(): void {
        for (const entry of this.handCards.concat(this.playedCards)) {
            entry.node.destroy();
        }
        this.handCards = [];
        this.playedCards = [];
    }

    private clearPlayedCards(): void {
        for (const entry of this.playedCards) {
            entry.node.destroy();
        }
        this.playedCards = [];
    }
}
