import type { Locale } from '../../i18n'
import type { LandingCopy } from './copy'
import { DEMO_OBJECTS, objectTotals } from './demoObjects'
import { LazySiteLoop } from './LazySiteLoop'
import { Pill } from './parts'

export function HowItWorks({ copy, locale }: { copy: LandingCopy; locale: Locale }) {
  const c = copy.how
  const house = objectTotals(DEMO_OBJECTS.house.stages)
  const roof = DEMO_OBJECTS.house.stages.find((s) => s.id === 'r')

  return (
    <section className="sec alt" id="how" aria-labelledby="how-title">
      <div className="in">
        <div className="sec-head">
          <div className="eyebrow">{c.eyebrow}</div>
          <h2 id="how-title">{c.title}</h2>
          <p>{c.lead}</p>
        </div>
        <div className="steps">
          {c.steps.map((step, i) => (
            <div className="step" key={step.who}>
              <div className="who">{step.who}</div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              {i === 1 && roof && (
                <div className="confirm">
                  <div className="nums">
                    <div>
                      <strong>{house.accepted}%</strong>
                      <span>{c.acceptedLabel}</span>
                    </div>
                    <div>
                      <strong>{house.withPending}%</strong>
                      <span>{c.withPendingLabel}</span>
                    </div>
                  </div>
                  <Pill tone="neutral">{c.pendingJump(copy.demo.stages.house.r.name, roof.confirmed, roof.claimed)}</Pill>
                </div>
              )}
            </div>
          ))}
        </div>
        <figure className="loopfig" aria-label={c.loopTitle}>
          <LazySiteLoop locale={locale} loadingLabel={c.loopLoading} />
          <figcaption className="loopcap">{c.loopCaption}</figcaption>
        </figure>
      </div>
    </section>
  )
}
