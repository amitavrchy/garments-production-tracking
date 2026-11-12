'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Layers3,
  Play,
  Check,
  ChevronDown,
  Plus,
  Minus,
  Menu,
  X,
  ShieldCheck,
  ScanLine,
  ChartNoAxesCombined,
  CalendarRange,
  Boxes,
  Users,
  Leaf,
  CheckCircle2,
  LockKeyhole,
  CloudUpload,
  Activity,
  Scissors,
  Truck,
} from 'lucide-react';
import { Modal } from './primitives';
import { number } from '@/lib/types';
const stages = [
  {
    name: 'Plan',
    label: 'A promise backed by capacity.',
    description:
      'Model manpower, efficiency and overtime before committing a line. Compare scenarios and release a plan only while its inputs are current.',
    icon: CalendarRange,
    details: ['Capacity scenarios', 'Operation bottlenecks', 'Qualified worker suggestions'],
  },
  {
    name: 'Source',
    label: 'The right material. In the right place.',
    description:
      'Connect supplier prices, independent purchase approval and lot-level receipts. Keep held fabric off the floor until quality clears it.',
    icon: Boxes,
    details: [
      'Procurement approvals',
      'Shade & fabric lot tracking',
      'Atomic stock issues and returns',
    ],
  },
  {
    name: 'Make',
    label: 'Give every hour a clear story.',
    description:
      'Capture line output, understand lost minutes and follow bundle handoffs. Network interruptions can stay in a local outbox until they are ready to sync.',
    icon: Scissors,
    details: ['Hourly production & SMV', 'Downtime and maintenance', 'QR bundle passports'],
  },
  {
    name: 'Assure',
    label: 'Quality that closes the loop.',
    description:
      'Record defects where they happen. Assess finished lots against explicit buyer limits, investigate root causes and verify corrective action independently.',
    icon: ShieldCheck,
    details: ['Live DHU & rework', 'Final sampling audits', 'Corrective & preventive actions'],
  },
  {
    name: 'Deliver',
    label: 'Finish with every piece accounted for.',
    description:
      'Carry color and size balances through finishing, cartons and dispatch. Reconcile worker earnings and explain the cost behind an order margin.',
    icon: Truck,
    details: ['Packing & shipment control', 'Operation-based payroll', 'BOM and SMV costing'],
  },
];
const roles = [
  {
    name: 'Planning',
    title: 'See the space between demand and capacity.',
    copy: 'A visual line/day board, what-if schedules and station-level gaps help planners make commitments with context.',
    metric: 'Capacity, made visible',
    points: [
      'Move unstarted allocations between free slots',
      'Compare manpower and overtime scenarios',
      'Protect recorded actuals while replanning',
    ],
    view: 'planning',
  },
  {
    name: 'Production',
    title: 'A live pulse, without the paper chase.',
    copy: 'Supervisors log the hour. The floor sees the change. Every revision keeps its history, and each bundle keeps its digital thread.',
    metric: 'Every handoff has a history',
    points: [
      'Line-scoped production entry',
      'QR checkpoints and quality holds',
      'Local production outbox with safe retries',
    ],
    view: 'overview',
  },
  {
    name: 'Quality',
    title: 'Find the cause. Follow the correction.',
    copy: 'Give inspections, rework, final sampling and corrective action a shared home. Keep the evidence beside the decision.',
    metric: 'Quality beyond a defect count',
    points: [
      'Defect occurrences and good-output balance',
      'Buyer-configured sampling acceptance',
      'Independent CAPA verification',
    ],
    view: 'quality',
  },
  {
    name: 'Commercial',
    title: 'Know what goes into the margin.',
    copy: 'Connect approved supplier prices and explicit exchange rates to material consumption, standard minutes and unit overheads.',
    metric: 'A cost sheet you can explain',
    points: [
      'BOM material costs with wastage',
      'SMV-derived labor and unit costs',
      'Separate procurement and cost approval',
    ],
    view: 'costing',
  },
];
const faqs = [
  [
    'What does Loom connect?',
    'The workflow from buyer PO and style/BOM through materials, cutting, sewing, quality, finishing, packing and shipment. Planning, costing, workforce and compliance records sit alongside the production chain.',
  ],
  [
    'Can I try it with sample factory data?',
    'Yes. Open the workspace and sign in with a configured account. A local sample factory can be seeded with lines, orders and advanced workflow examples; the product preview on this page is illustrative.',
  ],
  [
    'How does offline production entry work?',
    'If a production submission loses its network connection, the browser can save a local draft. The signed-in user can review and sync it later. Idempotency keys prevent duplicate creation; validation conflicts stay visible for review.',
  ],
  [
    'How are factory records protected?',
    'Factory-scoped access, role and line permissions, database constraints, transaction locks and before/after audits protect operational changes. Sensitive financial reads and independent approvals are controlled separately.',
  ],
  [
    'Can we use our own sampling and costing assumptions?',
    'Final sampling uses explicit buyer-configured acceptance counts. Costing uses recorded supplier prices, exchange rates, BOM wastage, style SMV and unit overheads. These are transparent inputs, not an external standards certification.',
  ],
  [
    'Can Loom run on our infrastructure?',
    'The application has separate Next.js frontend and NestJS backend projects with PostgreSQL and Redis. Your team can provision isolated factory accounts and deploy the services on infrastructure it manages.',
  ],
];
export function Landing() {
  const [menu, setMenu] = useState(false),
    [stage, setStage] = useState(0),
    [role, setRole] = useState(0),
    [preview, setPreview] = useState('overview'),
    [tour, setTour] = useState(false),
    [faq, setFaq] = useState<number | null>(0),
    [operators, setOperators] = useState(32),
    [smv, setSmv] = useState(12),
    [eff, setEff] = useState(80),
    [minutes, setMinutes] = useState(480);
  const capacity = Math.floor((operators * minutes * (eff / 100)) / smv),
    active = stages[stage];
  return (
    <div className="landing">
      <a className="lp-skip" href="#product">
        Skip to product
      </a>
      <header className="lp-nav">
        <div className="lp-container lp-nav-inner">
          <Link href="/" className="lp-brand">
            <span>
              <Layers3 size={27} />
            </span>
            loom<span className="lp-brand-dot">.</span>
          </Link>
          <nav className={menu ? 'lp-links open' : 'lp-links'} aria-label="Main navigation">
            <a href="#product" onClick={() => setMenu(false)}>
              Platform
            </a>
            <a href="#workflow" onClick={() => setMenu(false)}>
              How it works
            </a>
            <a href="#teams" onClick={() => setMenu(false)}>
              For your team
            </a>
            <a href="#questions" onClick={() => setMenu(false)}>
              Questions
            </a>
          </nav>
          <div className="lp-nav-actions">
            <Link className="lp-signin" href="/login">
              Sign in <ArrowUpRight size={16} />
            </Link>
            <Link href="/workspace" className="lp-button small">
              Open workspace
              <ArrowRight size={16} />
            </Link>
            <button
              className="lp-menu"
              aria-label={menu ? 'Close menu' : 'Open menu'}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
      </header>
      <main>
        <section className="lp-hero">
          <div className="lp-container">
            <div className="lp-hero-top">
              <div>
                <div className="lp-overline">
                  <i />
                  APPAREL PRODUCTION INTELLIGENCE
                </div>
                <h1>
                  Production.
                  <br />
                  Connected
                  <br />
                  <span>at every seam.</span>
                </h1>
                <p className="lp-hero-description">
                  Turn orders, materials, people and production into one continuous thread. A clear
                  signal from the cutting table to the last carton.
                </p>
                <div className="lp-hero-actions">
                  <Link href="/workspace" className="lp-button">
                    Enter the workspace
                    <ArrowUpRight size={19} />
                  </Link>
                  <button className="lp-play" onClick={() => setTour(true)}>
                    <span>
                      <Play size={15} fill="currentColor" />
                    </span>
                    Take a product tour
                  </button>
                </div>
                <div className="lp-hero-note">
                  <Check size={15} />
                  Built around Bangladesh’s production floor
                </div>
              </div>
              <div className="lp-hero-aside">
                <ProductionSchematic stage={stage} onStage={setStage} />
              </div>
            </div>
            <div className="lp-hero-index">
              <span>
                <i />
                CONNECTED FACTORY SYSTEM
              </span>
              <span>
                01 / PLAN<span>02 / MAKE</span>03 / DELIVER
              </span>
              <a href="#product">
                Explore the platform
                <ArrowDown />
              </a>
            </div>
            <div className="lp-preview-stage" id="product">
              <div className="lp-preview-heading">
                <div>
                  <span className="lp-live-dot" />
                  THE FLOOR, TRANSLATED INTO SIGNAL
                </div>
                <span>01 — CONTROL ROOM / SAMPLE DATA</span>
              </div>
              <ProductPreview view={preview} onView={setPreview} />
              <div className="lp-floating-ticket">
                <span className="lp-ticket-icon">
                  <ScanLine size={23} />
                </span>
                <div>
                  <strong>Trace the handoff.</strong>
                  <span>BDL-2026-0001 / Quality checkpoint</span>
                </div>
                <CheckCircle2 size={22} />
              </div>
              <div className="lp-preview-caption">
                <span>
                  <LockKeyhole size={14} />
                  Connected records. Controlled changes.
                </span>
                <a href="#workflow">
                  Follow the production journey
                  <ArrowDown />
                </a>
              </div>
            </div>
          </div>
        </section>
        <section className="lp-process-strip">
          <div className="lp-container">
            <span>
              ONE FLOW.
              <br />
              <strong>FROM PO TO PORT.</strong>
            </span>
            <div>
              {['Buyer PO', 'Materials', 'Cutting', 'Sewing', 'Quality', 'Shipment'].map((s, i) => (
                <div key={s}>
                  <b>{String(i + 1).padStart(2, '0')}</b>
                  {s}
                  {i < 5 && <ArrowRight size={18} />}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="lp-section lp-platform">
          <div className="lp-container">
            <div className="lp-section-title">
              <div>
                <span className="lp-overline">02 / THE MANUFACTURING SYSTEM</span>
                <h2>
                  A system that knows
                  <br />
                  <span>the shape of your work.</span>
                </h2>
              </div>
              <p>
                Capacity. Material. Quality. Margin. Follow the constraints that shape every
                garment, and make the next decision with the whole picture.
              </p>
            </div>
            <div className="lp-bento">
              <article className="lp-bento-plan">
                <div className="lp-feature-icon">
                  <CalendarRange size={24} />
                </div>
                <span className="lp-feature-label">PLAN WITH CONTEXT</span>
                <h3>
                  Capacity you can
                  <br />
                  commit to.
                </h3>
                <p>
                  Visual schedules, what-if scenarios and operation-level bottlenecks put achievable
                  output beside your delivery commitments.
                </p>
                <div className="lp-mini-board" aria-label="Illustrative capacity board">
                  <div>
                    <span>Line 01</span>
                    <i className="lp-board-long">
                      PO-2026-001 <b>1,900 pcs</b>
                    </i>
                  </div>
                  <div>
                    <span>Line 02</span>
                    <i className="lp-board-short">PO-2026-002</i>
                    <em>Available</em>
                  </div>
                  <div>
                    <span>Line 03</span>
                    <i className="lp-board-medium">
                      PO-2026-003 <b>2,100 pcs</b>
                    </i>
                  </div>
                </div>
                <a href="/capacity">
                  Explore planning <ArrowUpRight size={17} />
                </a>
              </article>
              <article className="lp-bento-trace">
                <div className="lp-feature-icon">
                  <ScanLine size={24} />
                </div>
                <span className="lp-feature-label">FOLLOW THE WORK</span>
                <h3>
                  Every handoff.
                  <br />
                  Every piece.
                </h3>
                <p>
                  QR bundle passports and checkpoints connect the cutting table to the packing
                  floor.
                </p>
                <div className="lp-trace-art">
                  <span>
                    Cutting <Check size={15} />
                  </span>
                  <i />
                  <span>
                    Sewing <Check size={15} />
                  </span>
                  <i />
                  <span className="current">
                    Quality <Activity size={15} />
                  </span>
                  <i />
                  <span>Packing</span>
                </div>
                <a href="/traceability">
                  Explore traceability <ArrowUpRight size={17} />
                </a>
              </article>
              <article className="lp-bento-quality">
                <div className="lp-feature-icon">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <span className="lp-feature-label">CLOSE THE QUALITY LOOP</span>
                  <h3>
                    See the defect.
                    <br />
                    Solve the cause.
                  </h3>
                  <p>
                    Inspections, rework and verified corrective actions keep quality moving with
                    production.
                  </p>
                </div>
                <div className="lp-quality-badge">
                  <ShieldCheck size={28} />
                  <span>Inspect</span>
                  <ArrowRight size={15} />
                  <span>Correct</span>
                  <ArrowRight size={15} />
                  <strong>Verify</strong>
                </div>
                <a href="/assurance">
                  Explore assurance <ArrowUpRight size={17} />
                </a>
              </article>
              <article className="lp-bento-cost">
                <div className="lp-feature-icon">
                  <ChartNoAxesCombined size={24} />
                </div>
                <span className="lp-feature-label">KNOW THE COST</span>
                <h3>
                  Margins with
                  <br />a paper trail.
                </h3>
                <p>
                  BOM, supplier prices, standard minutes and overheads explain the numbers behind
                  each order.
                </p>
                <div className="lp-cost-art">
                  <div>
                    <span>Materials</span>
                    <i style={{ width: '74%' }} />
                  </div>
                  <div>
                    <span>Labor</span>
                    <i style={{ width: '32%' }} />
                  </div>
                  <div>
                    <span>Overheads</span>
                    <i style={{ width: '20%' }} />
                  </div>
                </div>
                <a href="/commercial">
                  Explore costing <ArrowUpRight size={17} />
                </a>
              </article>
            </div>
          </div>
        </section>
        <section className="lp-workflow lp-section" id="workflow">
          <div className="lp-container">
            <div className="lp-section-title">
              <div>
                <span className="lp-overline">FROM COMMITMENT TO CARTON</span>
                <h2>
                  Keep the whole
                  <br />
                  <span>journey in view.</span>
                </h2>
              </div>
              <p>
                Different teams. Different tasks. One continuous record of how the work gets done.
              </p>
            </div>
            <div className="lp-stage-tabs" role="tablist" aria-label="Production journey">
              {stages.map((s, i) => (
                <button
                  role="tab"
                  aria-selected={stage === i}
                  key={s.name}
                  onClick={() => setStage(i)}
                >
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {s.name}
                  <s.icon size={20} />
                </button>
              ))}
            </div>
            <div className="lp-stage-content">
              <div className="lp-stage-number" aria-hidden="true">
                0{stage + 1}
                <active.icon size={72} strokeWidth={1} />
                <div className="lp-stage-dashes" />
              </div>
              <div>
                <span className="lp-feature-label">
                  {active.name.toUpperCase()} · CONNECTED BY LOOM
                </span>
                <h3>{active.label}</h3>
                <p>{active.description}</p>
                <ul>
                  {active.details.map((d) => (
                    <li key={d}>
                      <Check size={17} />
                      {d}
                    </li>
                  ))}
                </ul>
                <Link href="/workspace" className="lp-inline-link">
                  See it in the workspace
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="lp-teams lp-section" id="teams">
          <div className="lp-container">
            <div className="lp-centered-title">
              <span className="lp-overline">THE SAME FACTORY. A SHARED PICTURE.</span>
              <h2>
                Made for the people
                <br />
                who <span>make things.</span>
              </h2>
              <p>Give each role the tools, context and permissions it needs.</p>
            </div>
            <div className="lp-role-tabs" role="tablist" aria-label="Factory roles">
              {roles.map((r, i) => (
                <button
                  key={r.name}
                  role="tab"
                  aria-selected={role === i}
                  onClick={() => setRole(i)}
                >
                  {r.name}
                </button>
              ))}
            </div>
            <div className="lp-role-content">
              <div>
                <span className="lp-overline">{roles[role].metric}</span>
                <h3>{roles[role].title}</h3>
                <p>{roles[role].copy}</p>
                <ul>
                  {roles[role].points.map((point) => (
                    <li key={point}>
                      <CheckCircle2 size={18} />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link className="lp-button" href="/workspace">
                  Find your workspace
                  <ArrowRight size={18} />
                </Link>
              </div>
              <div className="lp-role-preview">
                <ProductPreview view={roles[role].view} compact />
              </div>
            </div>
          </div>
        </section>
        <section className="lp-calculator lp-section">
          <div className="lp-container lp-calculator-layout">
            <div>
              <span className="lp-overline">TURN ASSUMPTIONS INTO A PLAN</span>
              <h2>
                What could your
                <br />
                <span>next shift make?</span>
              </h2>
              <p>
                Explore the relationship between manpower, standard minutes and efficiency. Use the
                result as a planning estimate, then test it against the realities of your floor.
              </p>
              <Link href="/capacity" className="lp-inline-link">
                Build a capacity scenario
                <ArrowUpRight size={18} />
              </Link>
            </div>
            <div className="lp-calculator-card">
              <div className="lp-calc-top">
                <span>
                  <CalendarRange size={20} />
                  Shift capacity calculator
                </span>
                <span>ILLUSTRATIVE ESTIMATE</span>
              </div>
              <div className="lp-calc-fields">
                <label>
                  Operators
                  <input
                    aria-label="Calculator operators"
                    type="number"
                    min={1}
                    max={5000}
                    value={operators}
                    onChange={(e) =>
                      setOperators(Math.min(5000, Math.max(1, Number(e.target.value) || 1)))
                    }
                  />
                </label>
                <label>
                  Style SMV
                  <input
                    aria-label="Calculator SMV"
                    type="number"
                    min={0.1}
                    max={1000}
                    step={0.1}
                    value={smv}
                    onChange={(e) =>
                      setSmv(Math.min(1000, Math.max(0.1, Number(e.target.value) || 0.1)))
                    }
                  />
                </label>
                <label>
                  Shift minutes
                  <input
                    aria-label="Calculator shift minutes"
                    type="number"
                    min={60}
                    max={1440}
                    step={30}
                    value={minutes}
                    onChange={(e) =>
                      setMinutes(Math.min(1440, Math.max(60, Number(e.target.value) || 60)))
                    }
                  />
                </label>
                <label>
                  Efficiency <span>{eff}%</span>
                  <input
                    aria-label="Calculator efficiency"
                    type="range"
                    min={10}
                    max={100}
                    value={eff}
                    onChange={(e) => setEff(Number(e.target.value))}
                  />
                </label>
              </div>
              <div className="lp-calc-result" aria-live="polite">
                <span>Estimated shift capacity</span>
                <strong>
                  {number(capacity)}
                  <small>pieces</small>
                </strong>
                <p>Operators × minutes × efficiency ÷ SMV</p>
              </div>
              <span className="lp-calc-note">
                Actual output depends on materials, machine availability, skill and quality losses.
              </span>
            </div>
          </div>
        </section>
        <section className="lp-trust lp-section">
          <div className="lp-container">
            <div className="lp-section-title">
              <div>
                <span className="lp-overline">CONFIDENCE IS BUILT INTO THE PROCESS</span>
                <h2>
                  Clear records.
                  <br />
                  <span>Controlled changes.</span>
                </h2>
              </div>
              <p>Keep the operational history that lets a team trust the next decision.</p>
            </div>
            <div className="lp-trust-grid">
              <article>
                <LockKeyhole size={24} />
                <h3>The right access</h3>
                <p>Factory, role and line permissions put controls where work actually happens.</p>
              </article>
              <article>
                <ShieldCheck size={24} />
                <h3>Independent decisions</h3>
                <p>
                  Separate creation from approval across procurement, payroll and quality
                  verification.
                </p>
              </article>
              <article>
                <CloudUpload size={24} />
                <h3>A visible history</h3>
                <p>
                  Audited revisions and reviewable offline drafts help changes keep their context.
                </p>
              </article>
              <article>
                <Leaf size={24} />
                <h3>Measured impact</h3>
                <p>
                  Record resource consumption and scrap recovery with explicit estimation
                  assumptions.
                </p>
              </article>
            </div>
          </div>
        </section>
        <section className="lp-faq lp-section" id="questions">
          <div className="lp-container lp-faq-layout">
            <div>
              <span className="lp-overline">A FEW THINGS YOU MAY BE WONDERING</span>
              <h2>
                Good questions.
                <br />
                <span>Clear answers.</span>
              </h2>
              <p>The details matter. Here’s how Loom fits into your factory.</p>
            </div>
            <div className="lp-faq-list">
              {faqs.map(([q, a], i) => (
                <article key={q} className={faq === i ? 'open' : ''}>
                  <button
                    aria-expanded={faq === i}
                    aria-controls={`faq-${i}`}
                    onClick={() => setFaq(faq === i ? null : i)}
                  >
                    {q}
                    {faq === i ? <Minus size={19} /> : <Plus size={19} />}
                  </button>
                  <div id={`faq-${i}`} hidden={faq !== i}>
                    <p>{a}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="lp-final">
          <div className="lp-container">
            <div className="lp-final-art" aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => (
                <i key={i} style={{ '--thread': i } as React.CSSProperties} />
              ))}
            </div>
            <span className="lp-overline">A BETTER-CONNECTED FLOOR STARTS HERE</span>
            <h2>
              Make room for
              <br />
              <span>a clearer tomorrow.</span>
            </h2>
            <p>
              Your orders. Your people. Your production.
              <br />
              One workspace to bring them together.
            </p>
            <Link href="/workspace" className="lp-button light">
              Step inside Loom
              <ArrowUpRight size={20} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-top">
            <Link href="/" className="lp-brand">
              <span>
                <Layers3 size={27} />
              </span>
              loom<span className="lp-brand-dot">.</span>
            </Link>
            <p>
              Connected manufacturing.
              <br />
              Made for the people behind the product.
            </p>
            <div>
              <a href="#product">Platform</a>
              <a href="#workflow">Workflow</a>
              <a href="#teams">Teams</a>
              <Link href="/login">
                Sign in
                <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© {new Date().getFullYear()} Loom Production Workspace</span>
            <span>Designed around the production floor · Asia/Dhaka</span>
          </div>
        </div>
      </footer>
      {tour && (
        <Modal
          title="A connected factory, in focus"
          subtitle="Interactive product preview · sample data. Sign in to use real factory records."
          onClose={() => setTour(false)}
          wide
        >
          <div className="lp-tour">
            <ProductPreview view={preview} onView={setPreview} />
            <Link className="lp-button" href="/workspace">
              Open the live workspace
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </Modal>
      )}
    </div>
  );
}
function ProductionSchematic({
  stage,
  onStage,
}: {
  stage: number;
  onStage: (stage: number) => void;
}) {
  const status = [
    'Capacity mapped',
    'Materials linked',
    'Sewing in progress',
    'Quality checkpoint',
    'Ready for dispatch',
  ][stage];
  return (
    <div className="lp-schematic" aria-label="Interactive garment production schematic">
      <div className="lp-spec-head">
        <span>
          <i />
          THE DIGITAL THREAD
        </span>
        <span>MODEL / 001</span>
      </div>
      <div className="lp-spec-body">
        <div className="lp-spec-meta">
          <span>STYLE ST-2401</span>
          <strong>Essential cotton tee</strong>
          <span>180 GSM / ORGANIC JERSEY</span>
        </div>
        <div className="lp-pattern">
          <span className="lp-pattern-code">PATTERN / FRONT</span>
          <svg
            viewBox="0 0 420 360"
            role="img"
            aria-label="Technical apparel pattern with connected seam checkpoints"
          >
            <defs>
              <pattern id="loom-weave" width="9" height="9" patternUnits="userSpaceOnUse">
                <path
                  d="M0 0H9M0 0V9"
                  fill="none"
                  stroke="#b6c1b5"
                  strokeOpacity=".13"
                  strokeWidth=".5"
                />
              </pattern>
            </defs>
            <path
              className="lp-pattern-outline"
              d="M150 60L112 80L60 145L100 180L120 155V300H300V155L320 180L360 145L308 80L270 60Q210 105 150 60Z"
              fill="url(#loom-weave)"
            />
            <path
              className="lp-pattern-seam"
              d="M155 70Q210 119 265 70M119 87L75 143L99 165L130 140V289H290V140L321 165L345 143L301 87M210 100V290M130 277H290M114 94L154 115M266 115L306 94"
              fill="none"
            />
            <path
              className="lp-pattern-guide"
              d="M35 300H388M120 328V305M300 328V305M120 319H300M210 32V319M73 126L44 101M327 126L377 102"
              fill="none"
            />
            {[
              [150, 60],
              [112, 80],
              [60, 145],
              [120, 155],
              [120, 300],
              [300, 300],
              [300, 155],
              [360, 145],
              [308, 80],
              [270, 60],
            ].map(([cx, cy], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={i % 5 === stage ? 5 : 2.5}
                className={i % 5 === stage ? 'active' : ''}
              />
            ))}
            <path
              className="lp-pattern-tracer"
              d="M150 60L112 80L60 145L100 180L120 155V300H300V155L320 180L360 145L308 80L270 60"
              fill="none"
            />
          </svg>
          <span className="lp-pattern-measure">SIZE M · 01:01</span>
          <span className="lp-pattern-side">SEAM ALLOWANCE / 10 MM</span>
          <div className="lp-pattern-callout">
            <span className="lp-live-dot" />
            <strong>{status}</strong>
            <span>CHECKPOINT 0{stage + 1}</span>
          </div>
        </div>
        <div className="lp-spec-ruler" aria-hidden="true">
          {Array.from({ length: 31 }, (_, i) => (
            <i key={i} className={i % 5 === 0 ? 'major' : ''} />
          ))}
        </div>
      </div>
      <div className="lp-spec-stages" aria-label="Explore garment checkpoints">
        {stages.map((s, i) => (
          <button key={s.name} onClick={() => onStage(i)} aria-pressed={stage === i}>
            <span>0{i + 1}</span>
            {s.name}
            <i />
          </button>
        ))}
      </div>
      <div className="lp-spec-foot">
        <span>
          <ScanLine size={17} />
          BDL-2026-0001
        </span>
        <span>ILLUSTRATIVE WORKFLOW</span>
      </div>
    </div>
  );
}
function ArrowDown() {
  return <ArrowRight size={16} style={{ transform: 'rotate(90deg)' }} />;
}
export function ProductPreview({
  view,
  onView,
  compact = false,
}: {
  view: string;
  onView?: (value: string) => void;
  compact?: boolean;
}) {
  const tabs = ['overview', 'planning', 'quality', 'costing'];
  return (
    <div className={`lp-product-preview ${compact ? 'compact' : ''}`}>
      <div className="lp-browser-bar">
        <span>
          <i />
          <i />
          <i />
        </span>
        <div>
          <LockKeyhole size={12} />
          Loom / {view.charAt(0).toUpperCase() + view.slice(1)}
        </div>
        <span className="lp-browser-status">
          <i />
          Sample workspace
        </span>
      </div>
      <div className="lp-product-body">
        <aside className="lp-demo-sidebar">
          <span>
            <Layers3 size={20} />
            loom.
          </span>
          <div className="lp-demo-factory">
            <span>L</span>
            <div>
              Loom Apparel<small>Factory workspace</small>
            </div>
          </div>
          <strong>WORKSPACE</strong>
          {tabs.map((t) => (
            <button
              key={t}
              className={t === view ? 'active' : ''}
              onClick={() => onView?.(t)}
              disabled={!onView}
            >
              {t === 'overview' ? (
                <Activity size={16} />
              ) : t === 'planning' ? (
                <CalendarRange size={16} />
              ) : t === 'quality' ? (
                <ShieldCheck size={16} />
              ) : (
                <ChartNoAxesCombined size={16} />
              )}
              <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
              {t === view && <i />}
            </button>
          ))}
          <div className="lp-demo-sidebar-bottom">
            <span className="lp-live-dot" />
            Connected by Loom
          </div>
        </aside>
        <div className="lp-demo-main">
          <div className="lp-demo-heading">
            <div>
              <span>YOUR FLOOR, IN FOCUS</span>
              <h3>
                {view === 'overview'
                  ? 'Production overview'
                  : view === 'planning'
                    ? 'Capacity planning'
                    : view === 'quality'
                      ? 'Quality assurance'
                      : 'Order costing'}
                <b>.</b>
              </h3>
            </div>
            <span className="lp-demo-day">
              <CalendarRange size={13} />
              Day shift
            </span>
          </div>
          <div className="lp-demo-metrics">
            {(view === 'quality'
              ? [
                  ['Inspected', '1,200', 'pcs'],
                  ['DHU', '2.17', '%'],
                  ['Open rework', '8', 'pcs'],
                ]
              : view === 'costing'
                ? [
                    ['Material cost', '105.23', 'BDT / pc'],
                    ['Unit cost', '112.73', 'BDT / pc'],
                    ['Quoted margin', '37.37', '%'],
                  ]
                : view === 'planning'
                  ? [
                      ['Lines available', '4', 'lines'],
                      ['Shift target', '8,200', 'pcs'],
                      ['Planned manpower', '140', 'people'],
                    ]
                  : [
                      ['Today’s output', '3,480', 'pcs'],
                      ['Floor efficiency', '99.4', '%'],
                      ['Active orders', '3', 'orders'],
                    ]
            ).map(([label, value, unit]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>
                  {value}
                  <small>{unit}</small>
                </strong>
                <div className="lp-demo-spark">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            ))}
          </div>
          {view === 'planning' ? (
            <div className="lp-demo-schedule">
              <div>
                <span>Production line</span>
                <span>Today</span>
                <span>Tomorrow</span>
                <span>Next shift</span>
              </div>
              {[1, 2, 3].map((n) => (
                <div key={n}>
                  <strong>Line 0{n}</strong>
                  <i>
                    PO-2026-00{n}
                    <small>{1800 + n * 100} pcs</small>
                  </i>
                  <i className={n === 2 ? 'available' : ''}>
                    {n === 2 ? 'Available' : 'Allocated'}
                    <small>{n === 2 ? 'Plan here' : 'Order committed'}</small>
                  </i>
                  <i>Scheduled</i>
                </div>
              ))}
            </div>
          ) : view === 'quality' ? (
            <div className="lp-demo-quality">
              <div className="lp-demo-donut">
                <span>
                  <strong>2.17%</strong>
                  <small>Defects / 100 units</small>
                </span>
              </div>
              <div>
                <span className="lp-demo-table-label">THE QUALITY LOOP</span>
                {[
                  ['Inspection recorded', 'STITCH · 6 occurrences'],
                  ['Rework in progress', '2 pieces to return'],
                  ['Corrective action', 'Independent verification'],
                ].map(([a, b], i) => (
                  <div className="lp-demo-quality-row" key={a}>
                    <span>
                      {i === 0 ? (
                        <CheckCircle2 size={18} />
                      ) : i === 1 ? (
                        <Activity size={18} />
                      ) : (
                        <ShieldCheck size={18} />
                      )}
                    </span>
                    <div>
                      <strong>{a}</strong>
                      <p>{b}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : view === 'costing' ? (
            <div className="lp-demo-costing">
              {[
                ['BOM materials', '58'],
                ['SMV labor', '17'],
                ['Overhead & packing', '15'],
                ['Freight', '10'],
              ].map(([a, b]) => (
                <div key={a}>
                  <span>{a}</span>
                  <div>
                    <i style={{ width: b + '%' }} />
                  </div>
                  <strong>{b}%</strong>
                </div>
              ))}
              <p>Illustrative breakdown · actual costs use recorded supplier prices and SMV.</p>
            </div>
          ) : (
            <div className="lp-demo-chart">
              <div>
                <strong>Hourly output</strong>
                <span>
                  <i />
                  Actual <em />
                  Target pace
                </span>
              </div>
              <svg
                viewBox="0 0 700 170"
                role="img"
                aria-label="Sample hourly output rises across the first five shift hours"
              >
                <defs>
                  <linearGradient
                    id={`lp-area-${compact ? 'small' : 'large'}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#74946d" stopOpacity=".22" />
                    <stop offset="100%" stopColor="#74946d" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[30, 70, 110, 150].map((y) => (
                  <line
                    key={y}
                    x1="20"
                    y1={y}
                    x2="680"
                    y2={y}
                    stroke="#e5ebe0"
                    strokeDasharray="4 5"
                  />
                ))}
                <path
                  d="M20 146L100 117L180 122L260 84L340 91L420 62L500 54L580 25L660 19L660 150L20 150Z"
                  fill={`url(#lp-area-${compact ? 'small' : 'large'})`}
                />
                <path
                  d="M20 146L100 117L180 122L260 84L340 91L420 62L500 54L580 25L660 19"
                  fill="none"
                  stroke="#618157"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 120L660 37"
                  fill="none"
                  stroke="#b5bda9"
                  strokeDasharray="5 6"
                  strokeWidth="2"
                />
                {[20, 180, 340, 500, 660].map((x, i) => (
                  <text
                    key={x}
                    x={x}
                    y="169"
                    textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}
                    fill="#6d7e64"
                    fontSize="16"
                  >
                    {8 + i}:00
                  </text>
                ))}
              </svg>
            </div>
          )}
          <div className="lp-demo-line-cards">
            {[1, 2, 3].map((n) => (
              <div key={n}>
                <div>
                  <span>
                    <Activity size={15} />
                    Line 0{n}
                  </span>
                  <i>Running</i>
                </div>
                <strong>
                  {770 + n * 40}
                  <small>/ {1800 + n * 100} pcs</small>
                </strong>
                <div className="lp-demo-progress">
                  <i style={{ width: 45 + n * 9 + '%' }} />
                </div>
                <span>
                  Efficiency <b>{99 + n / 10}%</b>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
