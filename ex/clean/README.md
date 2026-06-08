# Clean Shop — Micronaut + Kotlin + Postgres

ตัวอย่างโปรเจกต์ **production-shaped** ที่สาธิต **Clean Architecture (4 ชั้น)**
ด้วย **Micronaut 4 + Kotlin** ต่อ **PostgreSQL** ผ่าน **Docker Compose** —
มาพร้อมแนวทาง **TDD**, **load test (k6)**, **OpenAPI/Swagger** และ checklist สำหรับ **pentest / production**

> เป็นโปรเจกต์คู่ของ [ex/hexagonal](../hexagonal/) — โดเมนเดียวกัน (e‑commerce + สมาชิก
> ลูกค้า 1,000,000 คน แต่สินค้าเพียง 1,000 รายการ / 100 หมวดหมู่) แต่จัดโครงตาม **Clean
> Architecture** เพื่อให้เปรียบเทียบกันได้. **port ถูก offset** (docker 8081 / db 5433 /
> local 9001) จึงรันคู่กับ hexagonal พร้อมกันได้

---

## 1. ทำไมโครงสร้างเป็นแบบนี้ (Clean Architecture)

```
src/main/kotlin/com/ktb/shop/
├─ entities/                    # ① Enterprise Business Rules — Kotlin ล้วน ไม่มี framework/DB
│  ├─ Customer.kt              #    entity + value object (CustomerId, Email)
│  ├─ Product.kt
│  └─ DomainErrors.kt
├─ usecases/                    # ② Application Business Rules
│  ├─ port/                    #    output ports (gateways) ที่ use case เป็นเจ้าของ
│  │  ├─ CustomerGateway.kt
│  │  ├─ ProductGateway.kt
│  │  └─ Notifier.kt
│  ├─ register/
│  │  ├─ RegisterCustomer.kt            #    input boundary (interface)
│  │  ├─ RegisterCustomerInteractor.kt  #    interactor (implement boundary)
│  │  └─ RegisterModels.kt              #    RegisterInput / RegisterOutput (ข้าม boundary)
│  └─ products/
│     ├─ ListProductsByCategory.kt
│     ├─ ListProductsByCategoryInteractor.kt
│     └─ ProductModels.kt               #    ProductOutput
├─ adapters/                    # ③ Interface Adapters
│  ├─ web/                     #    controllers + DTO + presenters mapping + filters + error handlers
│  ├─ persistence/            #    gateway impl (Micronaut Data JDBC)
│  └─ notification/            #    Notifier gateway
└─ frameworks/                  # ④ Frameworks & Drivers — โลกภายนอกทั้งหมด
   ├─ Application.kt           #    main + @OpenAPIDefinition
   └─ config/Beans.kt          #    composition root (@Factory ประกอบ interactor)
```

**กฎเดียวที่ต้องจำ — The Dependency Rule:** ลูกศรพึ่งพา **ชี้เข้าด้านในเสมอ**
(`frameworks → adapters → usecases → entities`). โค้ดใน `entities/` และ `usecases/`
**ห้าม `import` อะไรจาก `adapters/` หรือ `frameworks/`** เด็ดขาด

**จุดต่างจาก Hexagonal (ดู [ex/hexagonal](../hexagonal/)):**

| | Hexagonal | Clean Architecture (โปรเจกต์นี้) |
|---|---|---|
| โครง | hexagon เดียว + ports รอบนอก | 4 วงกลมซ้อน (entities → usecases → adapters → frameworks) |
| use case | class เดียว (`RegisterCustomer`) | **input boundary** (interface) + **interactor** ที่ implement |
| ข้อมูลเข้า/ออก | `RegisterCommand` แล้วคืน entity ตรงๆ | **request/response model แยก** (`RegisterInput`/`RegisterOutput`) จาก web DTO |
| ชื่อ port ขาออก | `Repository` / `Catalog` (driven port) | `Gateway` (output port) |
| controller พึ่ง | use case concrete | **input boundary เท่านั้น** |

> ทั้งสองเคารพ Dependency Rule เหมือนกัน — Clean แค่ทำชั้นและ boundary ให้ "เห็นชัดเป็นรูปธรรม" มากกว่า
> (Robert C. Martin เองบอกว่า Clean เป็น superset ที่รวม Hexagonal/Onion/DCI/BCE เข้าด้วยกัน)

---

## 2. เริ่มเร็วสุด (Docker Compose)

ต้องมี **Docker** อย่างเดียว (build ในคอนเทนเนอร์ ไม่ต้องลง JDK/Gradle)

```bash
cd ex/clean
cp .env.example .env        # แก้รหัสผ่านก่อนใช้งานจริง
docker compose up --build   # ขึ้นทั้ง postgres + app, รัน Flyway migration ให้
```

ทดสอบ (พอร์ต **8081** — hexagonal ใช้ 8080):

```bash
# สมัครสมาชิก
curl -i -X POST localhost:8081/api/customers \
  -H 'Content-Type: application/json' \
  -d '{"id":"c100","email":"bird@shop.com","name":"Bird"}'      # 201 Created

# สมัครซ้ำอีเมลเดิม -> 409 Conflict ; อีเมลผิดรูป -> 400 Bad Request

# ดูสินค้าตามหมวด (เสิร์ฟจาก cached gateway)
curl -s localhost:8081/api/products/category/c1

# health (ใช้โดย docker healthcheck)
curl -s localhost:8081/health
```

---

## 📖 API Docs (Swagger / OpenAPI)

สเปก OpenAPI 3 ถูก **generate ตอน build** โดย `micronaut-openapi` (KSP) จาก annotation บน
controller/DTO — ไม่ใช่ runtime reflection. asset ของ UI ถูก **bundle ลงในแอป** (ไม่พึ่ง CDN)
จึงเปิดได้แม้ออฟไลน์.

| สิ่งที่ได้ | URL (Docker, 8081) | URL (local dev, 9001) |
|---|---|---|
| **Swagger UI** (ลองยิง API ได้) | `/swagger-ui/` | `/swagger-ui/` |
| **ReDoc** (อ่านสวย) | `/redoc/` | `/redoc/` |
| **RapiDoc** | `/rapidoc/` | `/rapidoc/` |
| **OpenAPI spec (YAML)** | `/swagger/clean-shop-api-0.1.0.yml` | เหมือนกัน |

```bash
open http://localhost:8081/swagger-ui/
curl -s http://localhost:8081/swagger/clean-shop-api-0.1.0.yml   # ดึง spec ดิบ
```

**เปิดให้ใช้งานได้จริงอย่างไร** (สถาปัตยกรรม):

- `@OpenAPIDefinition` ที่ [Application.kt](src/main/kotlin/com/ktb/shop/frameworks/Application.kt) ใส่ metadata ระดับ API
- `@Operation` / `@ApiResponse` / `@Schema` บน controller + web DTO อธิบายทุก endpoint และทุก field
- การ render UI สั่งผ่าน KSP arg ใน [build.gradle.kts](build.gradle.kts) (`micronaut.openapi.views.spec`)
- spec + UI เสิร์ฟผ่าน `micronaut.router.static-resources` ใน [application.yml](src/main/resources/application.yml)
- [Filters.kt](src/main/kotlin/com/ktb/shop/adapters/web/Filters.kt) ผ่อน **CSP** เฉพาะ path เอกสาร (ของเดิม `default-src 'none'` จะบล็อก JS/CSS) และยกเว้น path เอกสารจาก rate limiter

> ⚠️ **Production:** เอกสารเปิดสาธารณะ = เพิ่ม attack surface. ก่อนขึ้น prod ควร gate หลัง
> auth, จำกัดด้วย IP allowlist, หรือปิดด้วยการเอา `static-resources` ออก/แยก profile

---

## 3. รันแบบ local dev (มี JDK 21)

```bash
./gradlew run                # รันแอปที่พอร์ต 9001 — ยก Postgres (docker compose) ให้อัตโนมัติ
./gradlew build              # compile + test (integration ใช้ Docker)
```

`./gradlew run` มี task `composeUpDb` ที่สั่ง `docker compose up -d --wait db` ให้ก่อน แล้วรอจน
DB healthy — จึงไม่ต้อง `docker compose up -d db` เอง และไม่เจอ Hikari fail-fast "connection refused"
บนเครื่องที่ยังไม่ได้ยก DB (idempotent — ถ้า db ขึ้นอยู่แล้วจะข้าม). ต้องมี **Docker** รันอยู่

**Version matrix** (lock ใน `build.gradle.kts`): Kotlin **2.1.21** · KSP **2.1.21-2.0.2** ·
Micronaut application plugin **4.6.2** · Gradle **8.14** · JDK **21**

---

## 4. การตั้งค่า (12‑factor — config จาก env)

| ENV | ค่า default | ใช้ทำอะไร |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5433/shop` | JDBC URL |
| `DB_USER` | `shop` | ชื่อผู้ใช้ DB |
| `DB_PASSWORD` | `shop` | รหัสผ่าน DB (เปลี่ยนใน prod!) |
| `JAVA_OPTS` | `-XX:MaxRAMPercentage=75` | JVM flags |

ความลับทั้งหมดมาจาก env ไม่มี hardcode ในโค้ด — ดู [.env.example](.env.example)

---

## 5. Test & TDD

แบ่งเป็นสองชั้นชัดเจน — นี่คือผลพลอยได้ของ Clean Architecture:

- **Unit (เร็ว, ไม่ต่ออะไร)** — ทดสอบ interactor ด้วย gateway ปลอมในหน่วยความจำ
  ([`RegisterCustomerInteractorTest`](src/test/kotlin/com/ktb/shop/usecases/register/RegisterCustomerInteractorTest.kt))
- **Integration (Testcontainers)** — gateway จริงต่อ Postgres จริง + ทดสอบผ่าน HTTP จริง
  ([`JdbcCustomerGatewayIT`](src/test/kotlin/com/ktb/shop/adapters/persistence/JdbcCustomerGatewayIT.kt),
  [`CustomerApiIT`](src/test/kotlin/com/ktb/shop/adapters/web/CustomerApiIT.kt) — รวมเทสว่า spec OpenAPI เสิร์ฟได้)

```bash
./gradlew test                                              # ทั้งหมด (integration ต้องมี Docker daemon)
./gradlew test --tests '*RegisterCustomerInteractorTest'   # เฉพาะ unit (ไม่ต้องมี DB)
```

---

## 6. Load test (k6)

```bash
docker run --rm -i --network host -e BASE_URL=http://localhost:8081 \
  grafana/k6 run - < loadtest/register.js
```

สคริปต์ ([loadtest/register.js](loadtest/register.js)): อ่าน catalog หนักๆ (จาก cache) +
สมัครสมาชิกแบบ constant rate พร้อม **thresholds** (`http_req_failed < 1%`, catalog `p(95) < 200ms`)

---

## 7. Pentest / Security checklist

เหมือน [ex/hexagonal](../hexagonal/#7-pentest--security-checklist): parameterized query (Micronaut Data),
input validation (`jakarta.validation` + value object), security headers, rate limiting, error handling
ไม่คืน stack trace, secrets ผ่าน env, attack surface เล็ก (`/health` อย่างเดียว, body 512KB, CORS ปิด),
container รัน non‑root.

**เพิ่มเติมในโปรเจกต์นี้:** doc UIs (Swagger/ReDoc/RapiDoc) ได้ **CSP ที่ผ่อนเฉพาะ path เอกสาร**
ส่วน `/api/**` ยังคง `default-src 'none'` — ก่อนขึ้น prod ควร gate เอกสารไว้หลัง auth (ดูหัวข้อ API Docs)

---

## 8. โครงสร้างไฟล์ทั้งหมด

```
ex/clean/
├─ build.gradle.kts · settings.gradle.kts · gradle.properties
├─ Dockerfile · docker-compose.yml · .env.example
├─ loadtest/register.js
├─ src/main/kotlin/com/ktb/shop/...        # entities / usecases / adapters / frameworks
├─ src/main/resources/
│  ├─ application.yml · logback.xml
│  └─ db/migration/V1__init.sql
└─ src/test/kotlin/com/ktb/shop/...        # unit + integration (Testcontainers)
```

อ่านลำดับแนะนำ (core‑first): `entities/` → `usecases/port/` → `usecases/**/Interactor` →
`adapters/` → `frameworks/config/Beans.kt`
