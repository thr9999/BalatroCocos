import { _decorator, Color, Component, Material, Sprite, UITransform, Vec2, Vec4, view } from 'cc';

const { ccclass, executeInEditMode, property } = _decorator;

function colorToVec4(color: Color, out: Vec4): Vec4 {
    out.set(color.r / 255, color.g / 255, color.b / 255, color.a / 255);
    return out;
}

/**
 * 对应原版 G.SPLASH_BACK + resources/shaders/background.fs。
 * 节点和材质由编辑器创建/绑定；组件只负责给 shader 喂原版参数。
 */
@ccclass('BalatroBackground')
@executeInEditMode(true)
export class BalatroBackground extends Component {
    @property({ type: Material, tooltip: '可选；不填时使用 Sprite.customMaterial 或 Sprite 当前材质。' })
    public material: Material | null = null;

    @property({ tooltip: '背景流动速度。原版使用 G.TIMERS.REAL_SHADER。' })
    public timeScale = 1;

    @property({ tooltip: '中心旋转量。正常局内可为 0；调高可看见更明显的漩涡。' })
    public spinAmount = 0;

    @property({ tooltip: '背景对比度。Small Blind 正常为 1。' })
    public contrast = 1;

    @property({ type: Color, tooltip: '原版 Small Blind 背景 C 色：G.C.BLIND.Small * 0.9。' })
    public colour1 = new Color(72, 119, 99, 255);

    @property({ type: Color, tooltip: '原版 Small Blind 背景 L 色：G.C.BLIND.Small * 1.3。' })
    public colour2 = new Color(104, 172, 143, 255);

    @property({ type: Color, tooltip: '原版 Small Blind 背景 D 色：G.C.BLIND.Small * 0.7。' })
    public colour3 = new Color(56, 92, 77, 255);

    private elapsed = 0;
    private spinTime = 0;
    private readonly resolution = new Vec2(1920, 1080);
    private readonly c1 = new Vec4();
    private readonly c2 = new Vec4();
    private readonly c3 = new Vec4();

    protected onEnable(): void {
        this.applyMaterialValues();
    }

    protected update(deltaTime: number): void {
        this.elapsed += deltaTime * this.timeScale;
        this.spinTime += deltaTime * this.spinAmount;
        this.applyMaterialValues();
    }

    private applyMaterialValues(): void {
        const material = this.getMaterial();
        if (!material) {
            return;
        }

        const visibleSize = view.getVisibleSize();
        if (visibleSize.width > 0 && visibleSize.height > 0) {
            this.resolution.set(visibleSize.width, visibleSize.height);
        } else {
            const transform = this.getComponent(UITransform);
            if (transform) {
                this.resolution.set(Math.max(1, transform.width), Math.max(1, transform.height));
            }
        }

        material.setProperty('bgResolution', this.resolution);
        material.setProperty('bgTime', this.elapsed);
        material.setProperty('bgSpinTime', this.spinTime);
        material.setProperty('bgContrast', this.contrast);
        material.setProperty('bgSpinAmount', this.spinAmount);
        material.setProperty('bgColour1', colorToVec4(this.colour1, this.c1));
        material.setProperty('bgColour2', colorToVec4(this.colour2, this.c2));
        material.setProperty('bgColour3', colorToVec4(this.colour3, this.c3));
    }

    private getMaterial(): Material | null {
        const sprite = this.getComponent(Sprite);
        if (sprite) {
            if (!sprite.customMaterial && this.material) {
                sprite.customMaterial = this.material;
            }

            const instance = sprite.getMaterialInstance(0);
            if (instance) {
                return instance;
            }

            return sprite.customMaterial || sprite.getMaterial(0);
        }

        return this.material;
    }
}
