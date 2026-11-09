/**
 * Copy shown inside the SiteLoop hero animation, per language.
 *
 * Kept next to the scene rather than in src/i18n/locales: the copy is drawn
 * into SVG by siteLoopScene.ts. Callers pass the UI language to
 * `<SiteLoop lang>`.
 */

export type SiteLoopLang = 'en' | 'ru' | 'et'

export interface SiteLoopText {
  /** Accessible description of the whole scene. */
  ariaLabel: string
  /** Label on the window crate. */
  crate: string
  /** Stage strip caption above the seven colour bars. */
  stage: string
  /** Report card title — the stage being reported. */
  cardTitle: string
  photoAttached: string
  /** Example author name on the report card. */
  author: string
  /** Marks the card as illustrative, not real project data. */
  exampleData: string
  overall: string
  /** Foreman's speech bubbles. */
  hurry: string
  almost: string
  /** Playback button and scrubber (the scrubber is hidden on narrow screens). */
  pause: string
  play: string
  timeLabel: string
}

const en: SiteLoopText = {
  ariaLabel:
    'Animated construction site. Workers in yellow and white hard hats hurry between a window rack and an unfinished house, install three windows, take a photo, and a card shows Windows at 100 percent.',
  crate: 'WINDOWS',
  stage: 'STAGE 4 OF 7  ·  WINDOWS',
  cardTitle: 'Windows',
  photoAttached: 'Photo attached · awaiting review',
  author: 'Jaan',
  exampleData: 'EXAMPLE',
  overall: 'Overall readiness',
  hurry: 'Come on!',
  almost: 'Almost there!',
  pause: 'Pause',
  play: 'Play',
  timeLabel: 'Animation time',
}

export const SITE_LOOP_TEXT: Record<SiteLoopLang, SiteLoopText> = {
  en,
  ru: {
    ariaLabel:
      'Анимация стройки: рабочие в жёлтых и белых касках устанавливают три окна, фотографируют результат, и карточка отчёта показывает этап «Окна» на 100%, ждёт проверки.',
    crate: 'ОКНА',
    stage: 'ЭТАП 4 ИЗ 7  ·  ОКНА',
    cardTitle: 'Окна',
    photoAttached: 'Фото приложено · ждёт проверки',
    author: 'Яан',
    exampleData: 'ПРИМЕР',
    overall: 'Общая готовность',
    hurry: 'Давай!',
    almost: 'Почти!',
    pause: 'Пауза',
    play: 'Пуск',
    timeLabel: 'Время анимации',
  },
  // TODO native ET review: English placeholder until a native speaker writes the Estonian copy.
  et: en,
}

export const siteLoopText = (lang: SiteLoopLang): SiteLoopText => SITE_LOOP_TEXT[lang]
