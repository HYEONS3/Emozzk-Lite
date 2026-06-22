import {
  findChatInput,
} from './chat-input.js';

export const MAX_CHAT_INPUT_EMOTE_COUNT = 10;

export function isChatInputEmoteLimitReached() {
  return getChatInputEmoteCount() >= MAX_CHAT_INPUT_EMOTE_COUNT;
}

export function getChatInputEmoteCount() {
  const chatInput = findChatInput();

  if (!chatInput) {
    return 0;
  }

  return countChatInputEmotes(chatInput);
}

export function countChatInputEmotes(chatInput) {
  if (!(chatInput instanceof Element)) {
    return 0;
  }

  return getChatInputEmoteElements(chatInput).length;
}

export function getChatInputEmoteElements(chatInput) {
  if (!(chatInput instanceof Element)) {
    return [];
  }

  /*
   * CHZZK 채팅 입력창 내부의 이모티콘은 보통 img로 들어간다.
   * alt가 {:...:} 형태가 아닐 수 있으므로, alt 정규식에만 의존하지 않는다.
   *
   * 입력창 contenteditable 내부에는 일반적으로 장식용 img가 들어가지 않으므로
   * 입력창 내부 img는 우선 이모티콘 후보로 본다.
   */
  const images = Array.from(chatInput.querySelectorAll('img'))
    .filter(isChatInputEmoteImage);

  /*
   * 혹시 img가 아닌 custom element/span으로 들어가는 경우를 방어한다.
   * 실제 CHZZK 구조가 바뀌어도 data/aria/title/alt에 이모티콘 흔적이 있으면 센다.
   */
  const nonImageCandidates = Array.from(
    chatInput.querySelectorAll(
      [
        '[data-emote-id]',
        '[data-emoji-id]',
        '[data-sticker-id]',
        '[data-emoticon-id]',
        '[data-chzzk-emote-id]',
        '[data-chzzk-emoji-id]',
        '[aria-label^="{:"]',
        '[title^="{:"]',
      ].join(',')
    )
  ).filter((element) => {
    if (element instanceof HTMLImageElement) {
      return false;
    }

    return isLikelyChatInputEmoteElement(element);
  });

  return [
    ...images,
    ...nonImageCandidates,
  ];
}

function isChatInputEmoteImage(image) {
  if (!(image instanceof HTMLImageElement)) {
    return false;
  }

  if (!image.isConnected) {
    return false;
  }

  /*
   * 입력창 내부 img는 기본적으로 이모티콘으로 간주한다.
   * 단, 완전히 빈 placeholder나 추적용 이미지처럼 보이는 것은 제외한다.
   */
  const alt = normalizeText(image.getAttribute('alt'));
  const src = normalizeText(image.getAttribute('src'));
  const title = normalizeText(image.getAttribute('title'));
  const ariaLabel = normalizeText(image.getAttribute('aria-label'));
  const className = normalizeText(image.getAttribute('class'));

  if (isExplicitEmoteText(alt)) return true;
  if (isExplicitEmoteText(title)) return true;
  if (isExplicitEmoteText(ariaLabel)) return true;

  if (hasEmoteLikeText(src)) return true;
  if (hasEmoteLikeText(className)) return true;

  /*
   * 마지막 fallback:
   * 채팅 입력창 내부의 img는 사실상 사용자가 삽입한 이모티콘으로 본다.
   * 이 fallback이 있어야 alt가 비어 있는 CHZZK 이모티콘도 10개 제한에 잡힌다.
   */
  return true;
}

function isLikelyChatInputEmoteElement(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  const values = [
    element.getAttribute('data-emote-id'),
    element.getAttribute('data-emoji-id'),
    element.getAttribute('data-sticker-id'),
    element.getAttribute('data-emoticon-id'),
    element.getAttribute('data-chzzk-emote-id'),
    element.getAttribute('data-chzzk-emoji-id'),
    element.getAttribute('aria-label'),
    element.getAttribute('title'),
    element.getAttribute('class'),
  ]
    .map(normalizeText)
    .filter(Boolean);

  return values.some((value) => {
    return (
      isExplicitEmoteText(value) ||
      hasEmoteLikeText(value)
    );
  });
}

function isExplicitEmoteText(value) {
  const text = normalizeText(value);

  if (!text) {
    return false;
  }

  return /^\{:([^:]+):\}$/.test(text);
}

function hasEmoteLikeText(value) {
  const text = normalizeText(value).toLowerCase();

  if (!text) {
    return false;
  }

  return (
    text.includes('emote') ||
    text.includes('emoji') ||
    text.includes('emoticon') ||
    text.includes('sticker') ||
    text.includes('/emote') ||
    text.includes('/emoji') ||
    text.includes('/emoticon') ||
    text.includes('nng-phinf') ||
    text.includes('phinf')
  );
}

function normalizeText(value) {
  return String(value ?? '').trim();
}