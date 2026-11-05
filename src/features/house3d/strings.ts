import type { StagePart } from './types'

export const houseStrings = {
  title: 'Модель объекта',
  ready: 'Готово', working: 'В работе', notStarted: 'Не начато',
  readyHint: 'ярко', workingHint: 'частично', notStartedHint: 'призрак',
  stateLegend: 'Состояние частей',
  stageLegend: 'Цвета этапов',
  fallback: '3D-модель недоступна. Прогресс этапов:',
  loading: 'Загружаем 3D-модель…',
  empty: 'Добавьте этапы строительства, чтобы увидеть модель объекта.',
  stages: 'Этапы строительства', other: 'Прочее',
  hint: 'Нажмите на этап или на часть дома, чтобы увидеть подробности.',
  doneStages: (done: number, total: number) => `Завершено этапов: ${done} из ${total}`,
  updated: 'Обновлено',
  countOf: (done: number, total: number) => `${done} из ${total}`,
  clearSelection: 'Снять выбор',
  play: 'Проиграть стройку',
  playing: 'Стройка',
  playInterrupt: 'Нажмите в любом месте, чтобы остановить',
  modelLabel: (rows: string) => `3D-модель дома. ${rows}`,
} as const

/** Count-based stages: what one element is called on the stage card. */
export const elementUnits: Partial<Record<StagePart, string>> = {
  windows: 'окон и дверей',
  electric: 'линий проводки',
  plumbing: 'участков труб',
}

export const devStrings = {
  badge: 'DEV · Локальная демонстрация',
  title: 'Проверка модели дома',
  note: 'Тестовые значения; страница не обращается к Supabase и отсутствует в production-сборке.',
  presets: 'Наборы процентов',
  zero: 'Все этапы 0%', mixed: 'Смешанный прогресс', complete: 'Все этапы 100%',
  select: 'Выбор этапа', none: 'Без выбора',
  reducedMotion: 'Reduced motion',
  preview: 'Предпросмотр',
  cycles: 'mount/unmount ×20', cyclesRunning: 'Идёт проверка…',
  unmounted: 'Модель размонтирована',
  log: 'Журнал освобождения ресурсов',
  contexts: (created: number, live: number) => `Создано context: ${created}; живых: ${live}`,
  percentLabel: (name: string) => `${name}, процент`,
} as const
