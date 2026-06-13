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
import { getJokerDef } from '../core/Jokers';
import type { JokerInstance } from '../core/JokerEffect';

/** 出牌区 / 预览区都用这个最小形状显示，PokerScore 与 ScoreResult 都满足。 */
type ScoreDisplay = {
    name: string;
    displayName: string;
    chips: number;
    mult: number;
    total: number;
};
import { BLINDS, MAX_ANTE, getBlindTarget } from '../core/Blinds';
import { CardView } from './CardView';

const { ccclass, property } = _decorator;

type HandCard = {
    node: Node;
    view: CardView;
    card: PlayingCard;
};

@ccclass('HandDemo')
export class HandDemo extends Component {
    @property({ type: Prefab })
    public cardPrefab: Prefab | null = null;

    @property
    public startX = -360;

    @property
    public spacingX = 120;

    @property
    public cardY = 0;

    @property
    public handSize = 8;

    @property
    public maxSelected = 5;

    @property
    public maxDiscards = 3;

    @property
    public maxHands = 4;

    @property({ type: [CCString], tooltip: '调试用：填小丑牌 id（如 j_joker / j_duo）即在本局生效，正式版改由商店给牌' })
    public debugJokerIds: string[] = [];

    @property
    public playY = 220;

    @property
    public playSpacingX = 104;

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
    private ante = 1;
    private blindIndex = 0;
    private handCards: HandCard[] = [];
    private playedCards: HandCard[] = [];
    private acceptingInput = false;

    protected start(): void {
        this.setupButtons();
        this.startRound();
    }

    private buildJokers(): JokerInstance[] {
        const jokers: JokerInstance[] = [];
        for (const id of this.debugJokerIds) {
            const def = getJokerDef(id);
            if (def) {
                jokers.push({ def });
            } else if (id) {
                console.warn(`[HandDemo] 未知的小丑牌 id: ${id}`);
            }
        }
        return jokers;
    }

    private startRound(): void {
        this.clearCards();
        this.hideResultPanel();

        this.engine = new RoundEngine({
            targetScore: getBlindTarget(this.ante, this.blindIndex),
            hands: this.maxHands,
            discards: this.maxDiscards,
            handSize: this.handSize,
            maxSelected: this.maxSelected,
            jokers: this.buildJokers(),
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

            this.showResultPanel(result);
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

    private onResultButton(): void {
        if (!this.engine) {
            return;
        }

        this.playSound('button');

        if (this.engine.status === 'won') {
            this.blindIndex += 1;
            if (this.blindIndex >= BLINDS.length) {
                this.blindIndex = 0;
                this.ante += 1;
            }
            if (this.ante > MAX_ANTE) {
                this.ante = 1;
                this.blindIndex = 0;
            }
        } else {
            this.ante = 1;
            this.blindIndex = 0;
        }

        this.startRound();
    }

    private showResultPanel(result: PlayResult): void {
        const runWon = result.status === 'won' && this.ante === MAX_ANTE && this.blindIndex === BLINDS.length - 1;
        const title =
            result.status === 'won'
                ? runWon
                    ? `通关！底注 ${this.ante} 全部击败`
                    : `${BLINDS[this.blindIndex].name} 通过！`
                : `失败 ${result.roundScore} / ${this.engine?.targetScore ?? 0}`;
        const buttonText = result.status === 'won' ? (runWon ? '新的一局' : '下一盲注') : '重新开始';

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
            this.setLabel(this.chipsLabel, 'Chips 0');
            this.setLabel(this.multLabel, 'Mult 0');
            this.setLabel(this.totalLabel, 'Total 0');
        } else {
            this.setLabel(this.handTypeLabel, `${score.displayName} / ${score.name}`);
            this.setLabel(this.chipsLabel, `Chips ${score.chips}`);
            this.setLabel(this.multLabel, `Mult ${score.mult}`);
            this.setLabel(this.totalLabel, `Total ${score.total}`);
        }

        this.refreshActionButtons();
    }

    private updateRoundText(): void {
        if (!this.engine) {
            return;
        }

        const blind = BLINDS[this.blindIndex];
        this.setLabel(this.blindLabel, `底注 ${this.ante} · ${blind.name}`);
        this.setLabel(this.targetLabel, `目标 ${this.engine.targetScore}`);
        this.setLabel(this.scoreLabel, `得分 ${this.engine.roundScore}`);
        this.setLabel(this.discardsLabel, `Discards ${this.engine.discardsLeft}`);
        this.setLabel(this.handsLabel, `Hands ${this.engine.handsLeft}`);
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
