import { Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import { useLandingCopy } from './copy'
import { Hero } from './Hero'
import { LandingLanguageSwitcher, LogoMark } from './parts'
import './landing.css'

const loadBelowFold = () => import('./BelowFold')
const BelowFold = lazy(() => loadBelowFold().then((m) => ({ default: m.BelowFold })))
const Footer = lazy(() => loadBelowFold().then((m) => ({ default: m.Footer })))

/**
 * Public landing page `/` (landing-prototype/index.html). Blocks in the
 * prototype's order: header, hero, how it works (with the animation), example
 * object, trust and data, price, FAQ, final call to action, footer.
 *
 * Loaded as its own chunk. The hero has no animation and no Supabase; the
 * blocks below it come in a second chunk right after, so the first screen
 * paints sooner on slow phones.
 */
export function LandingPage() {
  const { copy, locale } = useLandingCopy()
  const n = copy.nav

  return (
    <div className="lp">
      <header className="nav">
        <div className="in">
          <a className="logo" href="#top" aria-label={n.home}>
            <LogoMark />
            BuildProof
          </a>
          <LandingLanguageSwitcher locale={locale} label={n.language} />
          <Link className="login" to="/login">
            {n.login}
          </Link>
          <a className="btn btn-main btn-sm" href="#start">
            {n.cta}
          </a>
        </div>
        {copy.meta.fallbackNote && (
          <div className="langnote" role="note">
            <div className="in">{copy.meta.fallbackNote}</div>
          </div>
        )}
      </header>

      <main id="top">
        <Hero copy={copy} />
        <Suspense fallback={<div className="below-fold-pending" />}>
          <BelowFold copy={copy} locale={locale} />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer copy={copy} />
      </Suspense>
    </div>
  )
}
