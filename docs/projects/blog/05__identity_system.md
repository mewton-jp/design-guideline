# Design Spec: Identity System

## Overview

**blog.mewton.jp** におけるフィードバック（Sticker / Sticky Note）は、
「誰が」その感情や意見を持ったかを大切にするため、**原則としてすべてのアクションにアカウント連携（Identity）を必須とする**。

匿名（Anonymous）のアクションは許可しない。
これにより、スパムの防止だけでなく、発言への責任と信頼性を担保する。

---

## 1. Core Concepts

### 1.1. Core Philosophy: Responsible Pseudonymity
本システムは、**表示上の匿名性（Pseudonymity）を否定しない**。
ただし、すべてのアクションは**内部的に一貫した Identity に紐づけられ、無制限・無責任な影響力を行使することはできない**。

> 「この場で許されるのは『名を伏せた反応』であって、『責任を放棄した行為』ではない。」

### 1.2. Identity Layers
匿名性を3つのレイヤで制御する。

1.  **Public Anonymity (表示上の匿名性)**
    - **Sticker**: 誰が貼ったかは表示されない（匿名OK）。これにより「気軽な反応」を促進する。
    - **Sticky Note**: 誰が書いたかを表示する（匿名NG）。「言葉」には責任を持たせる。
2.  **Internal Identifiability (内部的な識別可能性)**
    - どちらのアクションも、システム内部では完全にアカウントと紐付いている。
    - これにより、Rate Limit や Ban などの統制が可能となる。
3.  **Action Power (行為の影響力)**
    - 匿名でのアクション（Sticker）は、編集不可・集合表示のみとし、場に対する影響力を低く抑える。
    - 顕名でのアクション（Note）は、場に文脈を加える強い影響力を持つため、Identity の開示を必須とする。

---

## 2. Architecture

### 2.1. Authentication Provider
フルマネージドな認証基盤を採用し、保守コストを最小化する。

- **Provisional / Under Verification**: **Clerk** (or Supabase Auth)
    - **Reasoning**:
        - React Islands / Cloudflare Workers との統合事例が多い。
        - UIコンポーネントが充実しており、実装コストを下げられる可能性がある。
    - **To Be Determined (TBD)**:
        - **Cloudflare Workers (Backend)** での JWT 検証フローがスムーズか。
        - **Japanese UI**: 日本語化（ローカリゼーション）の品質とカスタマイズ性。
        - **Cost**: MAU課金が個人の非営利ブログとして許容範囲に収まるか。
        - ※ これらが要件を満たさない場合、**Supabase Auth** を代替として採用する。

### 2.2. User Profile Model (DB)
Auth Provider のユーザーIDとは別に、アプリケーション固有のプロフィールを持つ。

```typescript
type UserProfile = {
  id: string;          // UUID (App internal ID)
  authProviderId: string; // Link to Clerk/Supabase User ID
  
  displayName: string; // 表示名（デフォルトはSNS名だが変更可能）
  avatarUrl: string;   // アイコン画像
  
  socialLinks: {
    platform: 'github' | 'twitter' | 'website';
    url: string;
  }[];

  createdAt: number;
};
```

---

## 3. UI/UX Specifications

### 3.1. Auth Flow & Session
- **Session Persistence**: 認証状態は `localStorage` (または Cookie) に保持し、再訪問時に自動ログインする。
- **Just-in-Time Auth**:
    - アクション（貼る、編集する）の直前までログインを強要しない。
    - 未ログイン状態でも「編集ボタン（または削除ボタン）」は表示しておき、クリック時に認証モーダル -> 本人確認 -> 実行許可 というフローを取る。

### 3.2. Sticker Display
- **Visual**: 絵文字（Emoji）の集合体（Heatmap）として表示。
- **Interaction**:
    - **Hover**: ユーザー情報は表示しない。ツールチップで「👍 12」のような集計を表示するのみ。
    - **Edit**: **不可**。一度貼ったシールの位置や種類の変更はできない。
    - **Undo**: 直後の「取り消し」のみ許可するが、永続的な管理・削除機能は提供しない（気軽さの担保）。

### 3.3. Sticky Note Display
- 最初から「アイコン」「名前」「コメント」を表示する。
- 名前とアイコンは、そのユーザーの **SNSプロフィール（GitHub/X等）への外部リンク** となる。

---

## 4. Privacy & Security

### 4.1. Data Minimization
- 認証プロバイダからは必要最低限の情報（ID, Avatar, Name）のみを取得・同期する。
- メールアドレス等は公開プロフィールとしては保持しない（認証プロバイダ側でのみ管理）。

### 4.2. Right to be Forgotten (アカウント削除)
- ユーザーはいつでも自身のデータを削除できる。
- **"Delete My Account"**:
    - 設定モーダル等から実行可能。
    - 実行されると、DB上の UserProfile および、紐付く全ての Sticker / Sticky Note が物理削除（または匿名化）される。

### 4.3. Anti-Spam
- **Rate Limit**: 同一ユーザーによる短期間の連投（Consecutive Posts）を制限する。
- 特定のユーザーをブロック（非表示）にする機能を管理者向けに用意する。
- **Future Consideration (Dead Account Pruning)**:
    - 連携元のSNSアカウント（X, GitHub等）が削除または凍結された場合、定期バッチ等で確認し、紐付くステッカーを自動的にパージ（削除）する機能を検討する。
    - これにより、スパムアカウントの痕跡を事後的に一掃可能にする。
