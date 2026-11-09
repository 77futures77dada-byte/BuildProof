import { LEGAL } from '../../config/legal'
import type { LandingCopy } from './copy'
import { DEMO_OBJECTS, HERO_STALE_OBJECT, isPending, objectTotals } from './demoObjects'
import { Legal, Pill } from './parts'

/** "Made by …" line; on phones it sits below the dashboard, on desktop under the CTAs. */
function HumanLine({ copy, className }: { copy: LandingCopy; className: string }) {
  const h = copy.hero
  return (
    <p className={`human ${className}`}>
      {h.humanLead} <Legal value={LEGAL.founderName} />, {h.humanCountry} · <Legal value={LEGAL.phone} />. {h.humanTail}
    </p>
  )
}

function OwnerDashboard({ copy }: { copy: LandingCopy }) {
  const d = copy.dashboard
  const house = objectTotals(DEMO_OBJECTS.house.stages)
  const flat = objectTotals(DEMO_OBJECTS.flat.stages)
  const housePending = DEMO_OBJECTS.house.stages.filter(isPending).length
  const flatPending = DEMO_OBJECTS.flat.stages.filter(isPending).length
  const o = d.objects

  return (
    <div className="app" role="img" aria-label={d.aria}>
      <div className="app-top">
        <b>{d.title(3)}</b>
        <span>{d.now}</span>
      </div>
      <ul className="objs">
        {/* The stalled site comes first: it is what the owner must notice. */}
        <li className="obj">
          <div>
            <h3>{o.voru.name}</h3>
            <div className="meta">{d.reportedBy(o.voru.who, o.voru.when)}</div>
          </div>
          <div className="pct">
            {HERO_STALE_OBJECT.accepted}%<small>{d.accepted}</small>
          </div>
          <div className="bar">
            <i style={{ width: `${HERO_STALE_OBJECT.accepted}%` }} />
          </div>
          <div className="tags">
            <Pill tone="bad">{o.voru.fresh}</Pill>
            <Pill tone="bad">{o.voru.issue}</Pill>
          </div>
        </li>
        <li className="obj">
          <div>
            <h3>{o.elva.name}</h3>
            <div className="meta">{d.reportedBy(o.elva.who, o.elva.when)}</div>
          </div>
          <div className="pct">
            {house.accepted}%<small>{d.withPending(house.withPending)}</small>
          </div>
          <div className="bar">
            <u style={{ width: `${house.withPending}%` }} />
            <i style={{ width: `${house.accepted}%` }} />
          </div>
          <div className="tags">
            <Pill tone="warn">{o.elva.fresh}</Pill>
            {housePending > 0 && <Pill tone="neutral">{d.pendingCount(housePending)}</Pill>}
          </div>
        </li>
        <li className="obj">
          <div>
            <h3>{o.tartu.name}</h3>
            <div className="meta">{d.reportedBy(o.tartu.who, o.tartu.when)}</div>
          </div>
          <div className="pct">
            {flat.accepted}%<small>{flatPending > 0 ? d.withPending(flat.withPending) : d.accepted}</small>
          </div>
          <div className="bar">
            {flatPending > 0 && <u style={{ width: `${flat.withPending}%` }} />}
            <i style={{ width: `${flat.accepted}%` }} />
          </div>
          <div className="tags">
            <Pill tone="ok">{o.tartu.fresh}</Pill>
            {flatPending > 0 && <Pill tone="neutral">{d.pendingCount(flatPending)}</Pill>}
          </div>
        </li>
      </ul>
    </div>
  )
}

function WorkerPhone({ copy }: { copy: LandingCopy }) {
  const p = copy.phone
  const roof = DEMO_OBJECTS.house.stages.find((s) => s.id === 'r')
  return (
    <div className="phone" aria-hidden="true">
      <div className="scr">
        <div className="queued">{p.queued}</div>
        <div className="ph">
          <span>{p.photoLabel}</span>
        </div>
        <div className="row">{p.stageNow(copy.demo.stages.house.r.name, roof?.confirmed ?? 0)}</div>
        <div className="chips">
          <b>+10</b>
          <b>+25</b>
          <b className="on">{p.all}</b>
        </div>
        <div className="send">{p.send}</div>
      </div>
    </div>
  )
}

export function Hero({ copy }: { copy: LandingCopy }) {
  const h = copy.hero
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="in">
        <div className="hero-copy">
          <h1 id="hero-title">{h.title}</h1>
          <p className="sub">
            {h.subLead} <b>{h.subStrong}</b> {h.subTail}
          </p>
          <div className="ctas">
            <a className="btn btn-main" href="#start">
              {h.ctaMain}
            </a>
            <a className="btn btn-ghost" href="#object">
              {h.ctaExample}
            </a>
          </div>
          <p className="trust">
            <b>{h.trustStrong}</b>
            {h.trust}
          </p>
          <HumanLine copy={copy} className="d-only" />
        </div>

        <div className="stagewrap">
          <OwnerDashboard copy={copy} />
          <WorkerPhone copy={copy} />
        </div>
        <HumanLine copy={copy} className="m-only" />
      </div>
    </section>
  )
}
