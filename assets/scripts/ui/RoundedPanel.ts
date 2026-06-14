import { _decorator, Color, Component, Enum, Graphics, UITransform } from 'cc';
import { ColorName, COLOR_HEX } from './Theme';

const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

/**
 * 程序绘制的圆角面板（对标原版程序化 UI）。
 * 颜色用 Theme 的色卡（下拉选）；圆角/描边用 px（视觉细节，px 会跟 Canvas 全局缩放，无需 tile）。
 * 位置/尺寸由节点的 ResponsiveElement（tile）管，跟本组件分工。
 */
@ccclass('RoundedPanel')
@requireComponent(Graphics)
@executeInEditMode(true)
export class RoundedPanel extends Component {
    @property({ type: Enum(ColorName), tooltip: '填充色卡（选 None 为不填充）' })
    public fill: ColorName = ColorName.Black;

    @property({ slide: true, range: [0, 255, 1], tooltip: '填充不透明度 0-255' })
    public fillAlpha = 255;

    @property({ tooltip: '圆角（px，参考 Theme.RADIUS：sm 10 / md 16 / lg 24）' })
    public radius = 16;

    @property({ type: Enum(ColorName), tooltip: '描边色卡（None 为不描边）' })
    public outline: ColorName = ColorName.None;

    @property({ tooltip: '描边宽（px，参考 Theme.OUTLINE：thin 2 / normal 3）' })
    public outlineWidth = 2;

    private lastKey = '';

    protected onEnable(): void {
        this.draw();
    }

    protected update(): void {
        if (this.computeKey() !== this.lastKey) {
            this.draw();
        }
    }

    public draw(): void {
        const g = this.getComponent(Graphics);
        const ui = this.getComponent(UITransform);
        if (!g || !ui) {
            return;
        }

        const w = ui.width;
        const h = ui.height;
        const r = Math.max(0, Math.min(this.radius, w / 2, h / 2));
        const x = -w * ui.anchorX;
        const y = -h * ui.anchorY;

        g.clear();

        if (this.fill !== ColorName.None) {
            g.roundRect(x, y, w, h, r);
            const fill = new Color();
            fill.fromHEX(`#${COLOR_HEX[this.fill]}`);
            fill.a = this.fillAlpha;
            g.fillColor = fill;
            g.fill();
        }

        if (this.outline !== ColorName.None && this.outlineWidth > 0) {
            g.roundRect(x, y, w, h, r);
            g.lineWidth = this.outlineWidth;
            const stroke = new Color();
            stroke.fromHEX(`#${COLOR_HEX[this.outline]}`);
            g.strokeColor = stroke;
            g.stroke();
        }

        this.lastKey = this.computeKey();
    }

    private computeKey(): string {
        const ui = this.getComponent(UITransform);
        return [this.fill, this.fillAlpha, this.radius, this.outline, this.outlineWidth, ui?.width ?? 0, ui?.height ?? 0].join(
            '|',
        );
    }
}
