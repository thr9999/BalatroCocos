import { _decorator, Component, instantiate, Node, Prefab, Vec3 } from 'cc';
import { CardView } from './CardView';

const { ccclass, property } = _decorator;

type CardFace = {
    col: number;
    row: number;
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

    private readonly cards: CardFace[] = [
        { col: 12, row: 3 },
        { col: 11, row: 0 },
        { col: 10, row: 1 },
        { col: 8, row: 2 },
        { col: 5, row: 3 },
        { col: 0, row: 0 },
        { col: 4, row: 1 },
        { col: 7, row: 2 },
    ];

    protected start(): void {
        this.createHand();
    }

    private createHand(): void {
        if (!this.cardPrefab) {
            return;
        }

        for (let i = 0; i < this.cards.length; i += 1) {
            const cardNode = instantiate(this.cardPrefab) as Node;
            const card = this.cards[i];

            cardNode.setParent(this.node);
            cardNode.setPosition(new Vec3(this.startX + i * this.spacingX, this.cardY, 0));
            cardNode.getComponent(CardView)?.showCard(card.col, card.row);
        }
    }
}
