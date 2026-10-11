# คู่มือการ Deploy ระบบ หมูกรอบ มี จำกัด (The Limited Pork) แบบฟรี 100%

คู่มือฉบับนี้สรุปขั้นตอนการนำโปรเจกต์ขึ้นระบบคลาวด์แบบ **ฟรี (Free Tier)** ทั้งระบบ โดยใช้สถาปัตยกรรมระดับ Production:

| ส่วนของระบบ | ผู้ให้บริการ | แพ็กเกจฟรีที่ได้รับ |
| :--- | :--- | :--- |
| **Frontend Web** | **Cloudflare Pages** | ฟรีไม่จำกัด Bandwidth, มี Edge CDN ทั่วโลก, HTTPS ฟรี |
| **Backend API** | **Render (Web Service)** | ฟรี 750 ชม./เดือน, รัน Go Docker Container, HTTPS ฟรี |
| **Database** | **Render Postgres** หรือ **Neon / Supabase** | ฟรี PostgreSQL Database |
| **Object Storage** | **Cloudflare R2** | ฟรีพื้นที่ 10 GB/เดือน, ฟรีค่าดาวน์โหลด (Zero Egress Fees) |
| **Cache & Pub/Sub** | **Built-in In-Memory** หรือ **Upstash** | ไม่ต้องเสียเงินซื้อ Redis เพิ่ม |

---

## สารบัญขั้นตอน
1. [ขั้นตอนที่ 1: เตรียม Cloudflare R2 (Object Storage)](#ขั้นตอนที่-1-เตรียม-cloudflare-r2-object-storage)
2. [ขั้นตอนที่ 2: Deploy Backend & Database บน Render](#ขั้นตอนที่-2-deploy-backend--database-บน-render)
3. [ขั้นตอนที่ 3: Deploy Frontend บน Cloudflare Pages](#ขั้นตอนที่-3-deploy-frontend-บน-cloudflare-pages)
4. [ขั้นตอนที่ 4: เชื่อมต่อระบบและตรวจสอบการทำงาน](#ขั้นตอนที่-4-เชื่อมต่อระบบและตรวจสอบการทำงาน)

---

## ขั้นตอนที่ 1: เตรียม Cloudflare R2 (Object Storage)

1. เข้าสู่ระบบ [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. ในเมนูด้านซ้าย เลือก **R2 Object Storage**
3. คลิก **Create bucket**:
   - ตั้งชื่อ Bucket เช่น: `mookrob`
   - Location: เลือก **Automatic** หรือ **Asia Pacific (APAC)**
   - คลิก **Create Bucket**
4. สร้าง **API Token** สำหรับให้ Backend เชื่อมต่อ:
   - ที่หน้า R2 ให้คลิก **Manage R2 API Tokens** ทางขวามือ
   - คลิก **Create API Token**
   - Permissions: เลือก **Object Read & Write**
   - Apply to specific buckets: เลือกเฉพาะ bucket `mookrob`
   - คลิก **Create API Token**
5. **จดบันทึกค่าสำคัญเหล่านี้ไว้:**
   - **Access Key ID** (จะนำไปใส่ใน `MINIO_ACCESS_KEY`)
   - **Secret Access Key** (จะนำไปใส่ใน `MINIO_SECRET_KEY`)
   - **S3 API Endpoint**: เช่น `<ACCOUNT_ID>.r2.cloudflarestorage.com` (จะนำไปใส่ใน `MINIO_ENDPOINT`)
6. *(ทางเลือกเพิ่มเติมสำหรับเปิดดูรูปโดยตรง)*:
   - เข้าไปใน Bucket `mookrob` -> แท็บ **Settings**
   - ใต้หัวข้อ **Public access** สามารถเปิด **R2.dev subdomain** เพื่อรับ URL สาธารณะ เช่น `https://pub-xxxxxx.r2.dev` (นำไปใส่ใน `MINIO_PUBLIC_ENDPOINT`)

---

## ขั้นตอนที่ 2: Deploy Backend & Database บน Render

### วิธีที่ A: ใช้ Blueprint 1-Click (`render.yaml`) (ง่ายและเร็วที่สุด)
1. Push โค้ดทั้งหมดขึ้น GitHub
2. เข้าสู่ระบบ [Render Dashboard](https://dashboard.render.com/)
3. คลิกปุ่ม **New +** -> เลือก **Blueprint**
4. เลือก Git Repository ของคุณ
5. Render จะอ่านไฟล์ [`render.yaml`](file:///Users/arinsudakijjathon/Documents/Project/หมูกรอบ-มี-จำกัด/render.yaml) และตั้งค่าให้ทันที:
   - สร้าง **PostgreSQL Database** (`mookrob-db`)
   - สร้าง **Web Service** สำหรับ Go Backend API
6. ใส่ค่า Environment Variables ของ Cloudflare R2 ที่จดไว้:
   - `MINIO_ENDPOINT`: `<ACCOUNT_ID>.r2.cloudflarestorage.com`
   - `MINIO_ACCESS_KEY`: `<Your R2 Access Key ID>`
   - `MINIO_SECRET_KEY`: `<Your R2 Secret Access Key>`
   - `MINIO_BUCKET`: `mookrob`
7. คลิก **Apply** — Render จะทำการ Build และ Deploy ให้ทันที

---

### วิธีที่ B: ตั้งค่าแบบ Manual บน Render
หากต้องการสร้างทีละ Service:

#### 1. สร้าง Database (PostgreSQL):
- คลิก **New +** -> **PostgreSQL**
- Name: `mookrob-db`, User: `mookrob`, Database: `mookrob`
- Region: **Singapore (Southeast Asia)**
- Plan: **Free**
- เมื่อสร้างเสร็จ ให้คัดลอก **Internal Database URL** หรือ **External Database URL**

#### 2. สร้าง Web Service สำหรับ Backend API:
- คลิก **New +** -> **Web Service**
- เลือก Repository
- Name: `mookrob-api`
- Region: **Singapore**
- Runtime: **Docker**
- Docker Command: ปล่อยว่าง
- Dockerfile Path: `backend/Dockerfile`
- Docker Context: `backend`
- Instance Type: **Free**
- Health Check Path: `/healthz`
- ตั้งค่า **Environment Variables**:
  ```env
  APP_ENV=production
  AUTO_MIGRATE=true
  DATABASE_URL=<วาง connection string ของ PostgreSQL ที่ได้จากข้อ 1>
  JWT_SECRET=<ข้อความสุ่มความยาว 32 ตัวอักษรขึ้นไป>
  COOKIE_SAME_SITE=None
  COOKIE_SECURE=true
  CORS_ALLOWED_ORIGINS=https://*.pages.dev,http://localhost:5173
  MINIO_ENDPOINT=<ACCOUNT_ID>.r2.cloudflarestorage.com
  MINIO_ACCESS_KEY=<R2 Access Key ID>
  MINIO_SECRET_KEY=<R2 Secret Access Key>
  MINIO_BUCKET=mookrob
  MINIO_USE_SSL=true
  REDIS_ADDR=memory
  ```
- คลิก **Deploy Web Service**
- เมื่อ Deploy สำเร็จ คุณจะได้รับ URL เช่น `https://mookrob-api.onrender.com`

---

## ขั้นตอนที่ 3: Deploy Frontend บน Cloudflare Pages

1. เข้าสู่ระบบ [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. เมนูด้านซ้ายเลือก **Workers & Pages** -> คลิกปุ่ม **Create application**
3. เลือกแท็บ **Pages** -> คลิก **Connect to Git**
4. เลือก Git Repository โครงการนี้
5. ตั้งค่าการ Build ดังนี้:
   - **Project name**: `mookrob` (หรือชื่อตามต้องการ)
   - **Production branch**: `main` (หรือ branch ที่คุณใช้)
   - **Framework preset**: `Vite`
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. เพิ่ม **Environment Variables (Production)**:
   - `VITE_API_BASE_URL`: `https://mookrob-api.onrender.com/api/v1` *(ใช้ URL ของ Render Backend ที่ได้จากขั้นตอนที่ 2)*
   - `VITE_WS_URL`: `wss://mookrob-api.onrender.com/ws`
   - `VITE_DEFAULT_LOCALE`: `th`
7. คลิก **Save and Deploy**
8. Cloudflare Pages จะ Build และได้ URL เช่น `https://mookrob.pages.dev`
   *(โปรเจกต์นี้มีไฟล์ `_redirects` รองรับ SPA Routing บน Cloudflare Pages ให้เรียบร้อยแล้ว ไม่เกิดปัญหาหน้า 404 เมื่อ Refresh)*

---

## ขั้นตอนที่ 4: เชื่อมต่อระบบและตรวจสอบการทำงาน

1. **อัปเดต CORS บน Render**:
   - กลับไปที่ Render Dashboard -> เข้าไปที่ `mookrob-api` -> เมนู **Environment**
   - แก้ไข `CORS_ALLOWED_ORIGINS` ให้ใส่ URL ของ Cloudflare Pages เช่น:
     ```env
     CORS_ALLOWED_ORIGINS=https://mookrob.pages.dev,https://*.pages.dev
     ```
   - กด Save Changes (Render จะ restart อัตโนมัติ)

2. **เข้าใช้งานครั้งแรก**:
   - เปิด URL ของ Cloudflare Pages (เช่น `https://mookrob.pages.dev`)
   - เข้าสู่ระบบด้วยบัญชี Admin เริ่มต้น:
     - **Email**: `admin@mookrob.local`
     - **Password**: `Admin@123456`
   - ระบบจะสร้างตารางฐานข้อมูลและ Seed ข้อมูลวัตถุดิบ/สูตรหมูกรอบตั้งต้นให้อัตโนมัติ (`AUTO_MIGRATE=true`)
   - ไปที่หน้าสูตรอาหาร ทดลองเพิ่มสูตร และอัปโหลดรูปภาพ รูปจะถูกส่งไปเก็บไว้บน **Cloudflare R2** โดยตรง!

---

## สรุปข้อดีของการตั้งค่านี้
* ✅ **ฟรี 100% ไม่มีค่าบริการแอบแฝง**
* ✅ **รูปภาพ & ไฟล์แนบ**: เก็บใน Cloudflare R2 ฟรี 10GB ไม่คิดค่าทราฟฟิกดาวน์โหลด
* ✅ **Zero Hardcoding**: ทุกการเชื่อมต่อกำหนดผ่านตัวแปรแวดล้อมทั้งหมด
* ✅ **Auto-Migration**: Database รัน Migration และสร้างบัญชี Admin ให้เองอัตโนมัติตั้งแต่เปิดเซิร์ฟเวอร์ครั้งแรก
* ✅ **In-Memory Cache**: รันระบบได้สมบูรณ์บน Render Free Tier โดยไม่ต้องเสียเงินเช่า Redis
