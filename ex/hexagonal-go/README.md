# Hexagonal Shop — Go + Postgres

ตัวอย่างโปรเจกต์ **production-shaped** ที่สาธิต **Hexagonal Architecture (Ports & Adapters)**
ด้วย **Go (stdlib `net/http`) + pgx** ต่อ **PostgreSQL** ผ่าน **Docker Compose** —
มาพร้อมแนวทาง **TDD**, **load test (k6)** และ checklist สำหรับ **pentest / production**

> เป็นเวอร์ชัน **Go** ของ [ex/hexagonal](../hexagonal/) (Micronaut + Kotlin) —
> สถาปัตยกรรม, endpoint, schema, กติกาทุกข้อ เหมือนกันทั้งหมด ต่างเฉพาะภาษา/เครื่องมือ.
> ระบบสมมุติคือ e‑commerce + สมาชิก ที่มี **ลูกค้า 1,000,000 คน** แต่
> **สินค้าเพียง 1,000 รายการ / 100 หมวดหมู่** — ความไม่สมดุลนี้คือเหตุผลที่
> catalog ใช้ adapter แบบ cache ในหน่วยความจำได้

---

## 1. ทำไมโครงสร้างเป็นแบบนี้ (Hexagonal)

```
ex/hexagonal-go/
├─ cmd/server/main.go            # composition root — ที่เดียวที่ประกอบ adapter เข้า use case
└─ internal/
   ├─ domain/                    # ① แก่น — Go ล้วน ไม่มี framework/DB
   │  ├─ customer.go             #    entity + value object (CustomerID, Email)
   │  ├─ product.go
   │  ├─ errors.go               #    ErrInvalid + EmailAlreadyUsedError
   │  └─ port/                   #    ports = interface ที่ core เป็นเจ้าของ
   │     ├─ customer_repository.go  #   driven (core เรียกออก)
   │     ├─ notifier.go             #   driven
   │     └─ product_catalog.go      #   driven
   ├─ application/               # ② use cases — orchestrate domain (ยัง Go ล้วน)
   │  ├─ register_customer.go
   │  └─ list_products_by_category.go
   └─ infra/                     # ③ adapters — โลกภายนอกทั้งหมดอยู่ที่นี่
      ├─ web/                    #    driving adapters (REST) + DTO + middleware
      ├─ persistence/            #    driven adapters (pgx) + migrations
      └─ email/                  #    driven adapter (Notifier)
```

**กฎเดียวที่ต้องจำ — Dependency Rule:** โค้ดใน `domain/` และ `application/`
**ห้าม `import` อะไรจาก `infra/`** เด็ดขาด (ลูกศรพึ่งพาชี้เข้าหา core เสมอ)

**One port, many adapters:** `ProductCatalog` มีสอง adapter —
[`DBProductCatalog`](internal/infra/persistence/product_postgres.go) (Postgres)
และ [`CachedProductCatalog`](internal/infra/persistence/product_cached.go)
(เก็บทั้ง catalog ในแรมเพราะมีแค่ ~1K รายการ, refresh ทุก 5 นาที) —
composition root เลือกตัว cached ให้ use case; core ไม่รู้และไม่เปลี่ยนเลย

**เทียบกับเวอร์ชัน Kotlin/Micronaut:**

| แนวคิด | Micronaut + Kotlin | Go |
|---|---|---|
| Value object กันค่าผิด | `value class` + `init { require(...) }` | struct field unexported + constructor (`NewEmail`) |
| Domain error | `sealed class` + exception | sentinel `ErrInvalid` + typed error (`errors.Is/As`) |
| DI / composition root | `@Factory` + annotation | ประกอบมือใน `cmd/server/main.go` (ไม่มี magic) |
| เลือก adapter | `@Primary` | composition root ส่งตัว cached เข้า use case ตรงๆ |
| Cache refresh | `@Scheduled(fixedDelay = "5m")` | goroutine + `time.Ticker` + `atomic.Pointer` |
| Migration | Flyway | embedded SQL runner เล็กๆ ([migrate.go](internal/infra/persistence/migrate.go)) |
| OpenAPI | generate จาก annotation ตอน build | เขียนมือ ([openapi.yml](internal/infra/web/openapi.yml)) embed ลง binary |
| Integration test | Testcontainers (JVM) | testcontainers-go |

---

## 2. เริ่มเร็วสุด (Docker Compose)

ต้องมี **Docker** อย่างเดียว (ไม่ต้องลง Go ในเครื่อง — build ในคอนเทนเนอร์)

```bash
cd ex/hexagonal-go
cp .env.example .env        # แก้รหัสผ่านก่อนใช้งานจริง
docker compose up --build   # ขึ้นทั้ง postgres + app, รัน migration ให้
```

ทดสอบ:

```bash
# สมัครสมาชิก
curl -i -X POST localhost:8090/api/customers \
  -H 'Content-Type: application/json' \
  -d '{"id":"c100","email":"bird@shop.com","name":"Bird"}'      # 201 Created

# สมัครซ้ำอีเมลเดิม -> 409 Conflict
# อีเมลผิดรูป -> 400 Bad Request

# ดูสินค้าตามหมวด (เสิร์ฟจาก cached adapter)
curl -s localhost:8090/api/products/category/c1

# health (ใช้โดย docker healthcheck)
curl -s localhost:8090/health
```

---

## 📖 API Docs (OpenAPI)

สเปก OpenAPI 3 **เขียนมือ** (Go ไม่มี annotation processor แบบ micronaut-openapi)
และถูก **embed ลงใน binary** (`go:embed`) เช่นเดียวกับ asset ของ Swagger UI
(vendor จาก `swagger-ui-dist` 5.32.6) — ไม่พึ่ง CDN เปิดได้แม้ออฟไลน์:

| สิ่งที่ได้ | URL |
|---|---|
| **Swagger UI** (ลองยิง API ได้) | `/swagger-ui/` |
| **หน้า docs ย่อ** (HTML ล้วน ไม่มี asset ภายนอก) | `/docs` |
| **OpenAPI spec (YAML)** | `/swagger/openapi.yml` |

```bash
open http://localhost:8090/swagger-ui/
curl -s http://localhost:8090/swagger/openapi.yml
```

> ต่างจากเวอร์ชัน Kotlin ที่ generate spec จาก annotation ตอน build และ bundle
> ReDoc / RapiDoc เพิ่ม — เวอร์ชัน Go เขียน spec มือและ vendor เฉพาะ Swagger UI.
> [middleware.go](internal/infra/web/middleware.go) ผ่อน CSP เฉพาะ path เอกสาร
> และยกเว้น path เอกสารจาก rate limiter เหมือนต้นฉบับ.
> ⚠️ **Production:** เอกสารเปิดสาธารณะ = เพิ่ม attack surface — gate หลัง auth หรือปิด

---

## 3. รันแบบ local dev (มี Go 1.26+)

```bash
docker compose up -d --wait db    # ยกแค่ Postgres
go run ./cmd/server               # ฟังที่ :9000 (PORT override ได้), รัน migration เอง
```

```bash
go build ./...   # compile
go vet ./...     # static checks
```

**Version matrix:** Go **1.26** · pgx **v5** · testcontainers-go **v0.42** ·
Postgres **16** (`postgres:16-alpine`)

---

## 4. การตั้งค่า (12‑factor — config จาก env)

| ENV | ค่า default | ใช้ทำอะไร |
|---|---|---|
| `DB_URL` | `postgres://shop:shop@localhost:5432/shop?sslmode=disable` | Postgres URL |
| `PORT` | `9000` (Dockerfile ตั้งเป็น `8090`) | พอร์ต HTTP |

ความลับทั้งหมดมาจาก env ไม่มี hardcode ในโค้ด — ดู [.env.example](.env.example)

---

## 5. Test & TDD

แบ่งเป็นสองชั้นชัดเจน — นี่คือผลพลอยได้ของ Hexagonal:

- **Unit (เร็ว, ไม่ต่ออะไร)** — ทดสอบ use case ด้วย adapter ปลอมในหน่วยความจำ
  ([register_customer_test.go](internal/application/register_customer_test.go))
- **Integration (testcontainers-go)** — adapter จริงต่อ Postgres จริง + ทดสอบผ่าน HTTP จริง
  ([customer_postgres_test.go](internal/infra/persistence/customer_postgres_test.go),
  [api_integration_test.go](internal/infra/web/api_integration_test.go))

```bash
go test ./...          # ทั้งหมด (integration ต้องมี Docker daemon)
go test -short ./...   # เฉพาะ unit (ไม่ต้องมี DB — มิลลิวินาที)
```

**วงจร TDD (red → green → refactor):** เขียนเทสที่ฟังก์ชันยังไม่มี (แดง) →
เขียนโค้ดให้ผ่านน้อยที่สุด (เขียว) → จัดระเบียบ. เริ่มที่ `domain`/`application` เสมอ
เพราะเทสได้โดยไม่ต้องมี DB/web — loop เร็วระดับมิลลิวินาที

---

## 6. Load test (k6)

ไม่ต้องลง k6 — รันผ่าน Docker (ให้แอปขึ้นด้วย `docker compose up` ก่อน):

```bash
docker run --rm -i --network host -e BASE_URL=http://localhost:8090 \
  grafana/k6 run - < loadtest/register.js
```

สคริปต์ ([loadtest/register.js](loadtest/register.js)) เหมือนเวอร์ชัน Kotlin ทุกบรรทัด
(API surface เดียวกัน): อ่าน catalog หนักๆ (เสิร์ฟจาก cache) + สมัครสมาชิกแบบ
constant rate พร้อม **thresholds** (`http_req_failed < 1%`, catalog `p(95) < 200ms`)

---

## 7. Pentest / Security checklist

สิ่งที่โปรเจกต์ทำไว้แล้ว (อ้างอิง OWASP):

- ✅ **Injection** — query ทั้งหมด parameterized ผ่าน pgx ไม่มีต่อสตริง SQL เอง
- ✅ **Input validation** — DTO validate (required + max length) + value object
  (`Email`, `CustomerID`) ตรวจตั้งแต่ขอบ → invalid = `400` ไม่ถึง DB
- ✅ **Race-safe duplicate check** — UNIQUE constraint ปิดช่อง check-then-insert race
  (23505 → 409 ไม่ใช่ 500)
- ✅ **Security headers** — `X-Content-Type-Options`, `X-Frame-Options: DENY`, CSP,
  `Referrer-Policy`, HSTS ([middleware.go](internal/infra/web/middleware.go))
- ✅ **Rate limiting** — fixed window ต่อ IP (ตัวอย่างระดับ instance; prod ใช้ gateway/Redis)
- ✅ **Error handling** — ไม่คืน stack trace; แปลงเป็นข้อความ generic ที่ปลอดภัย
  ([respond.go](internal/infra/web/respond.go))
- ✅ **Secrets via env** — ไม่มีรหัสในโค้ด/รีโป (`.env` อยู่ใน `.gitignore`)
- ✅ **Attack surface เล็ก** — endpoint แค่ 4 ตัว; จำกัด body 512KB; timeout ครบ
  (`ReadHeaderTimeout` กัน slowloris)
- ✅ **Container hardening** — รันด้วย non‑root user, static binary บน alpine, healthcheck

ก่อนขึ้น production เพิ่ม:

- 🔐 **AuthN/AuthZ** — JWT middleware (เช่น `golang-jwt`) สำหรับ endpoint ที่ต้องป้องกัน
- 🔍 **Dependency / image scan** — `govulncheck ./...` + `trivy fs .` ใน CI
- 🧱 **TLS** ที่ ingress/gateway, secrets ผ่าน vault/secret manager
- 📊 **Audit logging** + correlation id

---

## 8. Production concerns ที่ครอบไว้

- **Migrations** — embedded SQL runner รันอัตโนมัติตอนบูต (idempotent, tracked ใน `schema_migrations`)
- **Health** — `/health` (ping DB จริง) ใช้กับ docker/k8s probe
- **Stateless + 12‑factor** — config จาก env, structured log (slog JSON) ออก stdout
- **Connection pool** — pgxpool
- **Graceful shutdown** — ดัก SIGINT/SIGTERM แล้ว drain ภายใน 10s
- **Graceful build** — multi‑stage Dockerfile (build บน golang image → run บน alpine, static binary ~10MB)

---

## 9. โครงสร้างไฟล์ทั้งหมด

```
ex/hexagonal-go/
├─ go.mod · go.sum
├─ Dockerfile · docker-compose.yml · .env.example
├─ loadtest/register.js
├─ cmd/server/main.go                  # composition root
└─ internal/
   ├─ domain/ · domain/port/           # ① core
   ├─ application/                     # ② use cases (+ unit tests)
   ├─ infra/web/ · infra/persistence/ · infra/email/   # ③ adapters (+ integration tests)
   └─ testsupport/                     # Postgres testcontainer helper
```

อ่านลำดับแนะนำ (core‑first): `internal/domain/` → `internal/domain/port/` →
`internal/application/` → `internal/infra/` → `cmd/server/main.go`
