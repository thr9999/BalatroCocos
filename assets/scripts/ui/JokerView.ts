import { _decorator, Component, Label, Node, Rect, Size, Sprite, SpriteFrame, Tween, tween, Vec2, Vec3 } from 'cc';
import type { JokerDef } from '../core/JokerEffect';
import { getJokerArtCell } from './JokerArt';

const { ccclass, property } = _decorator;

const HOVER_Y = 16;
// Jokers 图集单元格尺寸（2x 贴图），与扑克牌同一套切法
const CELL_WIDTH = 142;
const CELL_HEIGHT = 190;

/**
 * 一张小丑牌的表现层。只负责显示名字/说明和 hover 反馈，
 * 具体的效果逻辑在 core/Jokers.ts。布局（贴图、label 位置）由预制体决定。
 */
@ccclass('JokerView')
export class JokerView extends Component {
    @property({ type: Sprite, tooltip: '小丑牌底框/插画（会从图集切对应格子贴上）' })
    public frameSprite: Sprite | null = null;

    @property({ type: SpriteFrame, tooltip: 'Jokers 图集（把 Jokers 的 spriteFrame 拖进来）' })
    public atlasSpriteFrame: SpriteFrame | null = null;

    @property({ type: Label, tooltip: '小丑牌名字' })
    public nameLabel: Label | null = null;

    @property({ type: Label, tooltip: '小丑牌说明（可选）' })
    public descLabel: Label | null = null;

    @property({ type: Node, tooltip: 'hover 时弹出的说明框（可选，留空则不弹）' })
    public tooltip: Node | null = null;

    @property({ type: Label, tooltip: '价格（仅商店里用，桌面持有的小丑牌会自动隐藏）' })
    public priceLabel: Label | null = null;

    public def: JokerDef | null = null;

    private basePosition = new Vec3();
    private hovered = false;
    private clickHandler: ((view: JokerView) => void) | null = null;

    protected onDestroy(): void {
        this.node.off(Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
        this.node.off(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    public setup(def: JokerDef, onClick?: (view: JokerView) => void): void {
        this.def = def;
        this.clickHandler = onClick ?? null;

        this.applyArt(def.id);

        if (this.nameLabel) {
            this.nameLabel.string = def.name;
        }
        if (this.descLabel) {
            this.descLabel.string = def.description;
        }
        if (this.tooltip) {
            this.tooltip.active = false;
        }
        this.setPrice(null);

        this.registerInput();
    }

    /** 显示价格（商店用）。传 null 隐藏价签。 */
    public setPrice(cost: number | null): void {
        if (!this.priceLabel) {
            return;
        }
        if (cost === null) {
            this.priceLabel.node.active = false;
        } else {
            this.priceLabel.node.active = true;
            this.priceLabel.string = `$${cost}`;
        }
    }

    /** 从图集切出该 joker 对应的格子贴到 frameSprite 上。没配图集就保持占位色块。 */
    private applyArt(id: string): void {
        if (!this.frameSprite || !this.atlasSpriteFrame) {
            return;
        }

        const cell = getJokerArtCell(id);
        if (!cell) {
            return;
        }

        const frame = new SpriteFrame();
        frame.reset(
            {
                texture: this.atlasSpriteFrame.texture,
                rect: new Rect(cell.col * CELL_WIDTH, cell.row * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT),
                originalSize: new Size(CELL_WIDTH, CELL_HEIGHT),
                offset: new Vec2(0, 0),
            },
            true,
        );
        this.frameSprite.spriteFrame = frame;
    }

    public setBasePosition(position: Vec3, immediate = true): void {
        this.basePosition.set(position);
        this.applyPose(immediate);
    }

    private registerInput(): void {
        this.node.off(Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
        this.node.off(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
        this.node.on(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    private onMouseEnter(): void {
        this.hovered = true;
        if (this.tooltip) {
            this.tooltip.active = true;
        }
        this.applyPose(false);
    }

    private onMouseLeave(): void {
        this.hovered = false;
        if (this.tooltip) {
            this.tooltip.active = false;
        }
        this.applyPose(false);
    }

    private onTouchEnd(): void {
        this.clickHandler?.(this);
    }

    private applyPose(immediate: boolean): void {
        const lift = this.hovered ? HOVER_Y : 0;
        const targetPosition = new Vec3(this.basePosition.x, this.basePosition.y + lift, this.basePosition.z);
        const targetScale = this.hovered ? new Vec3(1.06, 1.06, 1) : new Vec3(1, 1, 1);

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
