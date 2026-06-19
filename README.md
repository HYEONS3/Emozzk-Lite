# Emozzk-Lite
Custom emote shortcuts and emote management for Chzzk


# Emozzk Lite 동작 정책

- E는 채팅창 focus가 없을 때 이모티콘 패널을 연다.
- E는 채팅 입력 중에는 동작하지 않는다.
- F1~F10은 채팅창 focus 상태에서 이모티콘 즉시 입력으로 동작한다.
- 패널이 닫혀 있으면 F1~F10 입력 시 패널을 열고 ready 후 이모티콘을 입력한다.
- 이모티콘은 항상 입력창 맨 뒤에 삽입되도록 보정한다.
- Backspace, Enter, 일반 문자 입력은 치지직 기본 동작에 맡긴다.
- WebSocket, 전송 payload, emoteId, imageUrl, token은 건드리지 않는다.
- Q/W 카테고리 이동은 MVP에서 보류한다.
- 즐겨찾기는 추후 기능으로 분리한다.