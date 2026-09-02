import { Link } from 'react-router-dom'
import { Building2, HardHat, LineChart, TriangleAlert } from 'lucide-react'
import { Reveal } from '../components/Reveal'
import { DashboardPreview } from '../components/DashboardPreview'

const STEPS = [
  {
    icon: HardHat,
    title: 'Прораб — с объекта',
    text: 'Обновляет процент готовности и загружает фото прямо со стройплощадки, с телефона.',
  },
  {
    icon: LineChart,
    title: 'Заказчик — в реальном времени',
    text: 'Видит прогресс по каждому этапу и всю историю изменений. Без звонков прорабу.',
  },
  {
    icon: TriangleAlert,
    title: 'Проблемы — по факту',
    text: 'Замечание фиксируется с фото, приоритетом и ответственным. Не «на словах».',
  },
]

export function Landing() {
  return (
    <div className="min-h-svh overflow-x-hidden bg-white text-slate-800">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="flex items-center gap-2 font-semibold text-slate-900">
            <HardHat className="size-5 text-sky-600" aria-hidden="true" />
            BuildProof
          </span>
          <Link
            to="/login"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
          >
            Войти
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div className="blueprint-grid absolute inset-0" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-gradient-to-b from-sky-50/80 via-white/40 to-white"
          aria-hidden="true"
        />
        <Building2
          className="absolute -right-12 -top-12 hidden size-80 text-sky-600/[0.06] lg:block"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
          <div className="min-w-0">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Ваша стройка.
              <br />В вашем кармане.
            </h1>
            <p className="mt-5 max-w-lg text-base text-slate-600 sm:text-lg">
              Заказчик видит прогресс объекта в реальном времени — с фото-подтверждением
              по каждому этапу и фиксацией проблем. Без бесконечных звонков прорабу.
            </p>
            <div className="mt-8">
              <Link
                to="/login"
                className="inline-flex items-center rounded-lg bg-sky-600 px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-sky-700"
              >
                Войти
              </Link>
            </div>
          </div>

          <Reveal className="hidden min-w-0 lg:block lg:justify-self-end">
            <DashboardPreview />
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <Reveal>
            <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Как это работает
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 100}>
                <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <step.icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Screen preview */}
      <section className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <Reveal>
            <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Так объект выглядит для заказчика
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
              Один экран: общая готовность, прогресс по семи этапам и открытые замечания.
            </p>
          </Reveal>
          <Reveal className="mt-12 min-w-0" delay={100}>
            <DashboardPreview />
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">
          © {new Date().getFullYear()} BuildProof
        </div>
      </footer>
    </div>
  )
}
