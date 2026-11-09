import type { Locale } from '../../i18n'
import type { LandingCopy } from './copy'
import { DemoObjectSection } from './DemoObjectSection'
import { HowItWorks } from './HowItWorks'
import { FaqSection, PricingSection, TrustSection } from './InfoSections'
import { SignupSection } from './SignupSection'

export { Footer } from './InfoSections'

/** Every block after the hero. A separate chunk, so the first screen paints before it arrives. */
export function BelowFold({ copy, locale }: { copy: LandingCopy; locale: Locale }) {
  return (
    <>
      <HowItWorks copy={copy} locale={locale} />
      <DemoObjectSection copy={copy} />
      <TrustSection copy={copy} />
      <PricingSection copy={copy} />
      <FaqSection copy={copy} />
      <SignupSection copy={copy} />
    </>
  )
}
