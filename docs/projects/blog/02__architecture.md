# Design Spec: Architecture

## 技術スタック概要

- **Framework**: Astro
- **Rendering Strategy**: SSG (Static Site Generation)
- **Content Source**: Git-managed Markdown/MDX
- **Sandbox Environment**: WebContainer API / StackBlitz SDK

---

## Monorepo Structure

本プロジェクトは `mewton-jp/guideline` ワークスペース（モノレポ）の一部として構築する。
主要なディレクトリ構成案は以下の通り。

```
.
├── apps/
│   └── blog/            # Astro Project (New)
├── packages/
│   └── design-token/    # Existing Shared Tokens
├── sandboxes/           # Sandbox Source Codes (New)
│   ├── node-example-1/
│   └── ssr-app-example/
└── docs/                # Design Guidelines & Specs
```

### 設計のポイント

1.  **Apps (Astro)**:
    - `apps/blog` はプレゼンテーション層に徹する。
    - コンテンツ（Markdown）はここで管理する。
2.  **Sandboxes**:
    - ブログ記事で紹介するサンプルコードやデモアプリケーションは、`sandboxes/` ディレクトリで独立したプロジェクトとして管理する。
    - これにより、サンプルコード自体も CI/CD や Lint の対象にでき、コード品質を維持できる（"壊れたサンプル" を防ぐ）。

---

## Sandbox Integration (WebContainer)

ブログ記事内でのサンドボックス実行には、**WebContainer API** (または StackBlitz SDK) を利用する。

### 実現方法

1.  **Code Import**:
    - ビルド時（SSG）に、`sandboxes/xxx` 以下のファイル内容を読み込む。
    - これを Astro コンポーネント（`<Sandbox />`）への Props として渡す。
2.  **Client-Side Boot**:
    - ユーザーが記事を開くと、ブラウザ上で WebContainer が起動する。
    - 渡されたファイル内容を仮想ファイルシステムに書き込み、`npm install && npm start` 等を実行する。

### メリット

- **Node.js Runtime**: ブラウザだけで Node.js 環境（サーバーサイド処理を含む）を再現できる。
- **Security**: ユーザーのブラウザ内で完結するため、サーバーサイドでのサンドボックス構築（Docker等）が不要。

---

## Astro Implementation Details

### Design Token Integration

- `packages/design-token` または `dist/w3c/base.json` を利用する。
- Astro の Global Styles あるいは Tailwind/UnoCSS 設定としてトークンを取り込む。

### View Transitions

- 「ノートの連続性」を実現するため、Astro の View Transitions (Shared Element Transitions) を積極的に利用する。

---

## Deployment Strategy

### Hosting: Cloudflare Pages

バックエンド（Feedback System）に Cloudflare Workers / D1 を採用するため、
フロントエンド（SSG）の配信先も **Cloudflare Pages** とする。

- **Advantages**:
    - **Unified Platform**: フロントエンドとバックエンドを同じエコシステム（Wrangler, Dashboard）で管理できる。
    - **Edge Network**: 静的アセット（HTML/CSS/JS）がエッジから高速に配信される。
    - **Zero Cost for Static**: 静的サイトのホスティングとして非常にコストパフォーマンスが良い。
- **CI/CD**:
    - GitHub Integration を利用し、`main` ブランチへのプッシュで自動ビルド・デプロイを行う。

### Custom Domain

- **Domain Provider**: Sakura Domain (Example)
- **Configuration**:
    1.  Cloudflare Pages 側で Custom Domain (`blog.mewton.jp`) を追加する。
    2.  提示される CNAME レコードを、さくらインターネットのドメインコントロールパネル（DNS設定）に追加する。
    - **Note**: これにより、さくらで取得したドメインのまま Cloudflare の CDN/Edge を利用可能になる。
