# Deployment — two environments on Railway

75 Medium runs as **one Railway project** (`meticulous-charisma`) with **two isolated
environments**. The whole point of this setup: experiments in `integ` can never touch
the real challenge data in `prod`.

| | **prod** (real users) | **integ** (staging) |
|---|---|---|
| Railway environment | `production` | `integ` |
| Git branch it deploys from | `production` | `main` |
| Auto-deploy | on push to `production` (deliberate promote) | on push to `main` (day-to-day) |
| App URL | https://75-medium-app-production.up.railway.app | https://zonal-generosity-integ.up.railway.app |
| Postgres | its own service + volume (real data) | its own service `Postgres-2PpH` + volume (disposable) |
| Object storage | existing Cloudflare R2 bucket `75-medium-photos` | its own Railway Bucket |
| `SPRING_PROFILES_ACTIVE` | `prod` | `integ` |
| Seed / fake users | **never** (blocked two ways) | yes, when `SEED_ENABLED=true` |

The databases are **separate Postgres instances** — different host/credentials — so an
integ write is physically unreachable from prod (verified: a user registered on integ
returns 401 on prod).

## Golden rule

- **Push to `main`** → deploys **integ** only. This is your normal workflow.
- **`prod` never auto-updates from `main`.** It only changes when you deliberately
  merge to `production` (see Promote).

## Per-environment variables (Railway → environment → `75-medium-app` service → Variables)

Both environments need the database wired via Railway **reference variables** pointing at
*that environment's own* Postgres, plus storage + a unique signed-URL secret.

**integ** (`zonal-generosity` service):
```
PGHOST      = ${{Postgres-2PpH.PGHOST}}
PGPORT      = ${{Postgres-2PpH.PGPORT}}
PGUSER      = ${{Postgres-2PpH.PGUSER}}
PGPASSWORD  = ${{Postgres-2PpH.PGPASSWORD}}
PGDATABASE  = ${{Postgres-2PpH.PGDATABASE}}
SPRING_PROFILES_ACTIVE     = integ
STORAGE_SIGNED_URL_SECRET  = <unique to integ>
# object storage → the Railway Bucket (S3-compatible):
R2_ENDPOINT          = ${{Bucket.<endpoint var>}}
R2_ACCESS_KEY_ID     = ${{Bucket.<access-key var>}}
R2_SECRET_ACCESS_KEY = ${{Bucket.<secret var>}}
R2_BUCKET_NAME       = ${{Bucket.<bucket-name var>}}
# seeding (integ only):
SEED_ENABLED         = true
SEED_MAIN_USER_EMAIL = <your integ test account email>
```

**prod** — same `PG*` shape but referencing prod's own Postgres, `SPRING_PROFILES_ACTIVE=prod`,
its own `STORAGE_SIGNED_URL_SECRET`, the Cloudflare R2 `R2_*` values, and **no** `SEED_*`.

> The public domain's **target port must be `8080`** (the app listens on `server.port=${PORT:8080}`).
> A wrong target port shows as a 502 even though the service says "Online".

## Promote: ship a tested change from integ to prod

When a change is verified on integ and you're ready for real users:

```bash
git checkout production
git merge main          # plain merge (NOT --ff-only) so it tolerates prod hotfixes
git push origin production
```

Pushing `production` triggers a prod build + deploy. On startup, **Flyway applies any new
migrations to the prod database** (forward-only, additive — real data preserved).

### Hotfix directly on prod during a live challenge
```bash
git checkout production
# ... fix ...
git commit
git push origin production      # deploys prod immediately
git checkout main && git merge production   # fold the fix back so integ has it
```
Because we use a plain merge (not fast-forward-only), diverging `production` and `main`
histories reconcile cleanly.

## Seeding (fake users) — gated to integ

Fake/seed users are blocked from prod **two independent ways**:
1. `SeedRunner` is annotated `@Profile("!prod")` — the bean isn't even created when
   `SPRING_PROFILES_ACTIVE=prod`.
2. `guardAgainstProd()` hard-errors if the `prod` profile is active.

Seeding runs only when `SEED_ENABLED=true` **and** the profile isn't `prod` — i.e. local
or integ. Prod never sets `SEED_ENABLED`.

## Verify the isolation any time

```bash
INTEG=https://zonal-generosity-integ.up.railway.app
PROD=https://75-medium-app-production.up.railway.app
EMAIL="check-$RANDOM@integ.test"
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$INTEG/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"pw12345678\",\"displayName\":\"x\",\"timeZone\":\"UTC\"}"   # 201
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$PROD/api/auth/login" \
  -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"pw12345678\"}"           # 401 = isolated
```
