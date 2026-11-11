# Deployment

Use Node 24, PostgreSQL 17 and Redis 7. Install dependencies independently in `backend` and `frontend`, inject configuration, then run these from `backend`:

```sh
npm run db:generate
npm run db:migrate
npm run build
npm --prefix ../frontend run build
```

Run `npm run start` in each application directory under a process manager. For a local production preview, `npm run start:all` in `backend` launches both compiled applications. Dotenv paths are `backend/.env` and `frontend/.env.local`; hosted deployments should inject variables. No root package is required.

Before frontend build, set `API_URL` to the internal API origin and `NEXT_PUBLIC_SOCKET_URL` to its public browser-reachable origin. The latter is embedded at build time.

| Backend variable            | Purpose                                          |
| --------------------------- | ------------------------------------------------ |
| `DATABASE_URL`, `REDIS_URL` | Database connections; rediss enables Redis TLS   |
| `JWT_SECRET`                | Unique random secret, 32+ characters             |
| `NODE_ENV=production`       | Secure cookies                                   |
| `CORS_ORIGINS`              | Exact comma-separated origins, no trailing slash |
| `APP_URL`                   | Public web origin                                |
| `PORT`                      | API port; default 4400                           |
| `STRICT_WIP`                | Default true                                     |
| `CUT_OVER_PERCENT_BPS`      | Cut tolerance; default 300 (3%)                  |
| `DEFAULT_SHIFT_MINUTES`     | Planning shift; default 480                      |

Use HTTPS. Keep web and API/socket endpoints on the same site for SameSite cookies. Forward cookies and WebSocket upgrades. Keep PostgreSQL/Redis private. Add shared ingress rate limiting when scaling.

## Provision a factory

Do not seed demo accounts into live databases. Instead:

```powershell
$env:FACTORY_NAME='Your Apparel Ltd.'
$env:ADMIN_EMAIL='admin@yourfactory.com'
$env:ADMIN_PASSWORD='<unique strong password>'
npm run provision:factory
```

Factory/admin creation is atomic and passwords are not printed. Configure floors, lines, users and masters after signing in. Different users must calculate/approve payroll. Factories have isolated accounts and records.

## Operations

- Monitor `/api/health` and worker logs; database readiness does not imply Redis readiness.
- Back up PostgreSQL and verify restores. Docker volumes survive `compose stop`; deleting volumes destroys data.
- Apply migrations, not `db push`, to retain custom integrity rules.
- Caches rebuild from PostgreSQL. Keep Redis persistence for jobs.
- Use style revisions after activation and app corrections to retain audit history.
- Lists are bounded to 10,000 rows/resource. Add pagination/projections before exceeding that size. Factory-wide locks favor integrity; load-test expected terminals.
- Printable invoices/packing lists use recorded cartons and an approved selling price; they do not provide customs/EDI, tax or finance/GL integrations.
- Under the two-folder repository rule, the CI template lives at `backend/ci/workflows/ci.yml`. GitHub automatic discovery would require restoring a root `.github/workflows` directory; it is intentionally not present. `npm run verify:all` from backend checks both apps locally, and the template can be used by a configured runner.
