# Emozzk Lite

CHZZK 채팅의 기본 이모티콘 패널을 키보드와 즐겨찾기 UI로 더 빠르게 조작하기 위한 Chromium 계열 브라우저 확장 프로그램입니다.

Emozzk Lite는 CHZZK의 채팅 메시지 payload, WebSocket 전송 데이터, 구독 권한을 직접 수정하지 않습니다. 사용자가 실제로 클릭할 수 있는 CHZZK 이모티콘 버튼을 확장 프로그램 UI와 단축키로 더 편하게 누르는 방식으로 동작합니다.

---

## 주요 기능

### 이모티콘 패널 조작

- `E` 키로 CHZZK 이모티콘 패널을 열 수 있습니다.
- 이모티콘 패널이 열린 상태에서는 `Escape`로 패널을 닫습니다.
- 일반 입력창, 검색창, IME 조합 입력 중에는 의도치 않은 단축키 동작을 막습니다.
- 채팅 입력창에 이미 이모티콘이 10개 들어간 경우 추가 입력 시도를 큐에 넣지 않습니다.

### 즐겨찾기

- CHZZK의 최근 이모티콘 섹션 위에 Emozzk Lite 즐겨찾기 섹션을 추가합니다.
- 최근 이모티콘 또는 즐겨찾기 이모티콘을 `Alt+클릭`하면 즐겨찾기에 추가하거나 제거할 수 있습니다.
- 즐겨찾기 목록은 드래그로 순서를 바꿀 수 있습니다.
- 단축키가 등록된 즐겨찾기와 미등록 즐겨찾기를 분리해서 보여줍니다.
- 단축키가 등록된 즐겨찾기를 제거하려고 하면 해당 세트를 표시해 잘못 삭제하지 않도록 막습니다.

### 단축키 세트

- 단축키 세트는 기본 2개이며, 팝업에서 1개부터 9개까지 조절할 수 있습니다.
- 즐겨찾기 헤더의 세그먼트 컨트롤에서 `OFF`, `1`, `2`, ... 세트를 전환합니다.
- `OFF` 상태에서는 즐겨찾기와 최근 이모티콘은 유지하되 단축키 실행, 키 지정, 키 해제를 비활성화합니다.
- 세트 전환 컨트롤은 클릭과 드래그 전환을 지원합니다.
- 세트 이름은 즐겨찾기 헤더의 이름 변경 버튼에서 수정할 수 있습니다.

### 단축키 지정

- 즐겨찾기 헤더의 링크 아이콘 버튼을 누르면 키 지정 모드로 들어갑니다.
- 이모티콘을 선택한 뒤 등록할 키를 누르고 저장 버튼을 누르면 현재 활성 세트에 단축키가 저장됩니다.
- 등록된 단축키는 이모티콘 위에 배지로 표시됩니다.
- 같은 세트 안에서 동일한 키와 phase 조합은 하나만 유지됩니다.
- 같은 이모티콘에 기존 `KeyDown`/`KeyUp` 단축키가 있으면 새 지정 값으로 교체됩니다.

### 단축키 해제

- 즐겨찾기 헤더의 끊어진 링크 아이콘 버튼을 누르면 단축키 해제 모드로 들어갑니다.
- 단축키가 등록된 이모티콘을 여러 개 선택할 수 있습니다.
- 선택된 이모티콘에는 해제 후보 배지가 표시됩니다.
- 저장 버튼을 누르면 현재 활성 세트에서 선택한 이모티콘의 단축키가 일괄 해제됩니다.

### 실험실 옵션

팝업에서 다음 옵션을 설정할 수 있습니다.

- `KeyUp 단축키 허용`
- `KeyDown+KeyUp 동시 지정 허용`

기본 상태에서는 `KeyDown` 단축키만 사용합니다. `KeyUp` 관련 옵션은 실험 기능이므로 충돌 여부를 확인하면서 사용하는 것을 권장합니다.

### 최근 이모티콘 보존 개수 확장

- CHZZK의 `livechat-emoticon#...` localStorage 저장 흐름을 보조해 최근 이모티콘 보존 개수를 확장합니다.
- 기본값은 60개입니다.
- 팝업에서 50개부터 200개까지 설정할 수 있습니다.
- 즐겨찾기된 이모티콘은 최근 이모티콘 정리 과정에서 우선 보존됩니다.

---

## 기본 조작

| 동작 | 방법 |
| --- | --- |
| 이모티콘 패널 열기 | 채팅 입력 중이 아닐 때 `E` |
| 이모티콘 패널 닫기 | 패널이 열린 상태에서 `Escape` |
| 즐겨찾기 추가/제거 | 최근 이모티콘 또는 즐겨찾기 이모티콘 `Alt+클릭` |
| 즐겨찾기 순서 변경 | 즐겨찾기 이모티콘 드래그 |
| 단축키 세트 전환 | 즐겨찾기 헤더의 `OFF`, `1`, `2`, ... 클릭 또는 드래그 |
| 세트 이름 변경 | 즐겨찾기 헤더의 이름 변경 버튼 |
| 단축키 지정 | 링크 아이콘 → 이모티콘 선택 → 키 입력 → 저장 |
| 단축키 해제 | 끊어진 링크 아이콘 → 이모티콘 복수 선택 → 저장 |
| 설정 변경 | 확장 프로그램 아이콘 클릭 → 팝업 설정 |

---

## 단축키로 사용할 수 있는 키

단축키 지정 모드에서는 실제 키보드 이벤트의 `event.code`를 기준으로 저장합니다.

사용 가능한 주요 키:

- `F1` ~ `F12`
- `A` ~ `Z`
- `0` ~ `9`
- `Numpad` 계열 키
- 방향키
- `Backspace`, `Delete`, `Insert`, `Home`, `End`, `PageUp`, `PageDown`
- `` ` ``, `-`, `=`, `[`, `]`, `\`, `;`, `'`, `,`, `.`, `/`
- `Ctrl`, `Alt`, `Shift`, `Meta` 조합

등록하지 않는 키:

- modifier 단독 입력
- `Space`, `Escape`, `Tab`, `Enter`, `NumpadEnter`, `CapsLock`, `ContextMenu`, `HangulMode`
- modifier 없이 입력된 한글 단일 문자
- IME 조합 중 발생한 키 이벤트

일부 브라우저 예약 단축키(F11 등)는 브라우저 정책에 따라 확장 프로그램보다 우선할 수 있습니다.

---

## 설치 방법

### 배포 빌드 사용

이미 빌드된 `dist` 폴더가 있는 경우:

1. Chromium 계열 브라우저에서 확장 프로그램 관리 페이지를 엽니다.

   ```text
   chrome://extensions
   ```

2. 개발자 모드를 켭니다.
3. `압축해제된 확장 프로그램을 로드`를 선택합니다.
4. 프로젝트의 `dist` 폴더를 선택합니다.
5. CHZZK 탭을 새로고침합니다.

### 소스에서 빌드

```bash
npm install
npm run build
```

프로덕션 빌드:

```bash
npm run build:prod
```

베타 빌드:

```bash
npm run build:beta
```

빌드 결과:

| 명령 | 출력 폴더 | 설명 |
| --- | --- | --- |
| `npm run build` | `dist` | 개발용 빌드, sourcemap 포함 |
| `npm run build:prod` | `dist` | 프로덕션 빌드, minify 적용 |
| `npm run build:beta` | `dist-beta` | 베타 빌드, manifest에 beta 표시 추가 |

---

## 프로젝트 구조

```text
Emozzk-Lite/
├─ manifest.json
├─ package.json
├─ package-lock.json
├─ LICENSE
├─ README.md
├─ icons/
│  ├─ icon16.png
│  ├─ icon48.png
│  └─ icon128.png
├─ scripts/
│  └─ build.js
├─ src/
│  ├─ inject.js
│  ├─ content/
│  │  ├─ index.js
│  │  ├─ badge-overlay.js
│  │  ├─ badge-render.js
│  │  ├─ chat-input.js
│  │  ├─ chat-input-emote-limit.js
│  │  ├─ emote-bind-events.js
│  │  ├─ emote-bind-mode-state.js
│  │  ├─ emote-buttons.js
│  │  ├─ emote-click-focus.js
│  │  ├─ emote-favorite-groups.js
│  │  ├─ emote-favorites-drag.js
│  │  ├─ emote-favorites-event-name.js
│  │  ├─ emote-favorites-events.js
│  │  ├─ emote-favorites-render.js
│  │  ├─ emote-panel.js
│  │  ├─ emote-panel-ready.js
│  │  ├─ emote-recent-section.js
│  │  ├─ emote-trigger.js
│  │  ├─ extension-settings-storage.js
│  │  ├─ favorite-recent-emote-storage.js
│  │  ├─ favorite-recent-merge.js
│  │  ├─ quick-emote-insert.js
│  │  ├─ recent-emote-storage.js
│  │  ├─ recent-emote-storage-limit-bridge.js
│  │  ├─ recent-emote-storage-limit.js
│  │  ├─ shortcut-actions.js
│  │  ├─ shortcut-badge-map.js
│  │  ├─ shortcut-bindings.js
│  │  ├─ shortcut-controller.js
│  │  ├─ shortcut-guard.js
│  │  ├─ shortcut-key-code.js
│  │  └─ shortcut-storage.js
│  ├─ popup/
│  │  ├─ popup.html
│  │  ├─ popup.css
│  │  └─ popup.js
│  └─ styles/
│     └─ content.css
└─ dist/
   ├─ manifest.json
   ├─ content.js
   ├─ content.css
   ├─ inject.js
   ├─ popup.html
   ├─ popup.css
   ├─ popup.js
   └─ icons/
      ├─ icon16.png
      ├─ icon48.png
      └─ icon128.png
```

`node_modules/`는 의존성 설치 결과이므로 소스 구조 설명에서는 제외합니다.

---

## 주요 모듈 역할

### 엔트리와 빌드

| 파일 | 역할 |
| --- | --- |
| `manifest.json` | Manifest V3 확장 프로그램 설정 |
| `scripts/build.js` | esbuild 번들링, manifest 정규화, popup/icons/css 복사 |
| `src/content/index.js` | content script 초기화 엔트리 |
| `src/inject.js` | 페이지 컨텍스트에서 CHZZK 최근 이모티콘 localStorage 저장 흐름 보조 |
| `src/styles/content.css` | CHZZK 페이지에 삽입되는 Emozzk Lite UI 스타일 |

### 이모티콘 패널/입력

| 파일 | 역할 |
| --- | --- |
| `emote-trigger.js` | CHZZK 이모티콘 버튼 탐색, 패널 열기/닫기 |
| `emote-panel.js` | 이모티콘 패널 탐색 |
| `emote-panel-ready.js` | 패널이 실제로 렌더링될 때까지 대기 |
| `emote-buttons.js` | 이모티콘 버튼 수집, ID/label 추출, 버튼 클릭 |
| `quick-emote-insert.js` | 단축키 입력을 큐에 넣고 패널 버튼 클릭으로 이모티콘 삽입 |
| `chat-input.js` | 채팅 입력창 탐색, 포커스 복구, quick insert 전후 정리 |
| `chat-input-emote-limit.js` | 채팅 입력창 내 이모티콘 10개 제한 감지 |
| `emote-click-focus.js` | 이모티콘 클릭 후 채팅 입력창 포커스 복구 |

### 즐겨찾기

| 파일 | 역할 |
| --- | --- |
| `emote-favorites-render.js` | 즐겨찾기 섹션, 세트 스위치, 키 지정/해제/이름 변경 UI 렌더링 |
| `emote-favorites-events.js` | `Alt+클릭` 즐겨찾기 추가/제거 이벤트 처리 |
| `emote-favorites-drag.js` | 즐겨찾기 드래그 정렬과 자동 스크롤 처리 |
| `emote-favorite-groups.js` | 단축키 등록/미등록 즐겨찾기 그룹 분리와 부분 재정렬 병합 |
| `emote-favorites-event-name.js` | 즐겨찾기 변경 이벤트 이름과 dispatch 유틸 |
| `favorite-recent-emote-storage.js` | Emozzk Lite 즐겨찾기 저장/동기화 |
| `favorite-recent-merge.js` | 즐겨찾기와 CHZZK 최근 이모티콘 목록 병합 |
| `recent-emote-storage.js` | CHZZK 최근 이모티콘 localStorage 읽기/쓰기 |
| `recent-emote-storage-limit-bridge.js` | content script와 page context 사이 최근 이모티콘 보존 개수 동기화 |
| `recent-emote-storage-limit.js` | 현재는 비어 있는 보조 모듈 자리 |

### 단축키

| 파일 | 역할 |
| --- | --- |
| `shortcut-controller.js` | keydown/keyup 감지, 패널 열기/닫기, 등록 단축키 실행 |
| `shortcut-storage.js` | 단축키 세트, 활성 세트, 바인딩 저장과 마이그레이션 |
| `shortcut-bindings.js` | 단축키 바인딩 객체 정규화와 action config 생성 |
| `shortcut-key-code.js` | 키보드 이벤트를 저장 가능한 shortcut code로 변환 |
| `shortcut-actions.js` | 단축키 action 실행 |
| `shortcut-badge-map.js` | 저장된 바인딩을 이모티콘 배지 표시 데이터로 변환 |
| `shortcut-guard.js` | 입력 중인 target 여부 판단 |

### 배지/바인딩 모드

| 파일 | 역할 |
| --- | --- |
| `badge-overlay.js` | 패널 변화, 스크롤, 저장 변경에 맞춰 배지 갱신 |
| `badge-render.js` | 이모티콘 버튼 위 단축키/해제/충돌 배지 DOM 렌더링 |
| `emote-bind-mode-state.js` | 키 지정, 키 해제, 세트 이름 변경 모드 상태 관리 |
| `emote-bind-events.js` | 바인딩 모드에서 이모티콘 클릭, 키 입력, Escape 취소 처리 |

### 팝업

| 파일 | 역할 |
| --- | --- |
| `src/popup/popup.html` | 확장 프로그램 팝업 UI |
| `src/popup/popup.css` | 팝업 스타일 |
| `src/popup/popup.js` | 세트 수, 최근 이모티콘 보존 개수, 실험실 옵션 저장 |

---

## 저장 데이터

Emozzk Lite는 `chrome.storage.local`을 기본 저장소로 사용합니다. 일부 내부 보조 로직은 `localStorage` fallback을 가지고 있습니다.

| 키 | 저장 내용 |
| --- | --- |
| `emozzk_lite_favorite_recent_emotes_v1` | 즐겨찾기 이모티콘 목록 |
| `emzk_lite_shortcut_bindings_v1` | 단축키 세트, 활성 세트, 세트 이름, 바인딩 목록 |
| `emzk_lite_extension_settings_v1` | 실험실 옵션, 최근 이모티콘 보존 개수 |
| `livechat-emoticon#...` | CHZZK가 사용하는 최근 이모티콘 localStorage 키 |

단축키 저장 구조는 v4 기준입니다.

```json
{
  "version": 4,
  "activeSetId": "set_1",
  "setCount": 2,
  "sets": [
    {
      "id": "set_1",
      "label": "",
      "bindings": [
        {
          "id": "user__F1__down__exampleEmojiId",
          "source": "user",
          "code": "F1",
          "phase": "down",
          "actionConfig": {
            "action": "selectEmote",
            "actionArgs": {
              "targetType": "emojiId",
              "emojiId": "exampleEmojiId"
            }
          }
        }
      ]
    }
  ]
}
```

---

## 동작 원칙

- CHZZK 채팅 전송 데이터와 WebSocket payload를 수정하지 않습니다.
- CHZZK 구독 권한이나 이모티콘 사용 권한을 우회하지 않습니다.
- 이모티콘 입력은 CHZZK UI의 실제 이모티콘 버튼 클릭으로 처리합니다.
- CHZZK 페이지 구조에 의존하므로 CHZZK DOM 구조가 바뀌면 일부 기능이 수정되어야 할 수 있습니다.
- 최근 이모티콘 보존 개수 확장은 CHZZK의 `livechat-emoticon#...` 저장 형식에 의존합니다.

---

## 권한

`manifest.json` 기준 권한:

| 권한 | 사용 목적 |
| --- | --- |
| `storage` | 즐겨찾기, 단축키, 설정 저장 |
| `https://chzzk.naver.com/*` | CHZZK 페이지에서 content script 실행 |

---

## 개발 메모

- content script는 `src/content/index.js`에서 전체 기능을 초기화합니다.
- `inject.js`는 `web_accessible_resources`로 노출되어 CHZZK 페이지 컨텍스트에 삽입됩니다.
- 빌드 시 `manifest.json`은 `dist/manifest.json`으로 복사되며, `inject.js`와 `icons/*`가 `web_accessible_resources`에 보장됩니다.
- `build:beta`는 `dist-beta`를 만들고 manifest의 이름과 설명, `version_name`에 beta 정보를 추가합니다.
- `dist` 폴더는 브라우저에 직접 로드하는 결과물입니다.

---

## 라이선스

All rights reserved.

The source code is provided for transparency and review purposes only.
You may read and inspect the code, but copying, modification, redistribution,
sublicensing, or commercial use is not permitted without explicit permission
from the author.

---

## 비공식 고지

이 확장 프로그램은 NAVER 또는 CHZZK의 공식 도구가 아닙니다. NAVER, CHZZK 및 관련 명칭은 각 소유자의 상표입니다.