# Clean Shop — Go + Postgres

ตัวอย่างโปรเจกต์ **production-shaped** ที่สาธิต **Clean Architecture (4 ชั้น)**
ด้วย **Go (stdlib `net/http`) + pgx** ต่อ **PostgreSQL** ผ่าน **Docker Compose** —
มาพร้อมแนวทาง **TDD**, **load test (k6)** และ checklist สำหรับ **pentest / production**

> เป็นเวอร์ชัน **Go** ของ [ex/clean](../clean/) (Micronaut + Kotlin) และเป็นโปรเจกต์คู่ของ
> [ex/hexagonal-go](../hexagonal-go/) — โดเมนเดียวกัน (e‑commerce + สมาชิก
> ลูกค้า 1,000,000 คน แต่สินค้าเพียง 1,000 รายการ / 100 หมวดหมู่) แต่จัดโครงตาม
> **Clean Architecture** เพื่อให้เปรียบเทียบกันได้. **port ถูก offset**
> (docker 8091 / db 5433 / local 9001) จึงรันคู่กับ hexagonal-go พร้อมกันได้

---

## 1. ทำไมโครงสร้างเป็นแบบนี้ (Clean Architecture)

```
ex/clean-go/
├─ cmd/server/main.go            # ④ Frameworks & Drivers — composition root
└─ internal/
   ├─ entities/                  # ① Enterprise Business Rules — Go ล้วน ไม่มี framework/DB
   │  ├─ customer.go             #    entity + value object (CustomerID, Email)
   │  ├─ product.go
   │  └─ errors.go               #    ErrInvalid + EmailAlreadyUsedError
   ├─ usecases/                  # ② Application Business Rules
   │  ├─ port/                   #    output ports (gateways) ที่ use case เป็นเจ้าของ
   │  │  ├─ customer_gateway.go
   │  │  ├─ product_gateway.go
   │  │  └─ notifier.go
   │  ├─ register/
   │  │  ├─ register_customer.go #    input boundary (interface) + RegisterInput/Output
   │  │  └─ interactor.go        #    interactor (implement boundary)
   │  └─ products/
   │     ├─ list_products_by_category.go   # input boundary + ProductOutput
   │     └─ interactor.go
   └─ adapters/                  # ③ Interface Adapters
      ├─ web/                    #    controllers + DTO + middleware + OpenAPI/Swagger UI
      ├─ persistence/            #    gateway impl (pgx) + migrations
      └─ notification/           #    Notifier gateway
```

**กฎเดียวที่ต้องจำ — The Dependency Rule:** ลูกศรพึ่งพา **ชี้เข้าด้านในเสมอ**
(`cmd → adapters → usecases → entities`). โค้ดใน `entities/` และ `usecases/`
**ห้าม `import` อะไรจาก `adapters/` หรือ `cmd/`** เด็ดขาด

**จุดต่างจาก Hexagonal (ดู [ex/hexagonal-go](../hexagonal-go/)):**

| | Hexagonal | Clean Architecture (โปรเจกต์นี้) |
|---|---|---|
| โครง | hexagon เดียว + ports รอบนอก | 4 วงกลมซ้อน (entities → usecases → adapters → frameworks) |
| use case | struct เดียว (`RegisterCustomer`) | **input boundary** (interface) + **interactor** ที่ implement |
| ข้อมูลเข้า/ออก | `RegisterCommand` แล้วคืน entity ตรงๆ | **request/response model แยก** (`RegisterInput`/`RegisterOutput`) จาก web DTO |
| ชื่อ port ขาออก | `Repository` / `Catalog` (driven port) | `Gateway` (output port) |
| handler/controller พึ่ง | use case concrete (`*application.RegisterCustomer`) | **input boundary เท่านั้น** (`register.RegisterCustomer` interface) |

> ทั้งสองเคารพ Dependency Rule เหมือนกัน — Clean แค่ทำชั้นและ boundary ให้
> "เห็นชัดเป็นรูปธรรม" มากกว่า (Robert C. Martin เองบอกว่า Clean เป็น superset
> ที่รวม Hexagonal/Onion/DCI/BCE เข้าด้วยกัน)

**One port, many gateways:** `ProductGateway` มีสอง implementation —
[`DBProductGateway`](internal/adapters/persistence/product_gateway.go) (Postgres)
และ [`CachedProductGateway`](internal/adapters/persistence/product_cached.go)
(เก็บทั้ง catalog ในแรมเพราะมีแค่ ~1K รายการ, refresh ทุก 5 นาที) —
composition root เลือกตัว cached ให้ interactor; use case ไม่รู้และไม่เปลี่ยนเลย

**เทียบกับเวอร์ชัน Kotlin/Micronaut ([ex/clean](../clean/)):**

| แนวคิด | Micronaut + Kotlin | Go |
|---|---|---|
| Input boundary | `interface RegisterCustomer` + interactor class | interface + struct `Interactor` (+ `var _ RegisterCustomer = (*Interactor)(nil)` เช็คตอน compile) |
| Value object กันค่าผิด | `value class` + `init { require(...) }` | struct field unexported + constructor (`NewEmail`) |
| Domain error | `sealed class` + exception | sentinel `ErrInvalid` + typed error (`errors.Is/As`) |
| DI / composition root | `@Factory` + annotation (Beans.kt) | ประกอบมือใน `cmd/server/main.go` (ไม่มี magic) |
| เลือก gateway | `@Primary` | composition root ส่งตัว cached เข้า interactor ตรงๆ |
| Cache refresh | `@Scheduled(fixedDelay = "5m")` | goroutine + `time.Ticker` + `atomic.Pointer` |
| Migration | Flyway | embedded SQL runner เล็กๆ ([migrate.go](internal/adapters/persistence/migrate.go)) |
| OpenAPI | generate จาก annotation ตอน build | เขียนมือ ([openapi.yml](internal/adapters/web/openapi.yml)) embed ลง binary |
| Integration test | Testcontainers (JVM) | testcontainers-go |

---

## 2. เริ่มเร็วสุด (Docker Compose)

ต้องมี **Docker** อย่างเดียว (ไม่ต้องลง Go ในเครื่อง — build ในคอนเทนเนอร์)

```bash
cd ex/clean-go
cp .env.example .env        # แก้รหัสผ่านก่อนใช้งานจริง
docker compose up --build   # ขึ้นทั้ง postgres + app, รัน migration ให้
```

ทดสอบ (พอร์ต **8091** — hexagonal-go ใช้ 8090):

```bash
# สมัครสมาชิก
curl -i -X POST localhost:8091/api/customers \
  -H 'Content-Type: application/json' \
  -d '{"id":"c100","email":"bird@shop.com","name":"Bird"}'      # 201 Created

# สมัครซ้ำอีเมลเดิม -> 409 Conflict
# อีเมลผิดรูป -> 400 Bad Request

# ดูสินค้าตามหมวด (เสิร์ฟจาก cached gateway)
curl -s localhost:8091/api/products/category/c1

# health (ใช้โดย docker healthcheck)
curl -s localhost:8091/health
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
open http://localhost:8091/swagger-ui/
curl -s http://localhost:8091/swagger/openapi.yml
```

> [middleware.go](internal/adapters/web/middleware.go) ผ่อน CSP เฉพาะ path เอกสาร
> และยกเว้น path เอกสารจาก rate limiter เหมือนต้นฉบับ.
> ⚠️ **Production:** เอกสารเปิดสาธารณะ = เพิ่ม attack surface — gate หลัง auth หรือปิด

---

## 3. รันแบบ local dev (มี Go 1.26+)

```bash
docker compose up -d --wait db    # ยกแค่ Postgres (host port 5433)
go run ./cmd/server               # ฟังที่ :9001 (PORT override ได้), รัน migration เอง
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
| `DB_URL` | `postgres://shop:shop@localhost:5433/shop?sslmode=disable` | Postgres URL |
| `PORT` | `9001` (Dockerfile ตั้งเป็น `8091`) | พอร์ต HTTP |

ความลับทั้งหมดมาจาก env ไม่มี hardcode ในโค้ด — ดู [.env.example](.env.example)

---

## 5. Test & TDD

แบ่งเป็นสองชั้นชัดเจน — boundary ของ Clean ทำให้แยกได้เด็ดขาด:

- **Unit (เร็ว, ไม่ต่ออะไร)** — ทดสอบ interactor ผ่าน input boundary ด้วย gateway
  ปลอมในหน่วยความจำ ([interactor_test.go](internal/usecases/register/interactor_test.go))
  — assert ที่ `RegisterOutput` (use-case model) ไม่ใช่ entity
- **Integration (testcontainers-go)** — gateway จริงต่อ Postgres จริง + ทดสอบผ่าน HTTP จริง
  ([customer_gateway_test.go](internal/adapters/persistence/customer_gateway_test.go),
  [api_integration_test.go](internal/adapters/web/api_integration_test.go))

```bash
go test ./...          # ทั้งหมด (integration ต้องมี Docker daemon)
go test -short ./...   # เฉพาะ unit (ไม่ต้องมี DB — มิลลิวินาที)
```

**วงจร TDD (red → green → refactor):** เขียนเทสที่ฟังก์ชันยังไม่มี (แดง) →
เขียนโค้ดให้ผ่านน้อยที่สุด (เขียว) → จัดระเบียบ. เริ่มที่ `entities`/`usecases` เสมอ
เพราะเทสได้โดยไม่ต้องมี DB/web — loop เร็วระดับมิลลิวินาที

---

## 6. Load test (k6)

ไม่ต้องลง k6 — รันผ่าน Docker (ให้แอปขึ้นด้วย `docker compose up` ก่อน):

```bash
docker run --rm -i --network host -e BASE_URL=http://localhost:8091 \
  grafana/k6 run - < loadtest/register.js
```

สคริปต์ ([loadtest/register.js](loadtest/register.js)) เหมือนเวอร์ชัน hexagonal-go
ทุกบรรทัด (API surface เดียวกัน): อ่าน catalog หนักๆ (เสิร์ฟจาก cache) + สมัครสมาชิกแบบ
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
  `Referrer-Policy`, HSTS ([middleware.go](internal/adapters/web/middleware.go))
- ✅ **Rate limiting** — fixed window ต่อ IP (ตัวอย่างระดับ instance; prod ใช้ gateway/Redis)
- ✅ **Error handling** — ไม่คืน stack trace; แปลงเป็นข้อความ generic ที่ปลอดภัย
  ([respond.go](internal/adapters/web/respond.go))
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
ex/clean-go/
├─ go.mod · go.sum
├─ Dockerfile · docker-compose.yml · .env.example
├─ loadtest/register.js
├─ cmd/server/main.go                  # ④ frameworks — composition root
└─ internal/
   ├─ entities/                        # ① enterprise business rules
   ├─ usecases/ · usecases/port/       # ② input boundaries + interactors + output ports (+ unit tests)
   ├─ adapters/web/ · adapters/persistence/ · adapters/notification/   # ③ interface adapters (+ integration tests)
   └─ testsupport/                     # Postgres testcontainer helper
```

อ่านลำดับแนะนำ (core‑first): `internal/entities/` → `internal/usecases/port/` →
`internal/usecases/` → `internal/adapters/` → `cmd/server/main.go`
