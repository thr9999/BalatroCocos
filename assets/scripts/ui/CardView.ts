import { _decorator, Component, Rect, Size, Sprite, SpriteFrame, Vec2 } from 'cc';

const { ccclass, property } = _decorator;

const CARD_WIDTH = 142;
const CARD_HEIGHT = 190;

@ccclass('CardView')
export class CardView extends Component {
    @property({ type: Sprite })
    public baseSprite: Sprite | null = null;

    @property({ type: Sprite })
    public frontSprite: Sprite | null = null;

    @property({ type: SpriteFrame })
    public deckSpriteFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    public baseSpriteFrame: SpriteFrame | null = null;

    @property
    public col = 12;

    @property
    public row = 3;

    @property
    public baseCol = 1;

    @property
    public baseRow = 0;

    protected start(): void {
        this.refresh();
    }

    public showCard(col: number, row: number): void {
        this.col = col;
        this.row = row;
        this.refresh();
    }

    public refresh(): void {
        if (this.baseSprite && this.baseSpriteFrame) {
            this.baseSprite.spriteFrame = this.createFrame(this.baseSpriteFrame, this.baseCol, this.baseRow);
        }

        if (this.frontSprite && this.deckSpriteFrame) {
            this.frontSprite.spriteFrame = this.createFrame(this.deckSpriteFrame, this.col, this.row);
        }
    }

    private createFrame(atlasFrame: SpriteFrame, col: number, row: number): SpriteFrame {
        const frame = new SpriteFrame();
        frame.reset({
            texture: atlasFrame.texture,
            rect: new Rect(col * CARD_WIDTH, row * CARD_HEIGHT, CARD_WIDTH, CARD_HEIGHT),
            originalSize: new Size(CARD_WIDTH, CARD_HEIGHT),
            offset: new Vec2(0, 0),
        }, true);

        return frame;
    }
}
