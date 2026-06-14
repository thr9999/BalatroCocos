import { _decorator, Color, Component, Label, LabelShadow, Vec2 } from 'cc';
import { SHADOW } from './Theme';

const { ccclass, property, executeInEditMode } = _decorator;

/**
 * 一键给"自己及所有子孙节点"的 Label 统一加深色阴影（对标原版 shadow=true）。
 * 挂在 Sidebar(或任意容器)上一个,底下所有文字就都有阴影了,不用逐个调。
 * 默认值来自 Theme.SHADOW,改一处全改。
 */
@ccclass('TextShadowGroup')
@executeInEditMode(true)
export class TextShadowGroup extends Component {
    @property({ tooltip: '阴影色 hex（不带 #）' })
    public hex = SHADOW.hex;

    @property({ tooltip: '阴影 X 偏移（px）' })
    public offsetX = SHADOW.offsetX;

    @property({ tooltip: '阴影 Y 偏移（px，向下为负）' })
    public offsetY = SHADOW.offsetY;

    @property({ tooltip: '阴影模糊（像素字填 0）' })
    public blur = SHADOW.blur;

    private lastKey = '';

    protected onEnable(): void {
        this.applyAll();
    }

    protected update(): void {
        // 编辑器里改参数、或新增了 Label 时,自动重新应用
        const labels = this.getComponentsInChildren(Label);
        const key = `${this.hex}|${this.offsetX}|${this.offsetY}|${this.blur}|${labels.length}`;
        if (key !== this.lastKey) {
            this.applyAll(labels);
            this.lastKey = key;
        }
    }

    /** 给范围内每个 Label 确保有一个 LabelShadow 并设成统一参数。 */
    public applyAll(labels?: Label[]): void {
        const list = labels ?? this.getComponentsInChildren(Label);
        const color = new Color();
        color.fromHEX(`#${this.hex}`);

        for (const label of list) {
            let shadow = label.getComponent(LabelShadow);
            if (!shadow) {
                shadow = label.node.addComponent(LabelShadow);
            }
            if (!shadow) {
                continue;
            }
            shadow.color = color.clone();
            shadow.offset = new Vec2(this.offsetX, this.offsetY);
            shadow.blur = this.blur;
        }
    }
}
