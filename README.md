# フードバンク倉庫システム - LIFF アプリケーション

このリポジトリは、フードバンクの食品リクエスト管理システムのLIFF（LINE Front-end Framework）アプリケーションです。

## 📁 ディレクトリ構成

```
liff/
├── request-form/         # 食品リクエストフォーム
│   ├── index.html
│   └── app.js
├── request-table/        # リクエスト一覧
│   ├── index.html
│   └── app.js
├── request-details/      # リクエスト詳細
│   ├── index.html
│   └── app.js
├── request-dashboard/    # ダッシュボード（管理者用）
│   ├── index.html
│   └── app.js
└── common/              # 共通ファイル
    ├── css/
    │   └── style.css    # 共通スタイル
    ├── js/
    │   └── liff-init.js # LIFF初期化・共通機能
    └── images/          # 画像ファイル
```

## 🚀 アプリケーション概要

### 1. Request Form（食品リクエストフォーム）
- **対象ユーザー**: Requester（リクエスター）、Admin（管理者）
- **機能**:
  - 食品リクエストの新規作成
  - 団体情報の自動入力（kodomo nwデータベースから取得）
  - ピックアップ日時・方法の指定
  - 開催タイプ別の詳細入力

### 2. Request Table（リクエスト一覧）
- **対象ユーザー**: 全ユーザー（権限により表示内容が変化）
- **機能**:
  - リクエスト一覧の表示
  - ステータス・月別フィルター
  - ユーザー権限に応じた表示制御
  - リアルタイム更新

### 3. Request Details（リクエスト詳細）
- **対象ユーザー**: 全ユーザー（権限により編集可能項目が変化）
- **機能**:
  - リクエスト詳細情報の表示
  - ステータス変更（Staff/Admin）
  - 写真アップロード・表示
  - コメント機能
  - 業務連絡記入（Staff/Admin限定）

### 4. Request Dashboard（ダッシュボード）
- **対象ユーザー**: Admin（管理者）のみ
- **機能**:
  - 統計データの可視化
  - 月別リクエスト数推移
  - 団体別ランキング
  - 寄付額推定
  - データエクスポート

## 👥 ユーザー権限

### Requester（リクエスター）
- 自分のリクエストのみ閲覧・編集可能
- 新規リクエスト作成
- コメント・写真追加

### Staff（スタッフ）
- 全リクエストの閲覧
- ステータス変更（active → completed）
- 業務連絡記入
- LINE WORKS通知受信

### Driver（ドライバー）
- 配送対象リクエストのみ閲覧
- 最小限の情報表示
- 配送完了更新

### Admin（管理者）
- 全機能へのフルアクセス
- ダッシュボード閲覧
- システム設定変更

## 🔧 技術仕様

### フロントエンド
- **HTML5/CSS3**: セマンティックマークアップ
- **Bootstrap 5.3.0**: レスポンシブUIフレームワーク
- **JavaScript (ES6+)**: モダンJavaScript機能
- **LIFF SDK v2.x**: LINE Front-end Framework
- **Chart.js**: データビジュアライゼーション
- **Font Awesome**: アイコンライブラリ

### バックエンド連携
- **Google Apps Script**: サーバーレスバックエンド
- **Google Sheets**: データベース
- **LINE Messaging API**: ユーザー通知
- **LINE WORKS API**: スタッフ通知
- **Google Drive API**: 画像保存

## 📱 LIFF設定

各アプリケーションのLIFF設定が必要です：

```javascript
// common/js/liff-init.js で設定
const LIFF_IDS = {
    requestForm: 'LIFF_ID_REQUEST_FORM',
    requestTable: 'LIFF_ID_REQUEST_TABLE', 
    requestDetails: 'LIFF_ID_REQUEST_DETAILS',
    requestDashboard: 'LIFF_ID_REQUEST_DASHBOARD'
};
```

### LIFF設定パラメータ
- **Size**: Full
- **Endpoint URL**: `https://jumps710.github.io/foodbank-warehouse/liff/{app-name}/`
- **Scope**: profile, openid
- **Bot link feature**: Off

## 🚀 デプロイ手順

1. **GitHub Pages設定**
   ```bash
   # リポジトリをクローン
   git clone https://github.com/Jumps710/foodbank-warehouse.git
   cd foodbank-warehouse
   
   # GitHub Pagesを有効化（Settings > Pages > Source: Deploy from a branch > main）
   ```

2. **LIFF アプリ登録**
   - LINE Developers Consoleで新規チャンネル作成
   - 4つのLIFFアプリを個別に登録
   - 各エンドポイントURLを設定

3. **設定ファイル更新**
   ```javascript
   // common/js/liff-init.js
   const LIFF_IDS = {
       requestForm: '取得したLIFF_ID',
       requestTable: '取得したLIFF_ID',
       requestDetails: '取得したLIFF_ID', 
       requestDashboard: '取得したLIFF_ID'
   };
   ```

4. **バックエンドAPI接続**
   ```javascript
   // APIエンドポイントの設定
   window.WAREHOUSE_API_URL = 'GAS_WEB_APP_URL';
   window.KODOMO_NW_API_URL = 'KODOMO_NW_GAS_URL';
   ```

## 🔗 関連リンク

- **メインリポジトリ**: https://github.com/Jumps710/foodbank-warehouse
- **LIFF Documentation**: https://developers.line.biz/ja/docs/liff/
- **Bootstrap Documentation**: https://getbootstrap.com/docs/5.3/
- **Chart.js Documentation**: https://www.chartjs.org/docs/

## 📝 開発ログ

- **2025.08.21**: LIFF アプリケーション初期作成
  - 4つのビュー（Form, Table, Details, Dashboard）実装
  - レスポンシブデザイン対応
  - ユーザー権限システム実装
  - 写真アップロード機能実装
  - リアルタイムコメント機能実装

## 🤝 コントリビューション

このプロジェクトはフードバンク活動の効率化を目的としています。
機能改善の提案やバグ報告は Issues までお願いします。

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。