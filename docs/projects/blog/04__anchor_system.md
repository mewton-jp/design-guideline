# Design Spec: Robust Anchor System


## Overview

ブログ記事（Markdown）は頻繁に修正・加筆される可能性がある。
これに対し、Sticker（シール）や Sticky Note（付箋）が「意図したパラグラフ」に追従し続ける仕組み（Anchoring）が必要である。

本システムでは、**LSH (Locality Sensitive Hashing)** 技術の一つである **SimHash** を採用し、
SSG ビルド時に計算されたハッシュ値を用いて、クライアントサイドでのロバストな位置特定（Anchor Healing）を実現する。

---

## 1. Anchor Definition

アンカーは単一のIDではなく、**「位置（Index）」・「種類（Kind）」・「特徴（SimHash）」の複合キー**として定義される。

```typescript
type Anchor = {
  /**
   * Block Index (0-based)
   * 記事の先頭からのブロック（パラグラフ、リストアイテム等）の順序。
   * O(1) での高速な探索用。
   */
  index: number;

  /**
   * Block Kind
   * ASTノードの種類（Tag Nameから導出）。
   * 検索時の誤爆（例：パラグラフからコードブロックへの吸着）を防ぐ。
   */
  kind: 'p' | 'li' | 'blockquote' | 'code' | 'heading' | 'other';
  // Future: 'figure' (img+caption), 'table' 等のサポートを検討。

  /**
   * SimHash (Hex String)
   * ブロックのテキスト内容から生成された64bitのLSH。
   */
  simhash: string;
};
```

---

## 2. Architecture: SSG Pre-computation

クライアントサイドでの重いハッシュ計算を避けるため、Astro のビルドプロセスですべてを事前計算する。

### Build Phase (Server-Side)

1.  **Node Selection (AST)**:
    - Remark/Rehype プラグインにより、アンカー対象とするブロック要素を厳密に定義して抽出する。
    - **Target Nodes**:
        - `paragraph` (p)
        - `heading` (h1-h6)
        - `listItem` (li)
        - `blockquote`
        - `code` (pre/code)
    - **Excluded Nodes**:
        - `thematicBreak` (hr), `html` (raw html), Empty lines.

2.  **SimHash Calculation**:
    - 各ブロックのテキストコンテンツから SimHash を計算する。
    - **Normalization Rules** (表記ゆれへの耐性強化):
        - **Unicode Normalization**: `NFKC` を適用。
        - **Whitespace**: 連続する空白・改行を単一のスペースに置換。
        - **Punctuation**: 句読点や記号を「削除」せず「スペースに置換」（単語境界の保存）。
    - **Code Block Handling**:
        - コードブロックは微細な変更（変数名変更など）でも意味が変わるため、より厳密な判定を行う。
        - SimHashのトークン生成時に記号を含める、あるいは別途 ExactHash (xxhash64等) を併用する等の調整を行う（実装時にチューニング）。

3.  **HTML Injection**:
    - 計算結果を `data-*` 属性として HTML に埋め込む。

```html
<!-- 生成されるHTMLのイメージ -->
<p data-block-index="10" data-simhash="a1b2c3d4e5f6...">
  ここは重要なパラグラフです。
</p>
```

※ `kind` は `data-*` 属性としては埋め込まず、実行時に `tagName` (`P`, `LI`, `H1-6`...) から導出する。

---

## 3. Runtime Logic: Anchor Healing

クライアント（ブラウザ）は、DBに保存された「作成時のアンカー情報」と、現在のDOM上の「実際のブロック情報」を比較し、
**最も尤もらしい場所（Best Match）** にステッカーを配置する。

このプロセスを **Anchor Healing（アンカーの自己修復）** と呼ぶ。

### Scoring Algorithm (Staged Approach)

数式によるコスト計算よりも、段階的（Staged）なフィルタリング戦略を採用する。これによりチューニングとデバッグを容易にする。

**Strategy Phases**:

1.  **Phase 1: Exact Match**
    - `Index` が完全一致、かつ `SimHash` が完全一致。
    - -> **Adopt** (Cost: 0)
2.  **Phase 2: Local Move (±N Blocks)**
    - 近傍（例: ±20）かつ同種（`Kind`一致）のブロック内で、`SimHash` が完全一致するものを探索。
    - -> **Adopt** (Moved)
3.  **Phase 3: Fuzzy Match (Edit)**
    - 元の `Index` の位置にあるブロック（`Kind`一致）の `SimHash` ハミング距離を計算。
    - 距離が閾値以下（例: 3 bit差分以内）なら採用。
    - ※ **Exceptional Rule**: `kind === 'code'` の場合、微細な変更でも意味が変わるリスクが高いため、このフェーズはスキップ（あるいは ExactHash を必須）とする。
    - -> **Adopt** (Edited)
4.  **Phase 4: Detached**
    - 上記いずれにも該当しない場合。
    - -> **Mark as Detached**

### 4. Implementation Details

#### 4.1. Detached Item UX
行き場を失ったステッカー「Detached Item」は、消滅させるのではなく**「過去の遺物」**として扱う。

- **"Lost & Found" Box**:
    - 記事の末尾、あるいはサイドバーの端に「はがれた付箋箱」エリアを設ける。
    - 「本文の編集により位置が特定できなくなったメモ」としてひっそりと表示する。
    - これにより、コンテンツの更新に伴う「文脈の消失」自体をコンテンツ化する。

#### 4.2. Security & Anti-Spam
- **Rate Limit**: 記事単位×IPアドレス単位での投稿頻度制限。
- **Sanitization**: 文字列は全てサニタイズ（HTMLタグ除去）。
- **Allowlist (Sticker)**: 絵文字ステッカーは許可されたユニコード文字のみ通す。
- **Report**: 悪質な書き込みに対する通報機能（将来実装）。

---

## 4. Implementation Details (Draft)

### 4.1. Library Selection

- **SimHash**: `simhash-js` 等の既存ライブラリ、あるいは軽量な独自実装（単純なN-gramベースなど）。
    - 日本語対応のため、分かち書き（Intl.Segmenter）を利用した N-gram 生成を推奨。

### 4.2. Performance Optimization

- **Search Scope**:
    - 全ブロックを走査すると遅くなるため、`Target Index ± N`（例: ±20行）の範囲のみを探索する。
- **Lazy Evaluation**:
    - 画面外のステッカーの Healing 計算は、IntersectionObserver 等を用いて遅延させる（`client:visible`）。

## 5. Optimization: Hybrid Hydration (SSG Baking)

ステッカーが数千件に達した場合、クライアントサイドですべてを Healing するのはコストが高い。
そのため、**「確定した過去のステッカー」は SSG ビルド時に HTML に焼き込み、「最新のステッカー」のみをクライアントで動的に処理する** ハイブリッド方式を採用する。

### 5.1. Build-Time Baking
1.  Astro ビルド時にバックエンドから「全ステッカー」を取得する。
2.  サーバーサイドで Anchor Healing アルゴリズムを実行し、確定した位置にステッカーを静的 HTML として埋め込む。
3.  この際、`<div id="static-stickers" data-built-at="{TIMESTAMP}">...</div>` のようにビルド時刻を記録しておく。

### 5.2. Client-Side Diffing
1.  クライアントはページロード時に API へ問い合わせる際、`?since={TIMESTAMP}` パラメータを付与する。
2.  サーバーは「ビルド以降に追加されたステッカー」のみを返す。
3.  クライアントはこの「差分」に対してのみ Anchor Healing を実行し、マウントする。

これにより、大量の過去ログがある場合でも TTI (Time to Interactive) を高速に保つことができる。
