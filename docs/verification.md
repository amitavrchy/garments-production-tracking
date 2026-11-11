# Verification record

Verified locally on **11 November 2026 (Asia/Dhaka)** with Node 24.18, Next.js 16.4.6, NestJS 11.2.9, Prisma 7.10.1, PostgreSQL 17 and Redis 7.

| Check                                         | Result                                                        |
| --------------------------------------------- | ------------------------------------------------------------- |
| Idempotent setup                              | Services healthy, migrations current, existing seed preserved |
| Formatting                                    | All matched files pass Prettier                               |
| Strict TypeScript                             | Both workspaces pass                                          |
| Unit + PostgreSQL acceptance                  | 26 passed                                                     |
| Production build                              | NestJS and Next.js pass                                       |
| Browser acceptance against production servers | 8 passed in installed Microsoft Edge                          |
| Dependency audit                              | Zero reported vulnerabilities                                 |
| Specification REST aliases                    | All nine read aliases return authenticated data               |
| BullMQ aggregation                            | Job completes and report/bulletin cache keys are populated    |

Database tests cover parallel duplicate hour posts, atomic WIP rejection, BOM shortage release, weighted efficiency, live DHU, rework, finishing/packing limits, shipment state, payroll rate reconciliation, independent approval, locked periods, tenant/role/line boundaries and audit versions.

Browser tests cover secure sign-in, realtime connection, all module screens, persistent buyer create/edit/delete, duplicate-slot feedback, command search, notifications, mobile navigation/overflow, minimum 14px HTML typography, unauthenticated/cross-origin rejection and QC permission enforcement. Chart labels use 16px SVG text with a 660px minimum drawing width to preserve readability on small screens.

Screenshots in `docs/screenshots` come from the production browser run. Browser-generated reports, traces and temporary screenshots remain ignored. GitHub Actions reproduces the checks in a clean Linux environment; its live result is available on the repository Actions tab.

No public production deployment or external email/SMS/customs integration was performed. See the README and deployment guide for implementation boundaries and operational setup.
