import { _decorator, Component, Node, Rect, Size, Sprite, SpriteFrame, Tween, tween, UITransform, Vec2, Vec3 } from 'cc';
import type { PlayingCard } from '../core/PokerHand';
import { ResponsiveRoot } from './ResponsiveRoot';

const { ccclass, property } = _decorator;

// 图集单元格尺寸（切片用的源像素），与显示尺寸是两回事
const CARD_WIDTH = 142;
const CARD_HEIGHT = 190;
const SELECTED_Y = 34;
const HOVER_Y = 14;

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

    @property({ tooltip: '卡牌宽（tile，× 基础单位 = 像素）' })
    public widthTiles = 2;

    @property({ tooltip: '卡牌高（tile）' })
    public heightTiles = 2.75;

    @property
    public col = 12;

    @property
    public row = 3;

    @property
    public baseCol = 1;

    @property
    public baseRow = 0;

    public card: PlayingCard | null = null;

    private basePosition = new Vec3();
    private selected = false;
    private hovered = false;
    private interactable = true;
    private clickHandler: ((cardView: CardView) => void) | null = null;

    protected start(): void {
        this.applyDisplaySize();
        this.refresh();
        this.registerInput();
    }

    /** 卡牌显示尺寸 = 本组件的 tile 宽高 × 基础单位（图集仍按源像素切片，这里只定显示大小）。 */
    private applyDisplaySize(): void {
        const unit = ResponsiveRoot.current?.unit ?? ResponsiveRoot.DEFAULT_UNIT;
        const w = this.widthTiles * unit;
        const h = this.heightTiles * unit;
        const setSize = (sprite: Sprite | null) => {
            if (!sprite) {
                return;
            }
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.getComponent(UITransform)?.setContentSize(w, h);
        };
        setSize(this.baseSprite);
        setSize(this.frontSprite);
        this.getComponent(UITransform)?.setContentSize(w, h);
    }

    protected onDestroy(): void {
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
        this.node.off(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
    }

    public setup(card: PlayingCard, onClick: (cardView: CardView) => void): void {
        this.card = card;
        this.clickHandler = onClick;
        this.showCard(card.col, card.row);
    }

    public showCard(col: number, row: number): void {
        this.col = col;
        this.row = row;
        this.refresh();
    }

    public setBasePosition(position: Vec3, immediate = true): void {
        this.basePosition.set(position);
        this.applyPose(immediate);
    }

    public setSelected(selected: boolean, immediate = false): void {
        this.selected = selected;
        this.applyPose(immediate);
    }

    public clearSelectedVisual(): void {
        this.selected = false;
    }

    public setInteractable(interactable: boolean): void {
        this.interactable = interactable;
        this.hovered = false;
        this.applyPose(false);
    }

    public juice(): void {
        const originalScale = this.node.scale.clone();
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(0.06, { scale: new Vec3(originalScale.x * 1.08, originalScale.y * 1.08, originalScale.z) })
            .to(0.08, { scale: originalScale })
            .start();
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

    private registerInput(): void {
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
        this.node.off(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
        this.node.on(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
    }

    private onTouchEnd(): void {
        if (!this.interactable || !this.clickHandler) {
            return;
        }

        this.clickHandler(this);
    }

    private onMouseEnter(): void {
        if (!this.interactable) {
            return;
        }

        this.hovered = true;
        this.applyPose(false);
    }

    private onMouseLeave(): void {
        this.hovered = false;
        this.applyPose(false);
    }

    private applyPose(immediate: boolean): void {
        const lift = this.selected ? SELECTED_Y : this.hovered ? HOVER_Y : 0;
        const targetPosition = new Vec3(this.basePosition.x, this.basePosition.y + lift, this.basePosition.z);
        const targetScale = this.hovered && !this.selected ? new Vec3(1.04, 1.04, 1) : new Vec3(1, 1, 1);

        Tween.stopAllByTarget(this.node);
        if (immediate) {
            this.node.setPosition(targetPosition);
            this.node.setScale(targetScale);
            return;
        }

        tween(this.node)
            .to(0.12, { position: targetPosition, scale: targetScale }, { easing: 'quadOut' })
            .start();
    }
}
