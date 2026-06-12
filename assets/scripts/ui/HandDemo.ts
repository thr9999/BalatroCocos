import {
    _decorator,
    AudioClip,
    AudioSource,
    Button,
    Component,
    instantiate,
    Label,
    Node,
    Prefab,
    tween,
    Vec3,
} from 'cc';
import { createStandardDeck, evaluatePokerHand, shuffleDeck } from '../core/PokerHand';
import type { PlayingCard, PokerScore } from '../core/PokerHand';
import { CardView } from './CardView';

const { ccclass, property } = _decorator;

type HandCard = {
    node: Node;
    view: CardView;
    card: PlayingCard;
    selected: boolean;
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

    private deck: PlayingCard[] = [];
    private handCards: HandCard[] = [];
    private playedCards: HandCard[] = [];
    private acceptingInput = true;

    protected start(): void {
        this.setupButtons();
        this.startRound();
    }

    private startRound(): void {
        this.clearCards();
        this.deck = shuffleDeck(createStandardDeck());
        this.acceptingInput = false;
        this.dealHand();
        this.updateHandText(null);
    }

    private dealHand(): void {
        if (!this.cardPrefab) {
            this.acceptingInput = true;
            return;
        }

        for (let i = 0; i < this.handSize; i += 1) {
            const card = this.deck.pop();
            if (!card) {
                return;
            }

            const cardNode = instantiate(this.cardPrefab) as Node;
            const cardView = cardNode.getComponent(CardView);
            if (!cardView) {
                cardNode.destroy();
                continue;
            }

            cardNode.setParent(this.node);
            cardView.setup(card, this.onCardClicked.bind(this));

            const handCard: HandCard = {
                node: cardNode,
                view: cardView,
                card,
                selected: false,
            };
            this.handCards.push(handCard);

            const position = new Vec3(this.startX + i * this.spacingX, this.cardY - 180, 0);
            cardNode.setPosition(position);
            cardView.setBasePosition(position);
            tween(cardNode)
                .delay(i * 0.035)
                .to(0.18, { position: new Vec3(this.startX + i * this.spacingX, this.cardY, 0) }, { easing: 'quadOut' })
                .call(() => cardView.setBasePosition(new Vec3(this.startX + i * this.spacingX, this.cardY, 0)))
                .start();
        }

        this.playSound('select');
        this.scheduleOnce(() => {
            this.acceptingInput = true;
        }, 0.18 + Math.max(0, this.handSize - 1) * 0.035);
    }

    private onCardClicked(cardView: CardView): void {
        if (!this.acceptingInput || !cardView.card) {
            return;
        }

        const handCard = this.handCards.find((entry) => entry.view === cardView);
        if (!handCard) {
            return;
        }

        if (!handCard.selected && this.getSelectedCards().length >= this.maxSelected) {
            return;
        }

        handCard.selected = !handCard.selected;
        handCard.view.setSelected(handCard.selected);
        this.playSound(handCard.selected ? 'select' : 'deselect');
        this.updateHandText(this.evaluateSelection());
    }

    private playSelected(): void {
        if (!this.acceptingInput) {
            return;
        }

        const selected = this.getSelectedCards().sort((a, b) => a.node.position.x - b.node.position.x);
        if (selected.length === 0 || selected.length > this.maxSelected) {
            return;
        }

        const score = this.evaluateSelection();
        this.acceptingInput = false;
        this.playSound('button');
        selected.forEach((entry) => entry.view.setInteractable(false));

        const startX = -((selected.length - 1) * this.playSpacingX) / 2;
        for (let i = 0; i < selected.length; i += 1) {
            const entry = selected[i];
            entry.selected = false;
            entry.view.clearSelectedVisual();
            entry.view.juice();

            const target = new Vec3(startX + i * this.playSpacingX, this.playY, 0);
            tween(entry.node)
                .delay(i * 0.04)
                .to(0.22, { position: target }, { easing: 'quadOut' })
                .call(() => entry.view.setBasePosition(target))
                .start();
        }

        this.handCards = this.handCards.filter((entry) => !selected.includes(entry));
        this.playedCards = selected;
        this.reflowHand();
        this.updateHandText(score);

        this.scheduleOnce(() => this.playSound('chips'), 0.16);
        this.scheduleOnce(() => this.playSound('mult'), 0.34);
    }

    private reflowHand(): void {
        const startX = -((this.handCards.length - 1) * this.spacingX) / 2;

        for (let i = 0; i < this.handCards.length; i += 1) {
            const target = new Vec3(startX + i * this.spacingX, this.cardY, 0);
            this.handCards[i].view.setBasePosition(target, false);
        }
    }

    private evaluateSelection(): PokerScore | null {
        const selectedCards = this.getSelectedCards().map((entry) => entry.card);
        return evaluatePokerHand(selectedCards);
    }

    private getSelectedCards(): HandCard[] {
        return this.handCards.filter((entry) => entry.selected);
    }

    private updateHandText(score: PokerScore | null): void {
        if (!score) {
            this.setLabel(this.handTypeLabel, '');
            this.setLabel(this.chipsLabel, 'Chips 0');
            this.setLabel(this.multLabel, 'Mult 0');
            this.setLabel(this.totalLabel, 'Total 0');
            this.setButtonInteractable(false);
            return;
        }

        this.setLabel(this.handTypeLabel, `${score.displayName} / ${score.name}`);
        this.setLabel(this.chipsLabel, `Chips ${score.chips}`);
        this.setLabel(this.multLabel, `Mult ${score.mult}`);
        this.setLabel(this.totalLabel, `Total ${score.total}`);
        this.setButtonInteractable(this.getSelectedCards().length > 0 && this.getSelectedCards().length <= this.maxSelected);
    }

    private setButtonInteractable(enabled: boolean): void {
        if (this.playButton) {
            this.playButton.interactable = enabled && this.acceptingInput;
        }
    }

    private setupButtons(): void {
        if (this.playButton) {
            this.playButton.node.on(Button.EventType.CLICK, this.playSelected, this);
        }

        if (this.discardButton) {
            this.discardButton.node.on(Button.EventType.CLICK, this.startRound, this);
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
}
