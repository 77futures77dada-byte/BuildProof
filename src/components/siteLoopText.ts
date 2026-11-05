/**
 * Copy shown inside the SiteLoop hero animation, per language.
 *
 * Kept local to the component: the landing has no i18n yet. Once react-i18next
 * lands (branch claude/i18n), pass the current language to `<SiteLoop lang>`;
 * a language without its own entry falls back to English.
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
}

const en: SiteLoopText = {
  ariaLabel:
    'Animated construction site. Workers in yellow and white hard hats hurry between a window rack and an unfinished house, install three windows, take a photo, and a card shows Windows at 100 percent.',
  crate: 'WINDOWS',
  stage: 'STAGE 4 OF 7  ·  WINDOWS',
  cardTitle: 'Windows',
  photoAttached: 'Photo attached',
  author: 'John',
  exampleData: 'EXAMPLE DATA',
  overall: 'Overall readiness',
  hurry: 'Come on!',
  almost: 'Almost there!',
}

// TODO: Estonian (et) copy.
export const SITE_LOOP_TEXT: Partial<Record<SiteLoopLang, SiteLoopText>> = {
  en,
  ru: {
    ariaLabel:
      'Анимация стройплощадки: рабочие в жёлтых и белых касках носят окна к недостроенному дому, устанавливают три окна, фотографируют результат, и карточка этапа «Окна» показывает 100%.',
    crate: 'ОКНА',
    stage: 'ЭТАП 4 ИЗ 7  ·  ОКНА',
    cardTitle: 'Окна',
    photoAttached: 'Фото прикреплено',
    author: 'Иван',
    exampleData: 'ПРИМЕР ДАННЫХ',
    overall: 'Общая готовность',
    hurry: 'Давай!',
    almost: 'Почти всё!',
  },
}

export const siteLoopText = (lang: SiteLoopLang): SiteLoopText => SITE_LOOP_TEXT[lang] ?? en
