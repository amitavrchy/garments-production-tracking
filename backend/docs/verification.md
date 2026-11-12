# Verification record

Landing motion follow-up (12 November 2026): four focused Playwright tests pass in installed Microsoft Edge against the production build. The new motion check samples the animated scan transform, observes a running section reveal after scrolling, checks workflow transition animation, and confirms all descendant animations stop when reduced motion is enabled at runtime. Hero copy enters in sequence; the garment illustration floats with a moving clipped scan, brighter seam tracer and pulsing checkpoints. Buttons stay stationary. Next.js production build/TypeScript and formatting pass. Bundled Chromium failed to launch on this machine, so this run uses Edge.

Landing design revision (12 November 2026): production build and TypeScript compilation pass. Three focused Playwright checks pass against the production server: interactive garment checkpoints/product tour/workflow/roles/FAQ/calculator; mobile navigation with minimum 14px HTML text and no horizontal page overflow; exact 80% section containers at 390, 768, 1024, 1440 and 1920px with reduced-motion support. Refreshed desktop, hero and mobile screenshots were visually reviewed. This revision changes the public landing page only; the full application results below are from the preceding verification run.

Verified locally on **12 November 2026 (Asia/Dhaka)** with Node 24.18, Next.js 16.4.6, NestJS 11.2.9, Prisma 7.10.1, PostgreSQL 17 and Redis 7.

| Check                                         | Result                                                        |
| --------------------------------------------- | ------------------------------------------------------------- |
| Idempotent setup                              | Services healthy, migrations current, existing seed preserved |
| Formatting                                    | All matched files pass Prettier                               |
| Strict TypeScript                             | Both workspaces pass                                          |
| Unit + PostgreSQL acceptance                  | 45 passed                                                     |
| Production build                              | NestJS and Next.js pass                                       |
| Browser acceptance against production servers | 17 passed in installed Microsoft Edge                         |
| Dependency audit                              | Zero reported vulnerabilities                                 |
| Specification REST aliases                    | All nine read aliases return authenticated data               |
| BullMQ aggregation                            | Job completes and report/bulletin cache keys are populated    |

Database tests cover parallel duplicate hour posts, atomic WIP rejection, BOM shortage release, weighted efficiency, live DHU, rework, finishing/packing limits, shipment state, payroll rate reconciliation, independent approval, locked periods, tenant/role/line boundaries and audit versions.

Browser tests cover secure sign-in, realtime connection, all module screens, persistent buyer create/edit/delete, duplicate-slot feedback, command search, notifications, mobile navigation/overflow, minimum 14px HTML typography, unauthenticated/cross-origin rejection and QC permission enforcement. Chart labels use 16px SVG text with a 660px minimum drawing width to preserve readability on small screens.

Screenshots in `docs/screenshots` come from the production browser run. Browser-generated reports, traces and temporary screenshots remain ignored. The CI template lives in backend/ci/workflows/ci.yml. The requested two-folder root has no .github/workflows directory, so GitHub does not automatically discover it. Run backend npm run verify:all and frontend npm run test:e2e, or configure a runner using the template.

No public production deployment or external email/SMS/customs integration was performed. See the README and deployment guide for implementation boundaries and operational setup.

Advanced acceptance additionally covers independent procurement/stock clearance, concurrent lot issues, idempotent replay, optimistic allocation/scenario updates, machine maintenance, attendance and skills, final sampling/CAPA, cost reconciliation, bundle checkpoints, subcontract returns, compliance review, atomic CSV import, public landing interactions and offline draft review. Dialog controls now expose busy state and close immediately after a committed action while workspace data refreshes in the background.

Both applications were installed from their independent lockfiles after the checkout moved to Desktop/products/garments-production-tracking. The sample data was preserved; date-sensitive browser fixtures use recorded production/allocation dates rather than assuming the seed was created today. Root contains only frontend and backend, excluding Git metadata.
