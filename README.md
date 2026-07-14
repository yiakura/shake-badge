# Shake Badge 搖搖名牌

把手機變成電子名牌：輸入暱稱、放上照片、套用主題，搖一搖照片就會在畫面裡碰撞彈跳。

- **純前端 PWA**：無後端、無帳號、無追蹤；圖片與設定只存在本機（IndexedDB），離線可用、可安裝到主畫面。
- **手機優先**：直向／橫向、safe-area、深色模式。
- **多語系**：繁體中文 / English / 日本語 / 한국어（依瀏覽器語言自動選擇，可手動切換）。
- **玩法**：最多 20 張圖，搖晃碰撞或「隨機漂浮」模式；可自訂主題、背景圖、名稱字型、文字邊框陰影、物理手感。
- 技術：React 19 + TypeScript + Vite + Tailwind CSS 4 + Matter.js + idb + vite-plugin-pwa。

## 開發

需求 Node.js ≥ 20。

```bash
npm install
npm run dev        # 開發（localhost）
npm run build      # 型別檢查 + 產出 dist/
npm run preview    # 以正式建置啟動本機伺服器（測 PWA）
npm run lint       # oxlint
npm run test       # Vitest 單元 + 整合測試
```

## 測試重點

- **PWA / 離線**：`npm run build && npm run preview`，開 `http://localhost:4173`，建立名牌後在 DevTools 勾 Offline 重新整理，仍可開啟與顯示。
- **手機動作感應**：`DeviceMotionEvent` 只在 secure context 提供，區網 IP（`http://192.168.x.x`）不算。用 `npm run dev:https`（HTTPS + `--host`）讓手機連 `https://<區網IP>:5173` 實測。
- **iOS 權限**：iOS 13+ 需使用者手勢觸發，展示頁會先跳「啟用搖晃效果」；拒絕或無感應器時自動降級為手指拖曳＋「搖一下」。

## 部署

推到 `main` 會觸發 `.github/workflows/deploy.yml`（lint → test → build → GitHub Pages），build 時自動帶入 `BASE_PATH=/<repo 名>/`。部署到根路徑的靜態主機（Netlify、Cloudflare Pages…）直接 `npm run build` 即可。

## 資料與設定

- IndexedDB `shake-badge-db`（v2）：`settings`（名稱、樣式、物理手感…）、`images`（壓縮原圖＋正方裁切＋裁切框）、`assets`（背景圖、名稱字型）。舊版記錄於載入時自動 migration。核心資料不放 localStorage。
- 可調參數集中在 `src/config/`：`themes.ts`（主題）、`physics.ts`（物理常數，如 `maxAreaRatio` 控制堆疊高度）、`limits.ts`（張數、尺寸範圍）。
- 介面文字集中在 `src/i18n/`；新增語言複製字典檔並於 `index.ts` 註冊即可（型別強制鍵對齊）。

## 已知限制

- iPhone Safari 無網頁全螢幕 → 按鈕自動隱藏，建議安裝 PWA 取得 standalone。
- Icon 目前為 SVG 暫用圖，iOS 安裝圖示建議日後補 180×180 PNG。
- PNG 輪廓／貼紙刀模的碰撞為凸包近似（凹陷處不參與碰撞）。
- 自訂字型只套用在名牌名稱，且只涵蓋該字型內含的字符（純拉丁字型的中文會退回內建字型）。
- 圖片壓縮在主執行緒逐張處理（大量連續上傳可改用 Web Worker）。

## 隱私

所有圖片與設定只存在瀏覽器 IndexedDB，**不會上傳任何伺服器**；不含分析、追蹤或廣告程式碼。
