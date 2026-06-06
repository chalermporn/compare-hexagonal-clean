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

1. ปก — Hexagonal vs Clean
2. แก่นที่เหมือนกัน + 3 เสาหลัก
3. Hexagonal (diagram)
4. Clean (diagram)
5. ตารางเทียบ
6. Dependency Rule — core ไม่เปลี่ยน + สลับ adapter 3 แบบ
7. Pattern เดียวกัน 5 ภาษา (TS / Kotlin / Go / Java / Rust)
8. ตัวช่วยตัดสินใจ + สรุป

> แก้เนื้อหาได้ที่ `slides.md` — เป็น Markdown ล้วน, code block ใช้ Shiki, diagram ใช้ Mermaid
