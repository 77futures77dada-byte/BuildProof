import i18n from './index'
import ru from './locales/ru.json'

type StageKey = keyof typeof ru.stageTemplates

/**
 * stage_templates.name is stored in Russian (the seeded catalogue). Map it back
 * to its dictionary key through the ru dictionary so the name can be shown in
 * the current language without hard-coding the Russian strings here.
 */
const KEY_BY_DB_NAME = new Map<string, StageKey>(
  (Object.entries(ru.stageTemplates) as [StageKey, string][]).map(([key, name]) => [name, key]),
)

/**
 * Display name for a stage in the current language. Unknown (custom) names are
 * shown as stored; an empty name becomes "untitled".
 *
 * Call it during render from a component that uses `useTranslation()`, so the
 * label re-renders on a language switch.
 */
export function stageLabel(dbName: string | null | undefined): string {
  if (!dbName) return i18n.t('stageTemplates.untitled')
  const key = KEY_BY_DB_NAME.get(dbName)
  return key ? i18n.t(`stageTemplates.${key}`) : dbName
}
