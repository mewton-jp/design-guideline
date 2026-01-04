# Design Spec: Feedback System Architecture

## 前提: SSGと動的コンテンツの課題

**blog.mewton.jp** は Astro (SSG) で構築される。
Sticker（シール/リアクション）および Sticky Note（付箋/コメント）は動的コンテンツであり、外部バックエンドが必要となる。

---

## 1. Sticker (シール)

### 機能要件

- **Action**:
    - **Login Required**: シールを貼るには、SNS連携（GitHub/X/Google等）によるログインが必要。
    - 種類：Emoji 1文字（ユーザーが選択、あるいはプリセット）。
    - 座標：ブロック内の相対位置、またはランダムなオフセット。
- **Display**:
    - **Heatmap with Faces**: シールにアイコンを重ねる、あるいはホバー時に「誰が貼ったか」を表示する。
    - 「数」ではなく「人」の集まりとして可視化する。

### Data Model

```typescript
type Sticker = {
  postId: string;
  blockId: string;
  emoji: string; // Emoji character
  userId: string; // 誰が貼ったか
  userProfile: {
    avatarUrl: string;
    displayName: string;
  };
  createdAt: number;
}
```

---

## 2. Sticky Note (付箋)

### 機能要件

- **Action**:
    - **Login Required**: 投稿にはログインが必要。
    - 文字数制限：140字程度（短文）。
- **Display**:
    - 誰の発言かがわかるように、アバターやNameを表示する（署名）。
    - デフォルトではサイド（PC）またはインラインの開閉式（SP）で表示。

### Data Model

```typescript
type StickyNote = {
  id: string;
  postId: string;
  anchorId: string;
  content: string;
  userId: string; // 誰が書いたか
  userProfile: {
    avatarUrl: string;
    displayName: string;
  };
  createdAt: number;
}
```

---

## Backend Architecture

**Cloudflare Workers + D1 (SQLite)** に加え、**Authentication Service** が必要となる。

### Auth Strategy

- **Option A: Auth.js (NextAuth) on Workers**:
    - サーバーサイドでOAuthハンドリングを行う。
    - Session TokenをCookieで管理。
- **Option B: Firebase Auth / Supabase Auth**:
    - 認証プロバイダとして外部サービスを利用。
    - 実装コストが低い。
- **Recommended**: **Supabase Auth** または **Clerk**
    - ユーザー管理画面が最初からあり、SNS連携も容易なため。
    - D1 へのデータ保存時に、JWT の検証を行う。

### API Design

- `POST /api/sticker`
- `POST /api/note`
    - Header: `Authorization: Bearer <token>`
    - 認証済みユーザーのみ書き込み許可。

---

- **Sticky Note**: NGワードフィルタ、Turnstile によるBot対策。あくまで「通りすがり」の良心を信じる設計にするが、荒れた場合の削除機能（管理者用）は最低限用意する。

---

## Frontend Architecture

SSG (Astro) 上で、これら動的機能をどう実装するか。

### 1. Astro Islands (Interactive Islands)

記事自体は静的 HTML として配信し、インタラクティブな部分のみを **Astro Islands (`client:*` directives)** として水分補給（Hydrate）する。

- **Framework**: `React` または `Preact` (軽量性重視)。
- **Hydration Strategy**:
    - **Stickers**: `client:visible` (スクロールして見えたら読み込み・描画)。
    - **Sticky Notes**: `client:idle` (メインコンテンツ読み込み後に初期化)。

### 2. State Management & Optimistic UI

"Sticker" の体験において「ペタッ」という即時性は重要である。API のレスポンスを待っていては遅い。

- **Optimistic UI (楽観的更新)**:
    - シールを押した瞬間、ローカルの State を更新し、画面上にはシールを表示させる。
    - 裏で API リクエストを投げ、失敗したらロールバックする（あるいは、多少のズレは許容する）。
- **Data Fetching**:
    - `SWR` または `TanStack Query` を利用する。
    - 記事を開いた瞬間はバックエンドから取得した初期データを表示し、その後はクライアントサイドで最新状態を保つ（Revalidation）。

### 3. Authentication Flow

SSG であるため、認証状態のチェックはクライアントサイドで行う。

1.  ページロード時、Auth SDK (Supabase/Clerk) がセッションを確認。
2.  ログイン済みなら、ユーザーの Profile 情報を取得し、Sticker/Note コンポーネントに渡す。
3.  未ログインなら、Sticker/Note は「読み取り専用」モードになるか、アクション時にログインモーダルを表示する。
