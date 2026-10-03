# 🐷 หมูกรอบ มี จำกัด — ระบบบริหารร้านหมูกรอบครบวงจร

ระบบสำหรับร้านหมูกรอบ ตั้งแต่ **คิดสูตร → ทดลองทำและให้คะแนนรสชาติ → งบประมาณ/วัตถุดิบ → ต้นทุน → ผลิต → ขาย**

| ส่วน | เทคโนโลยี |
|---|---|
| Backend | Go 1.27 · chi · pgx/sqlc · golang-migrate · JWT · WebSocket · Clean Architecture |
| Frontend | React 19 · Vite · TypeScript · TanStack Query · Tailwind/shadcn · i18next (ไทย/อังกฤษ) · Recharts |
| Data | PostgreSQL 17 · Redis 7 (Pub/Sub, rate limit, WS ticket) · MinIO (รูปภาพ/ไฟล์) |

## สถานะ Phase
- [x] **Phase 1 Foundation** — Auth/RBAC, Master data, MinIO, WebSocket notification, i18n
- [x] **Phase 2 R&D** — สูตร (versioning, ขั้นตอน, ทอดหลายรอบ), ผลทดสอบ (คะแนน 1–5, รูป, เปรียบเทียบ)
- [ ] Phase 3 วัตถุดิบ/จัดซื้อ/สต็อก/งบประมาณ/ต้นทุน
- [ ] Phase 4 สินค้า/ผลิต/POS (เงินสด + PromptPay QR)
- [ ] Phase 5 Dashboard/Reports

## เริ่มต้นใช้งาน (macOS + VS Code)

**สิ่งที่ต้องมี:** Docker Desktop, Go 1.27+, Node 22+, make

```bash
make setup        # คัดลอก .env ทั้ง 3 ชุด + ติดตั้ง dependencies
# ⚠️ แก้รหัสผ่าน/secret ใน deploy/.env และ backend/.env ให้ตรงกัน
make infra-up     # Postgres, Redis, MinIO
make migrate      # สร้างตาราง + master data เริ่มต้น
make be-dev       # API  → http://localhost:8080  (หรือ make be-run)
make fe-dev       # Web  → http://localhost:5173
```

- MinIO Console: http://localhost:9001
- ล็อกอินครั้งแรกด้วย `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` ใน `backend/.env`
- VS Code: ติดตั้ง extensions ที่แนะนำ → Run and Debug → **"Full stack"**

รันทุกอย่างใน container: `make up-all` (เว็บที่ http://localhost:8081)

## โครงสร้าง

```
├── backend/          Go API (Clean Architecture)  → ดู backend/README.md
├── frontend/         React SPA (feature-sliced)    → ดู frontend/README.md
├── deploy/           docker-compose + .env.example
├── docs/             api-contract.md (สัญญา API ระหว่าง FE/BE)
├── .vscode/          debug / tasks / settings
└── .github/workflows CI
```

## หลักการ
- **ห้าม Hardcode** — config ทั้งหมดมาจาก ENV (validate ตอนเริ่มระบบ), master data (มิติรสชาติ, ประเภทขั้นตอน, ทิศทางวางหมู, ชนิดน้ำมัน, หน่วย, สิทธิ์) อยู่ใน DB และแก้ไขได้จากหน้าเว็บ, ข้อความทั้งหมดผ่าน i18n
- Optimistic locking, soft delete, audit log, transactional outbox → notification แบบ real-time
- Refresh token แบบ httpOnly cookie พร้อม rotation และตรวจจับการนำ token เก่ากลับมาใช้ซ้ำ, access token เก็บใน memory เท่านั้น

## คำสั่งที่ใช้บ่อย
`make help` เพื่อดูคำสั่งทั้งหมด · `make test` · `make lint`
