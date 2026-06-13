import { createStandardDeck, evaluatePokerHand, shuffleDeck } from './PokerHand';
import type { PlayingCard, PokerScore } from './PokerHand';

export type RoundConfig = {
    targetScore: number;
    hands: number;
    discards: number;
    handSize: number;
    maxSelected: number;
};

export type RoundStatus = 'playing' | 'won' | 'lost';

export type ToggleResult = 'selected' | 'deselected' | 'rejected';

export type PlayResult = {
    score: PokerScore;
    playedCards: PlayingCard[];
    drawnCards: PlayingCard[];
    roundScore: number;
    status: RoundStatus;
};

export type DiscardResult = {
    discardedCards: PlayingCard[];
    drawnCards: PlayingCard[];
};

/**
 * 纯规则层：一个盲注回合的完整状态机。
 * 不依赖 cc，任何环境（含 node 测试）都能跑。
 */
export class RoundEngine {
    private readonly config: RoundConfig;
    private deck: PlayingCard[] = [];
    private handCards: PlayingCard[] = [];
    private selectedCodes = new Set<string>();
    private score = 0;
    private remainingHands = 0;
    private remainingDiscards = 0;
    private roundStatus: RoundStatus = 'playing';

    constructor(config: RoundConfig) {
        this.config = config;
    }

    public start(): PlayingCard[] {
        this.deck = shuffleDeck(createStandardDeck());
        this.handCards = [];
        this.selectedCodes.clear();
        this.score = 0;
        this.remainingHands = this.config.hands;
        this.remainingDiscards = this.config.discards;
        this.roundStatus = 'playing';
        return this.draw(this.config.handSize);
    }

    public get hand(): readonly PlayingCard[] {
        return this.handCards;
    }

    public get targetScore(): number {
        return this.config.targetScore;
    }

    public get roundScore(): number {
        return this.score;
    }

    public get handsLeft(): number {
        return this.remainingHands;
    }

    public get discardsLeft(): number {
        return this.remainingDiscards;
    }

    public get deckCount(): number {
        return this.deck.length;
    }

    public get status(): RoundStatus {
        return this.roundStatus;
    }

    public get selectedCards(): PlayingCard[] {
        return this.handCards.filter((card) => this.selectedCodes.has(card.code));
    }

    public isSelected(code: string): boolean {
        return this.selectedCodes.has(code);
    }

    public get canPlay(): boolean {
        return (
            this.roundStatus === 'playing' &&
            this.remainingHands > 0 &&
            this.selectedCodes.size > 0 &&
            this.selectedCodes.size <= this.config.maxSelected
        );
    }

    public get canDiscard(): boolean {
        return (
            this.roundStatus === 'playing' &&
            this.remainingDiscards > 0 &&
            this.selectedCodes.size > 0 &&
            this.selectedCodes.size <= this.config.maxSelected
        );
    }

    public toggleSelect(code: string): ToggleResult {
        if (this.roundStatus !== 'playing' || !this.handCards.some((card) => card.code === code)) {
            return 'rejected';
        }

        if (this.selectedCodes.has(code)) {
            this.selectedCodes.delete(code);
            return 'deselected';
        }

        if (this.selectedCodes.size >= this.config.maxSelected) {
            return 'rejected';
        }

        this.selectedCodes.add(code);
        return 'selected';
    }

    public previewScore(): PokerScore | null {
        return evaluatePokerHand(this.selectedCards);
    }

    public play(): PlayResult | null {
        if (!this.canPlay) {
            return null;
        }

        const playedCards = this.selectedCards;
        const score = evaluatePokerHand(playedCards);
        if (!score) {
            return null;
        }

        this.removeFromHand(playedCards);
        this.score += score.total;
        this.remainingHands -= 1;

        if (this.score >= this.config.targetScore) {
            this.roundStatus = 'won';
        } else if (this.remainingHands <= 0) {
            this.roundStatus = 'lost';
        }

        const drawnCards = this.roundStatus === 'playing' ? this.draw(this.config.handSize - this.handCards.length) : [];

        return {
            score,
            playedCards,
            drawnCards,
            roundScore: this.score,
            status: this.roundStatus,
        };
    }

    public discard(): DiscardResult | null {
        if (!this.canDiscard) {
            return null;
        }

        const discardedCards = this.selectedCards;
        this.removeFromHand(discardedCards);
        this.remainingDiscards -= 1;

        return {
            discardedCards,
            drawnCards: this.draw(this.config.handSize - this.handCards.length),
        };
    }

    private removeFromHand(cards: PlayingCard[]): void {
        const codes = new Set(cards.map((card) => card.code));
        this.handCards = this.handCards.filter((card) => !codes.has(card.code));
        for (const code of codes) {
            this.selectedCodes.delete(code);
        }
    }

    private draw(count: number): PlayingCard[] {
        const drawn: PlayingCard[] = [];

        for (let i = 0; i < count; i += 1) {
            const card = this.deck.pop();
            if (!card) {
                break;
            }
            drawn.push(card);
            this.handCards.push(card);
        }

        return drawn;
    }
}
