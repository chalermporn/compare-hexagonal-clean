# ArchCompare — Slidev deck

สไลด์เปรียบเทียบ **Hexagonal vs Clean Architecture** (ภาษาไทย) แปลงมาจากหน้าเว็บ interactive ในโปรเจกต์นี้

## รัน

```bash
npm install      # ครั้งแรกครั้งเดียว
npm run dev      # เปิด http://localhost:3030
```

## Export

```bash
npm run build    # static site -> dist/
npm run export   # PDF -> slides-export.pdf (ต้องมี playwright-chromium)
```

## โครงสไลด์

**Opening** (สำหรับนำเสนอแชร์ทีม)
1. ปก — Hexagonal vs Clean
2. ปัญหาที่เราเจอบ่อย (hook)
3. Agenda / roadmap
4. TL;DR — จำ 3 อย่าง

**เนื้อหาหลัก**
5. แก่นที่เหมือนกัน + 3 เสาหลัก
6. Hexagonal (diagram)
7. Clean (diagram)
8. ตารางเทียบ
9. Dependency Rule — core ไม่เปลี่ยน + สลับ adapter 3 แบบ
10. Pattern เดียวกัน 5 ภาษา (TS / Kotlin / Go / Java / Rust)

**เอาไปใช้จริง**
11. โครงโปรเจกต์ (folder structure)
12. เคสจริง — โอนเงิน (Transfer)
13. กลยุทธ์การเทสต์ (test pyramid + contract test)

**กับดัก & Trade-offs**
14. Anti-patterns ที่พบบ่อย
15. เมื่อไหร่ไม่ควรใช้ / over-engineering
16. Migration — Strangler Fig

**Closing**
17. เช็กลิสต์ตัดสินใจ
18. ADR — ทีมเราจะใช้อะไร
19. สรุป + next step
20. Q&A / discussion
21. References & Glossary
22. ขอบคุณ

> แก้เนื้อหาได้ที่ `slides.md` — Markdown ล้วน, code ใช้ Shiki, diagram ใช้ Mermaid
> **speaker notes** อยู่ใน `<!-- ... -->` ท้ายสไลด์ — กด `P` เปิด presenter mode เพื่อดู
> theme/สี อยู่ใน `style.css` (global, light/dark)
