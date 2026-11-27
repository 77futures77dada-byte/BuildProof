import { priceTable } from '../../config/pricing'
import { isPlaceholder, LEGAL } from '../../config/legal'
import type { LandingCopy } from './copy'
import { CheckIcon, CrossIcon } from './parts'

export function TrustSection({ copy }: { copy: LandingCopy }) {
  const t = copy.trust
  const dataFields = [
    !isPlaceholder(LEGAL.hosting) ? `${t.hosting}: ${LEGAL.hosting}` : null,
    !isPlaceholder(LEGAL.emailProvider) ? `${t.email}: ${LEGAL.emailProvider}` : null,
    !isPlaceholder(LEGAL.analytics) ? `${t.analytics}: ${LEGAL.analytics}` : null,
    !isPlaceholder(LEGAL.dpaTimeline) ? `${t.dpa}: ${LEGAL.dpaTimeline}` : null,
  ].filter(Boolean)
  return (
    <section className="sec alt" id="trust" aria-labelledby="trust-title">
      <div className="in">
        <div className="sec-head">
          <div className="eyebrow">{t.eyebrow}</div>
          <h2 id="trust-title">{t.title}</h2>
          <p>{t.lead}</p>
        </div>
        <div className="two">
          <div className="card">
            <h3>{t.keptTitle}</h3>
            <ul>
              {t.kept.map((item) => (
                <li key={item.strong}>
                  <CheckIcon />
                  <span>
                    <b>{item.strong}</b> {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card no">
            <h3>{t.notTitle}</h3>
            <ul>
              {t.not.map((item) => (
                <li key={item.strong}>
                  <CrossIcon />
                  <span>
                    <b>{item.strong}</b> {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card wide" id="data">
            <h3>{t.dataTitle}</h3>
            <p>{t.dataText}</p>
            {dataFields.length ? <p className="sub-host">{dataFields.join(' · ')}</p> : null}
          </div>
        </div>
      </div>
    </section>
  )
}

export function PricingSection({ copy }: { copy: LandingCopy }) {
  const p = copy.price
  return (
    <section className="sec" id="price" aria-labelledby="price-title">
      <div className="in">
        <div className="sec-head">
          <div className="eyebrow">{p.eyebrow}</div>
          <h2 id="price-title">{p.title}</h2>
          <p>{p.lead}</p>
        </div>
        <div className="price-grid">
          <div>
            <table>
              <thead>
                <tr>
                  <th scope="col">{p.colObjects}</th>
                  <th scope="col">{p.colPrice}</th>
                </tr>
              </thead>
              <tbody>
                {priceTable().map((row) => (
                  <tr key={row.objects} className={row.capped ? 'cap' : undefined}>
                    <td>{row.capped ? p.capRow : p.row(row.objects)}</td>
                    <td className="n">{row.eur} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="vat">{p.invoice}</p>
          </div>
          <div className="price-side">
            <div className="ex">
              <span className="eyebrow">{p.exampleEyebrow}</span>
              <b>{p.exampleTitle}</b>
              <span>{p.exampleMath}</span>
            </div>
            <div className="card">
              <ul>
                {p.included.map((line) => (
                  <li key={line}>
                    <CheckIcon />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="day31">
              <b>{p.day31Strong}</b>
              {p.day31}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function FaqSection({ copy }: { copy: LandingCopy }) {
  const f = copy.faq
  return (
    <section className="sec alt" id="faq" aria-labelledby="faq-title">
      <div className="in">
        <div className="sec-head">
          <div className="eyebrow">{f.eyebrow}</div>
          <h2 id="faq-title">{f.title}</h2>
        </div>
        <div className="faq">
          {f.items.map((item, i) => (
            <details key={item.q} open={i === 0}>
              <summary>{item.q}</summary>
              <p>
                {item.strong && <b>{item.strong} </b>}
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Footer({ copy }: { copy: LandingCopy }) {
  const f = copy.footer
  const companyName = isPlaceholder(LEGAL.companyName) ? null : LEGAL.companyName
  const registry = isPlaceholder(LEGAL.registryCode) ? null : LEGAL.registryCode
  const vat = isPlaceholder(LEGAL.vatNumber) ? null : LEGAL.vatNumber
  const phone = isPlaceholder(LEGAL.phone) ? null : LEGAL.phone
  const email = isPlaceholder(LEGAL.email) ? null : LEGAL.email
  const hasLegal = companyName || registry || vat
  const hasContact = phone || email
  return (
    <footer>
      <div className="in">
        <div>
          <b>BuildProof</b>
          <br />
          {hasLegal ? <>
            {companyName ? <><br />{companyName}</> : null}
            {registry ? <><br />{f.registry} {registry}</> : null}
            {vat ? <> · {f.vat} {vat}</> : null}
          </> : null}
        </div>
        {hasContact ? <div>
          <b>{f.contact}</b>
          {phone ? <><br />{phone}</> : null}
          {email ? <><br /><a href={`mailto:${email}`}>{email}</a></> : null}
        </div> : null}
      </div>
    </footer>
  )
}
