export type Suit = 'Hearts' | 'Clubs' | 'Diamonds' | 'Spades';
export type RankCode = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type PokerHandName =
    | 'Straight Flush'
    | 'Four of a Kind'
    | 'Full House'
    | 'Flush'
    | 'Straight'
    | 'Three of a Kind'
    | 'Two Pair'
    | 'Pair'
    | 'High Card';

export type PlayingCard = {
    code: string;
    suit: Suit;
    rank: RankCode;
    rankId: number;
    chips: number;
    col: number;
    row: number;
};

export type PokerScore = {
    name: PokerHandName;
    displayName: string;
    baseChips: number;
    cardChips: number;
    chips: number;
    mult: number;
    total: number;
    scoringCards: PlayingCard[];
};

const SUITS: Suit[] = ['Hearts', 'Clubs', 'Diamonds', 'Spades'];
const SUIT_PREFIX: Record<Suit, string> = {
    Hearts: 'H',
    Clubs: 'C',
    Diamonds: 'D',
    Spades: 'S',
};
const RANKS: RankCode[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const RANK_ID: Record<RankCode, number> = {
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    T: 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
};
const RANK_CHIPS: Record<RankCode, number> = {
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    T: 10,
    J: 10,
    Q: 10,
    K: 10,
    A: 11,
};

const HAND_VALUES: Record<PokerHandName, { chips: number; mult: number; displayName: string }> = {
    'Straight Flush': { chips: 100, mult: 8, displayName: '同花顺' },
    'Four of a Kind': { chips: 60, mult: 7, displayName: '四条' },
    'Full House': { chips: 40, mult: 4, displayName: '葫芦' },
    Flush: { chips: 35, mult: 4, displayName: '同花' },
    Straight: { chips: 30, mult: 4, displayName: '顺子' },
    'Three of a Kind': { chips: 30, mult: 3, displayName: '三条' },
    'Two Pair': { chips: 20, mult: 2, displayName: '两对' },
    Pair: { chips: 10, mult: 2, displayName: '对子' },
    'High Card': { chips: 5, mult: 1, displayName: '高牌' },
};

export function createStandardDeck(): PlayingCard[] {
    const deck: PlayingCard[] = [];

    for (let row = 0; row < SUITS.length; row += 1) {
        const suit = SUITS[row];
        for (let col = 0; col < RANKS.length; col += 1) {
            const rank = RANKS[col];
            deck.push({
                code: `${SUIT_PREFIX[suit]}_${rank}`,
                suit,
                rank,
                rankId: RANK_ID[rank],
                chips: RANK_CHIPS[rank],
                col,
                row,
            });
        }
    }

    return deck;
}

export function shuffleDeck(deck: PlayingCard[]): PlayingCard[] {
    const cards = deck.slice();

    for (let i = cards.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    return cards;
}

export function evaluatePokerHand(cards: PlayingCard[]): PokerScore | null {
    if (cards.length === 0 || cards.length > 5) {
        return null;
    }

    const sorted = sortByRankDesc(cards);
    const groups = getRankGroups(cards);
    const flush = cards.length === 5 && cards.every((card) => card.suit === cards[0].suit);
    const straightCards = cards.length === 5 ? getStraightCards(cards) : null;

    let name: PokerHandName = 'High Card';
    let scoringCards = [sorted[0]];

    if (flush && straightCards) {
        name = 'Straight Flush';
        scoringCards = straightCards;
    } else if (groups[0]?.length === 4) {
        name = 'Four of a Kind';
        scoringCards = groups[0];
    } else if (cards.length === 5 && groups[0]?.length === 3 && groups[1]?.length === 2) {
        name = 'Full House';
        scoringCards = groups[0].concat(groups[1]);
    } else if (flush) {
        name = 'Flush';
        scoringCards = sorted;
    } else if (straightCards) {
        name = 'Straight';
        scoringCards = straightCards;
    } else if (groups[0]?.length === 3) {
        name = 'Three of a Kind';
        scoringCards = groups[0];
    } else if (groups[0]?.length === 2 && groups[1]?.length === 2) {
        name = 'Two Pair';
        scoringCards = groups[0].concat(groups[1]);
    } else if (groups[0]?.length === 2) {
        name = 'Pair';
        scoringCards = groups[0];
    }

    return buildScore(name, sortByRankDesc(scoringCards));
}

function buildScore(name: PokerHandName, scoringCards: PlayingCard[]): PokerScore {
    const value = HAND_VALUES[name];
    const cardChips = scoringCards.reduce((sum, card) => sum + card.chips, 0);
    const chips = value.chips + cardChips;
    const total = chips * value.mult;

    return {
        name,
        displayName: value.displayName,
        baseChips: value.chips,
        cardChips,
        chips,
        mult: value.mult,
        total,
        scoringCards,
    };
}

function getRankGroups(cards: PlayingCard[]): PlayingCard[][] {
    const byRank = new Map<number, PlayingCard[]>();

    for (const card of cards) {
        const group = byRank.get(card.rankId) ?? [];
        group.push(card);
        byRank.set(card.rankId, group);
    }

    return [...byRank.values()]
        .sort((a, b) => b.length - a.length || b[0].rankId - a[0].rankId)
        .map(sortByRankDesc);
}

function getStraightCards(cards: PlayingCard[]): PlayingCard[] | null {
    const byRank = new Map<number, PlayingCard>();

    for (const card of sortByRankDesc(cards)) {
        if (!byRank.has(card.rankId)) {
            byRank.set(card.rankId, card);
        }
    }

    if (byRank.size !== 5) {
        return null;
    }

    const ranks = [...byRank.keys()].sort((a, b) => b - a);
    const highStraight = ranks.every((rank, index) => index === 0 || rank === ranks[index - 1] - 1);
    if (highStraight) {
        return ranks.map((rank) => byRank.get(rank)!);
    }

    const wheel = [14, 5, 4, 3, 2];
    if (wheel.every((rank) => byRank.has(rank))) {
        return wheel.map((rank) => byRank.get(rank)!);
    }

    return null;
}

function sortByRankDesc(cards: PlayingCard[]): PlayingCard[] {
    return cards.slice().sort((a, b) => b.rankId - a.rankId || b.chips - a.chips);
}
