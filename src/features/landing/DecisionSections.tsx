import type { LandingCopy } from './copy'

export function FirstDaySection({ copy }: { copy: LandingCopy }) {
  const section = copy.firstDay
  return (
    <section className="sec first-day" aria-labelledby="first-day-title">
      <div className="in">
        <div className="sec-head">
          <div className="eyebrow">{section.eyebrow}</div>
          <h2 id="first-day-title">{section.title}</h2>
        </div>
        <ol className="first-day-steps">
          {section.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}
        </ol>
      </div>
    </section>
  )
}

export function ComparisonSection({ copy }: { copy: LandingCopy }) {
  const section = copy.comparison
  return (
    <section className="sec compare" aria-labelledby="compare-title">
      <div className="in">
        <div className="sec-head">
          <div className="eyebrow">{section.eyebrow}</div>
          <h2 id="compare-title">{section.title}</h2>
        </div>
        <div className="compare-table" role="table">
          <div className="compare-head" role="row">
            <h3 role="columnheader">{section.beforeTitle}</h3>
            <h3 role="columnheader">{section.afterTitle}</h3>
          </div>
          {section.rows.map((row) => (
            <div className="compare-row" role="row" key={row.before}>
              <p role="cell">{row.before}</p>
              <p role="cell">{row.after}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
