# Hexagonal Shop — Micronaut + Kotlin + Postgres

ตัวอย่างโปรเจกต์ **production-shaped** ที่สาธิต **Hexagonal Architecture (Ports & Adapters)**
ด้วย **Micronaut 4 + Kotlin** ต่อ **PostgreSQL** ผ่าน **Docker Compose** —
มาพร้อมแนวทาง **TDD**, **load test (k6)** และ checklist สำหรับ **pentest / production**

> เป็นตัวอย่างประกอบเอกสาร [hexagonal.html](../../hexagonal.html) — ระบบสมมุติคือ
> e‑commerce + สมาชิก ที่มี **ลูกค้า 1,000,000 คน** แต่ **สินค้าเพียง 1,000 รายการ / 100 หมวดหมู่**
> ความไม่สมดุลนี้คือเหตุผลที่ catalog ใช้ adapter แบบ cache ในหน่วยความจำได้ (ดูด้านล่าง)

---

## 1. ทำไมโครงสร้างเป็นแบบนี้ (Hexagonal)

```
src/main/kotlin/com/ktb/shop/
├─ domain/                     # ① แก่น — Kotlin ล้วน ไม่มี framework/DB
│  ├─ Customer.kt              #    entity + value object (CustomerId, Email)
│  ├─ Product.kt
│  ├─ DomainErrors.kt
│  └─ port/                    #    ports = interface ที่ core เป็นเจ้าของ
│     ├─ CustomerRepository.kt #      driven (core เรียกออก)
│     ├─ Notifier.kt           #      driven
│     └─ ProductCatalog.kt     #      driven
├─ application/                # ② use cases — orchestrate domain (ยัง Kotlin ล้วน)
│  ├─ RegisterCustomer.kt
│  └─ ListProductsByCategory.kt
└─ infra/                      # ③ adapters — โลกภายนอกทั้งหมดอยู่ที่นี่
   ├─ web/                     #    driving adapters (REST) + DTO + filters + error handlers
   ├─ persistence/            #    driven adapters (Micronaut Data JDBC)
   ├─ email/                   #    driven adapter (Notifier)
   └─ config/UseCaseFactory.kt #    composition root (@Factory ประกอบ use case)
```

**กฎเดียวที่ต้องจำ — Dependency Rule:** โค้ดใน `domain/` และ `application/`
**ห้าม `import` อะไรจาก `infra/`** เด็ดขาด (ลูกศรพึ่งพาชี้เข้าหา core เสมอ)

**One port, many adapters:** `ProductCatalog` มีสอง adapter —
[`DbProductCatalog`](src/main/kotlin/com/ktb/shop/infra/persistence/ProductPersistence.kt) (Postgres)
และ [`CachedProductCatalog`](src/main/kotlin/com/ktb/shop/infra/persistence/ProductPersistence.kt)
(`@Primary`, เก็บทั้ง catalog ในแรมเพราะมีแค่ ~1K รายการ) — core ไม่รู้และไม่เปลี่ยนเลย

---

## 2. เริ่มเร็วสุด (Docker Compose)

ต้องมี **Docker** อย่างเดียว (ไม่ต้องลง JDK/Gradle ในเครื่อง — build ในคอนเทนเนอร์)

```bash
cd ex/hexagonal
cp .env.example .env        # แก้รหัสผ่านก่อนใช้งานจริง
docker compose up --build   # ขึ้นทั้ง postgres + app, รัน Flyway migration ให้
```

ทดสอบ:

```bash
# สมัครสมาชิก
curl -i -X POST localhost:8080/api/customers \
  -H 'Content-Type: application/json' \
  -d '{"id":"c100","email":"bird@shop.com","name":"Bird"}'      # 201 Created

# สมัครซ้ำอีเมลเดิม -> 409 Conflict
# อีเมลผิดรูป -> 400 Bad Request

# ดูสินค้าตามหมวด (เสิร์ฟจาก cached adapter)
curl -s localhost:8080/api/products/category/c1

# health (ใช้โดย docker healthcheck)
curl -s localhost:8080/health
```

---

## 📖 API Docs (Swagger / OpenAPI)

สเปก OpenAPI 3 ถูก **generate ตอน build** โดย `micronaut-openapi` (KSP) จาก annotation บน
controller/DTO — ไม่ใช่ runtime reflection ดังนั้นไม่เพิ่มภาระตอนรัน. asset ของ UI ถูก
**bundle ลงในแอป** (ไม่พึ่ง CDN) จึงเปิดได้แม้ออฟไลน์.

| สิ่งที่ได้ | URL (Docker, port 8080) | URL (local dev, port 9000) |
|---|---|---|
| **Swagger UI** (ลองยิง API ได้) | `/swagger-ui/` | `/swagger-ui/` |
| **ReDoc** (อ่านสวย) | `/redoc/` | `/redoc/` |
| **RapiDoc** | `/rapidoc/` | `/rapidoc/` |
| **OpenAPI spec (YAML)** | `/swagger/hexagonal-shop-api-0.1.0.yml` | เหมือนกัน |

```bash
open http://localhost:8080/swagger-ui/          # หรือเปิดในเบราว์เซอร์
curl -s http://localhost:8080/swagger/hexagonal-shop-api-0.1.0.yml   # ดึง spec ดิบ
```

**เปิดให้ใช้งานได้จริงอย่างไร** (รายละเอียดเชิงสถาปัตยกรรม):

- `@OpenAPIDefinition` ที่ [Application.kt](src/main/kotlin/com/ktb/shop/Application.kt) ใส่ metadata ระดับ API (title/version/servers/tags)
- `@Operation` / `@ApiResponse` / `@Schema` บน controller + DTO อธิบายทุก endpoint และทุก field
- การ render UI สั่งผ่าน KSP arg ใน [build.gradle.kts](build.gradle.kts) (`micronaut.openapi.views.spec`)
- spec + UI เสิร์ฟผ่าน `micronaut.router.static-resources` ใน [application.yml](src/main/resources/application.yml)
- [Filters.kt](src/main/kotlin/com/ktb/shop/infra/web/Filters.kt) ผ่อน **CSP** เฉพาะ path เอกสาร (ของเดิม `default-src 'none'` จะบล็อก JS/CSS ของ UI) และยกเว้น path เอกสารจาก rate limiter

> ⚠️ **Production:** เอกสารเปิดสาธารณะ = เพิ่ม attack surface. ก่อนขึ้น prod ควร gate ไว้หลัง
> auth, จำกัดด้วย IP allowlist, หรือปิดด้วยการเอา `static-resources` ออก/แยก profile

---

## 3. รันแบบ local dev (มี JDK 21)

โปรเจกต์ใช้ Gradle wrapper — ถ้ายังไม่มี `gradlew` ให้ generate ครั้งเดียวด้วย Docker:

```bash
docker run --rm -v "$PWD":/app -w /app gradle:8.14-jdk21 gradle wrapper --gradle-version 8.14
```

จากนั้น:

```bash
./gradlew run            # รันแอป — ยก Postgres (docker compose) ให้อัตโนมัติ แล้วรอจน healthy
./gradlew build          # compile + test (integration ใช้ Docker)
```

`./gradlew run` มี task `composeUpDb` ที่สั่ง `docker compose up -d --wait db` ให้ก่อน จึงไม่ต้อง
ยก DB เอง และไม่เจอ Hikari fail-fast "connection refused" บนเครื่องที่ยังไม่มี DB (idempotent —
ข้ามถ้า db ขึ้นอยู่แล้ว). ต้องมี **Docker** รันอยู่

**Version matrix** (lock ไว้ใน `build.gradle.kts`): Kotlin **2.1.21** · KSP **2.1.21-2.0.2** ·
Micronaut application plugin **4.6.2** · Gradle **8.14** · JDK **21**
(เหตุที่ไม่ใช้ Kotlin 2.4.0 ล่าสุด เพราะยังไม่มี KSP รุ่นคู่ → จะ build ไม่ผ่าน)

---

## 4. การตั้งค่า (12‑factor — config จาก env)

| ENV | ค่า default | ใช้ทำอะไร |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/shop` | JDBC URL |
| `DB_USER` | `shop` | ชื่อผู้ใช้ DB |
| `DB_PASSWORD` | `shop` | รหัสผ่าน DB (เปลี่ยนใน prod!) |
| `JAVA_OPTS` | `-XX:MaxRAMPercentage=75` | JVM flags |

ความลับทั้งหมดมาจาก env ไม่มี hardcode ในโค้ด — ดู [.env.example](.env.example)

---

## 5. Test & TDD

แบ่งเป็นสองชั้นชัดเจน — นี่คือผลพลอยได้ของ Hexagonal:

- **Unit (เร็ว, ไม่ต่ออะไร)** — ทดสอบ use case ด้วย adapter ปลอมในหน่วยความจำ
  ([`RegisterCustomerTest`](src/test/kotlin/com/ktb/shop/application/RegisterCustomerTest.kt))
- **Integration (Testcontainers)** — adapter จริงต่อ Postgres จริง + ทดสอบผ่าน HTTP จริง
  ([`JdbcCustomerRepositoryIT`](src/test/kotlin/com/ktb/shop/infra/persistence/JdbcCustomerRepositoryIT.kt),
  [`CustomerApiIT`](src/test/kotlin/com/ktb/shop/infra/web/CustomerApiIT.kt))

```bash
./gradlew test                                   # ทั้งหมด (integration ต้องมี Docker daemon)
./gradlew test --tests '*RegisterCustomerTest'   # เฉพาะ unit (ไม่ต้องมี DB)
```

**วงจร TDD (red → green → refactor):** เขียนเทสที่ฟังก์ชันยังไม่มี (แดง) →
เขียนโค้ดให้ผ่านน้อยที่สุด (เขียว) → จัดระเบียบ. เริ่มที่ `domain`/`application` เสมอ
เพราะเทสได้โดยไม่ต้องมี DB/web — loop เร็วระดับมิลลิวินาที

---

## 6. Load test (k6)

ไม่ต้องลง k6 — รันผ่าน Docker (ให้แอปขึ้นด้วย `docker compose up` ก่อน):

```bash
docker run --rm -i --network host -e BASE_URL=http://localhost:8080 \
  grafana/k6 run - < loadtest/register.js
```

สคริปต์ ([loadtest/register.js](loadtest/register.js)) มีสองสถานการณ์: อ่าน catalog หนักๆ
(เสิร์ฟจาก cache) + สมัครสมาชิกแบบ constant rate พร้อม **thresholds**
(`http_req_failed < 1%`, catalog `p(95) < 200ms`)

---

## 7. Pentest / Security checklist

สิ่งที่โปรเจกต์ทำไว้แล้ว (อ้างอิง OWASP):

- ✅ **Injection** — query ทั้งหมดผ่าน Micronaut Data (parameterized) ไม่มีต่อสตริง SQL เอง
- ✅ **Input validation** — `jakarta.validation` (`@NotBlank`, `@Size`) + value object
  (`Email`, `CustomerId`) ตรวจตั้งแต่ขอบ → invalid = `400` ไม่ถึง DB
- ✅ **Security headers** — `X-Content-Type-Options`, `X-Frame-Options: DENY`, CSP,
  `Referrer-Policy`, HSTS ([Filters.kt](src/main/kotlin/com/ktb/shop/infra/web/Filters.kt))
- ✅ **Rate limiting** — filter ต่อ IP (ตัวอย่างระดับ instance; prod ใช้ gateway/Redis)
- ✅ **Error handling** — ไม่คืน stack trace; แปลงเป็นข้อความ generic ที่ปลอดภัย
  ([ApiExceptionHandlers.kt](src/main/kotlin/com/ktb/shop/infra/web/ApiExceptionHandlers.kt))
- ✅ **Secrets via env** — ไม่มีรหัสในโค้ด/รีโป (`.env` อยู่ใน `.gitignore`)
- ✅ **Attack surface เล็ก** — ปิด management endpoints เหลือแค่ `/health`; จำกัด body 512KB; CORS ปิด
- ✅ **Container hardening** — รันด้วย non‑root user, base image slim JRE, healthcheck

ก่อนขึ้น production เพิ่ม:

- 🔐 **AuthN/AuthZ** — `micronaut-security-jwt` (login + role guard) สำหรับ endpoint ที่ต้องป้องกัน
- 🔍 **Dependency / image scan** — `trivy fs .` หรือ OWASP dependency‑check ใน CI
- 🧱 **TLS** ที่ ingress/gateway, secrets ผ่าน vault/secret manager
- 📊 **Audit logging** + correlation id

---

## 8. Production concerns ที่ครอบไว้

- **Migrations** — Flyway (`src/main/resources/db/migration`) รันอัตโนมัติตอนบูต
- **Health** — `/health` (พร้อม DB status) ใช้กับ docker/k8s probe
- **Stateless + 12‑factor** — config จาก env, log ออก stdout
- **Connection pool** — HikariCP (`maximum-pool-size`)
- **Graceful build** — multi‑stage Dockerfile (build บน gradle image → run บน JRE)

---

## 9. โครงสร้างไฟล์ทั้งหมด

```
ex/hexagonal/
├─ build.gradle.kts · settings.gradle.kts · gradle.properties
├─ Dockerfile · docker-compose.yml · .env.example
├─ loadtest/register.js
├─ src/main/kotlin/com/ktb/shop/...        # domain / application / infra
├─ src/main/resources/
│  ├─ application.yml · logback.xml
│  └─ db/migration/V1__init.sql
└─ src/test/kotlin/com/ktb/shop/...        # unit + integration (Testcontainers)
```

อ่านลำดับแนะนำ (core‑first): `domain/` → `domain/port/` → `application/` →
`infra/` → `infra/config/UseCaseFactory.kt`
