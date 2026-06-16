import { Enum } from 'cc';

/**
 * 主题系统（设计 token 单一来源）。对标原版的 G.C 配色集中定义。
 * 颜色用语义名引用,改主题只改这里;尺寸用 tile,跟整套布局同一把尺子。
 */

/**
 * 色卡（原版 globals.lua 的基础调色板）。按颜色分,不按功能分。
 * 功能是色卡的用途(见下方 USAGE 注释),不在枚举里硬编。
 */
export enum ColorName {
    Black, // 374244  原版 BLACK（深青黑，面板/背景）
    LBlack, // 4F6367  原版 L_BLACK（次深，描边）
    Grey, // 5F7377  原版 GREY
    Blue, // 009DFF  原版 BLUE
    Red, // FE5F55  原版 RED
    Green, // 4BC292  原版 GREEN
    Orange, // FF9A00  原版 IMPORTANT/FILTER
    Gold, // F3B958  原版 MONEY（金币金）
    Purple, // 8867A5  原版 PURPLE
    White, // FFFFFF
    None, // 不填充/不描边
    HudMain, // 343F41  原版非 Boss HUD 的 BOSS_MAIN：darken(BLACK, 0.05)
    HudDark, // 454F51  原版非 Boss HUD 的 BOSS_DARK：lighten(BLACK, 0.07)
    BlindSmallMain, // 1679B4  原版 Small Blind 的 DYN_UI.MAIN
    BlindSmallDark, // 2A5871  原版 Small Blind 的 DYN_UI.DARK
    HandTextDark, // 323B3D  原版 hand_text_area：darken(BLACK, 0.1)
}
Enum(ColorName);

export const COLOR_HEX: Record<ColorName, string> = {
    [ColorName.Black]: '374244',
    [ColorName.LBlack]: '4F6367',
    [ColorName.Grey]: '5F7377',
    [ColorName.Blue]: '009DFF',
    [ColorName.Red]: 'FE5F55',
    [ColorName.Green]: '4BC292',
    [ColorName.Orange]: 'FF9A00',
    [ColorName.Gold]: 'F3B958',
    [ColorName.Purple]: '8867A5',
    [ColorName.White]: 'FFFFFF',
    [ColorName.None]: '000000',
    [ColorName.HudMain]: '343F41',
    [ColorName.HudDark]: '454F51',
    [ColorName.BlindSmallMain]: '1679B4',
    [ColorName.BlindSmallDark]: '2A5871',
    [ColorName.HandTextDark]: '323B3D',
};

/**
 * 用途约定(色卡的语义用法,仅作参考,挑色卡时按这个对照)：
 *   面板/背景/格子 = Black     描边 = LBlack
 *   原版 HUD 主体 = HudMain/HudDark
 *   Small Blind 当前盲注块 = BlindSmallMain/BlindSmallDark
 *   手牌计分底 = HandTextDark
 *   筹码 = Blue                倍率 = Red
 *   金币 = Gold                底注/回合 = Orange
 *   文字 = White
 * 以后想换肤,改 COLOR_HEX 的值即可;想要"功能→色卡"的可换层,再在此加别名表。
 */

/**
 * 布局网格步进（tile）。只有"位置和尺寸"走 tile，按这个步进调（ResponsiveElement）。
 * 圆角/描边/字号是视觉细节，直接用 px（见下），不进 tile 网格。
 */
export const GRID = {
    layout: 0.25, // 大 UI（格子、区域）按 0.25 tile 步进
};

/** 圆角预设（px）。px 会跟 Canvas 全局缩放，无需 tile。 */
export const RADIUS = {
    none: 0,
    sm: 10,
    md: 16,
    lg: 24,
};

/** 描边宽预设（px）。 */
export const OUTLINE = {
    none: 0,
    thin: 2,
    normal: 3,
};

/** 文字阴影默认值（对标原版 shadow=true 的厚实像素感）。 */
export const SHADOW = {
    hex: '1A2424', // 深青黑
    offsetX: 2,
    offsetY: -3,
    blur: 0, // 像素字硬边,不糊
};
