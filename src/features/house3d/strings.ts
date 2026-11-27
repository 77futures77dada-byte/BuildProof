import { useTranslation } from 'react-i18next'
import type { StagePart } from './types'

/** Texts of the 3D object model, from i18n (`house.*` in src/i18n/locales/{et,ru,en}.json). */
export function useHouseStrings() {
  const { t } = useTranslation()
  return {
    title: t('house.title'),
    ready: t('house.ready'),
    working: t('house.working'),
    notStarted: t('house.notStarted'),
    readyHint: t('house.readyHint'),
    workingHint: t('house.workingHint'),
    notStartedHint: t('house.notStartedHint'),
    stateLegend: t('house.stateLegend'),
    stageLegend: t('house.stageLegend'),
    fallback: t('house.fallback'),
    loading: t('house.loading'),
    empty: t('house.empty'),
    stages: t('house.stages'),
    other: t('house.other'),
    hint: t('house.hint'),
    updated: t('house.updated'),
    clearSelection: t('house.clearSelection'),
    play: t('house.play'),
    playing: t('house.playing'),
    playInterrupt: t('house.playInterrupt'),
    doneStages: (done: number, total: number) => t('house.doneStages', { done, total }),
    countOf: (done: number, total: number) => t('house.countOf', { done, total }),
    modelLabel: (rows: string) => t('house.modelLabel', { rows }),
  }
}
export type HouseStrings = ReturnType<typeof useHouseStrings>

/** Count-based stages: what one element is called on the stage card. */
export function useElementUnits(): Partial<Record<StagePart, string>> {
  const { t } = useTranslation()
  return { windows: t('house.units.windows'), electric: t('house.units.electric'), plumbing: t('house.units.plumbing') }
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
