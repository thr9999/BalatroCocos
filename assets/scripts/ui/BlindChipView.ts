import { _decorator, Component, Rect, Size, Sprite, SpriteFrame, Vec2 } from 'cc';

const { ccclass, executeInEditMode, property, requireComponent } = _decorator;

const DEFAULT_CELL_SIZE = 68;
const DEFAULT_FRAME_COUNT = 21;
const DEFAULT_FPS = 10;

@ccclass('BlindChipView')
@requireComponent(Sprite)
@executeInEditMode(true)
export class BlindChipView extends Component {
    @property({ type: SpriteFrame, tooltip: 'Drag BlindChips.png/spriteFrame here.' })
    public atlasSpriteFrame: SpriteFrame | null = null;

    @property({ tooltip: 'Small Blind = 0, Big Blind = 1. Boss blinds use later rows.' })
    public row = 0;

    @property({ tooltip: 'Original Balatro BlindChips 2x cell size.' })
    public cellSize = DEFAULT_CELL_SIZE;

    @property({ tooltip: 'Original Balatro blind chip animation frame count.' })
    public frameCount = DEFAULT_FRAME_COUNT;

    @property({ tooltip: 'Original G.ANIMATION_FPS.' })
    public fps = DEFAULT_FPS;

    private sprite: Sprite | null = null;
    private elapsed = 0;
    private currentFrame = -1;

    protected onEnable(): void {
        this.sprite = this.getComponent(Sprite);
        this.elapsed = 0;
        this.currentFrame = -1;
        this.applyFrame(0);
    }

    protected update(deltaTime: number): void {
        this.elapsed += deltaTime;

        const safeFrameCount = Math.max(1, Math.floor(this.frameCount));
        const safeFps = Math.max(1, this.fps);
        const nextFrame = Math.floor(this.elapsed * safeFps) % safeFrameCount;
        if (nextFrame !== this.currentFrame) {
            this.applyFrame(nextFrame);
        }
    }

    private applyFrame(frameIndex: number): void {
        if (!this.sprite || !this.atlasSpriteFrame?.texture) {
            return;
        }

        const safeCellSize = Math.max(1, this.cellSize);
        const safeFrameCount = Math.max(1, Math.floor(this.frameCount));
        const col = ((frameIndex % safeFrameCount) + safeFrameCount) % safeFrameCount;
        const row = Math.max(0, Math.floor(this.row));

        const frame = new SpriteFrame();
        frame.reset(
            {
                texture: this.atlasSpriteFrame.texture,
                rect: new Rect(col * safeCellSize, row * safeCellSize, safeCellSize, safeCellSize),
                originalSize: new Size(safeCellSize, safeCellSize),
                offset: new Vec2(0, 0),
            },
            true,
        );

        this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.sprite.spriteFrame = frame;
        this.currentFrame = col;
    }
}
