# Design Tokens: Base Layer (Primitive)

## Overview
物理的な素材としての値の集合。
これらは直接使用されず、各メタファーの Semantic Token に参照される。

> **Note:**
> 各値の正確な定義は [base.json](./base.json) を参照。

---

## Typography
文字の物理的な大きさ、太さ、行送り。

| Token | Value (rem) | Px (base 16) |
| :--- | :--- | :--- |
| `text-xs` | 0.75 | 12px |
| `text-sm` | 0.875 | 14px |
| `text-base` | 1.0 | 16px |
| `text-lg` | 1.125 | 18px |
| `text-xl` | 1.25 | 20px |
| `text-2xl` | 1.5 | 24px |
| `text-3xl` | 1.875 | 30px |
| `text-4xl` | 2.25 | 36px |
| `text-5xl` | 3.0 | 48px |

| Weight | Value |
| :--- | :--- |
| `normal` | 400 |
| `medium` | 500 |
| `semibold` | 600 |
| `bold` | 700 |

---

## Spacing
空間の物理的な単位。

| Token | Value (rem) | Px (base 16) |
| :--- | :--- | :--- |
| `spacing-xs` | 0.25 | 4px |
| `spacing-sm` | 0.5 | 8px |
| `spacing-md` | 1.0 | 16px |
| `spacing-lg` | 1.5 | 24px |
| `spacing-xl` | 2.0 | 32px |
| `spacing-2xl` | 3.0 | 48px |
| `spacing-3xl` | 4.0 | 64px |
| `spacing-4xl` | 6.0 | 96px |

---

## Radius
角丸の物理的な単位。

| Token | Value |
| :--- | :--- |
| `radius-sm` | 4px |
| `radius-md` | 8px |
| `radius-lg` | 12px |
| `radius-xl` | 16px |
| `radius-2xl` | 24px |
| `radius-full` | 9999px |

---

## Palette: Neutral
ベースとなる灰色。

| Token | Value (OKLCH) | Description |
| :--- | :--- | :--- |
| `neutral-50` | `0.985 0 0` | Almost White |
| `neutral-100` | `0.97 0 0` | |
| `neutral-200` | `0.92 0 0` | |
| `neutral-300` | `0.87 0 0` | |
| `neutral-400` | `0.68 0 0` | |
| `neutral-500` | `0.53 0 0` | |
| `neutral-600` | `0.42 0 0` | |
| `neutral-700` | `0.35 0 0` | |
| `neutral-800` | `0.25 0 0` | |
| `neutral-900` | `0.2 0 0` | Almost Black |

---

## Palette: Chroma
彩度を持つ色のパレット。すべて OKLCH 空間で定義される。

### Warm Tone
- **Pink:** `350` (Hue) - 優しさ、愛着
- **Red:** `10` (Hue) - 警告、強さ
- **Orange:** `34-65` (Hue) - 活発、温かさ
- **Yellow:** `78-100` (Hue) - 注意、光

### Cool Tone
- **Blue:** `235-250` (Hue) - 静寂、知性
- **Cyan:** `190-200` (Hue) - 清涼、未来
- **Mint:** `134-150` (Hue) - 新鮮、安全
- **Slate:** `224-240` (Hue) - 冷たい無機質

### Middle Tone
- **Purple / Mauve / Lavender:** `275-310` (Hue) - 神秘、夕暮れ
- **Sage:** `124-140` (Hue) - 乾燥した自然
