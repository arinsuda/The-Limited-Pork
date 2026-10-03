# คู่มือการใช้งาน `docker run` — หมูกรอบ มี จำกัด (Crispy Pork System)

เอกสารนี้อธิบายการรันระบบทั้งหมดด้วยคำสั่ง **`docker run`** ตามมาตรฐาน **Enterprise Best Practices** และ **Zero Hardcoding** (ไม่ฮาร์ดโค้ดค่าใดๆ ลงในอิมเมจหรือสคริปต์ ค่าคอนฟิกทั้งหมดรับผ่าน Environment Variables)

---

## 1. จุดเด่นด้าน Best Practices

| หมวดหมู่ | รายละเอียด Best Practice ที่นำมาใช้ |
|---|---|
| **Multi-stage Builds** | ทั้ง Go Backend และ React 19 Frontend ใช้ Multi-stage build ขนาดอิมเมจเล็ก ปลอดภัย ไม่มี build tools ตกค้างใน runtime |
| **Non-root User** | Backend รันด้วยผู้ใช้ `appuser` (UID 10001) ไม่ใช้ root ป้องกันสิทธิ์เกิน |
| **Security Headers** | Frontend Nginx ติดตั้ง Header ความปลอดภัยครบ (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, etc.) |
| **Dynamic Reverse Proxy** | Nginx ใช้ `envsubst` template (`BACKEND_HOST`, `BACKEND_PORT`) สลับ upstream ปลายทางได้ตาม runtime โดยไม่ต้อง rebuild image |
| **Realtime WebSockets** | รองรับ Proxying การเชื่อมต่อ WebSocket (`/ws`) และ API (`/api/`) ในตัว ป้องกันปัญหา CORS และ SameSite Cookie |
| **Healthchecks** | ทุกคอนเทนเนอร์มี Docker Healthcheck ตรวจจับสถานะความพร้อมอัตโนมัติ |
| **Persistent Volumes** | ข้อมูล PostgreSQL, Redis, และ MinIO แยกเก็บใน Docker Named Volumes ไม่สูญหายเมื่อหยุดคอนเทนเนอร์ |
| **Isolated Network** | ทุก Service สื่อสารกันผ่าน Bridge Network เฉพาะกิจ (`moo-krob-net`) มี DNS lookup อัตโนมัติ |

---

## 2. วิธีใช้งานแบบด่วน (One-Command Execution)

ระบบเตรียมสคริปต์อัตโนมัติ `scripts/docker-run.sh` และคำสั่ง `Makefile` ไว้ให้เรียบร้อย:

### สร้าง Docker Images (Backend & Frontend)
```bash
make docker-build
# หรือ
./scripts/docker-run.sh build
```

### เริ่มต้นระบบทั้งหมดด้วย `docker run`
```bash
make docker-run
# หรือ
./scripts/docker-run.sh up
```

### ตรวจสอบสถานะและ Healthcheck
```bash
make docker-status
# หรือ
./scripts/docker-run.sh status
```

### ดู Logs
```bash
make docker-logs
# หรือระบุ service เช่น:
./scripts/docker-run.sh logs api
```

### หยุดและลบคอนเทนเนอร์
```bash
make docker-down
# หรือ
./scripts/docker-run.sh down
```

---

## 3. คำสั่ง `docker run` ทีละขั้นตอน (Manual Execution)

หากต้องการรันคำสั่ง `docker run` ด้วยตนเองทีละขั้นตอน สามารถคัดลอกคำสั่งด้านล่างไปรันใน Terminal ได้เลยครับ:

### ขั้นตอนที่ 0: กำหนดตัวแปรสภาพแวดล้อม (Customizable Envs)
```bash
export NETWORK_NAME="moo-krob-net"
export POSTGRES_PORT=5433
export POSTGRES_DB="mookrob"
export POSTGRES_USER="mookrob"
export POSTGRES_PASSWORD="change-me-postgres"

export REDIS_PORT=6379
export REDIS_PASSWORD="change-me-redis"

export MINIO_API_PORT=9000
export MINIO_CONSOLE_PORT=9001
export MINIO_ROOT_USER="minioadmin"
export MINIO_ROOT_PASSWORD="change-me-minio-root"
export MINIO_BUCKET="mookrob"
export MINIO_APP_ACCESS_KEY="mookrob-app"
export MINIO_APP_SECRET_KEY="change-me-minio-app-secret"

export API_PORT=8080
export WEB_PORT=8081
```

### ขั้นตอนที่ 1: สร้าง Network และ Volumes
```bash
# 1.1 สร้าง Network
docker network create ${NETWORK_NAME}

# 1.2 สร้าง Named Volumes
docker volume create moo-krob-pg-data
docker volume create moo-krob-redis-data
docker volume create moo-krob-minio-data
```

---

### ขั้นตอนที่ 2: รัน PostgreSQL 17
```bash
docker run -d \
  --name moo-krob-postgres \
  --network ${NETWORK_NAME} \
  --restart unless-stopped \
  -e POSTGRES_DB=${POSTGRES_DB} \
  -e POSTGRES_USER=${POSTGRES_USER} \
  -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
  -e TZ=Asia/Bangkok \
  -p ${POSTGRES_PORT}:5432 \
  -v moo-krob-pg-data:/var/lib/postgresql/data \
  --health-cmd="pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}" \
  --health-interval=5s \
  --health-timeout=5s \
  --health-retries=20 \
  postgres:17-alpine
```

---

### ขั้นตอนที่ 3: รัน Redis 7
```bash
docker run -d \
  --name moo-krob-redis \
  --network ${NETWORK_NAME} \
  --restart unless-stopped \
  -p ${REDIS_PORT}:6379 \
  -v moo-krob-redis-data:/data \
  --health-cmd="redis-cli -a ${REDIS_PASSWORD} ping | grep PONG" \
  --health-interval=5s \
  --health-timeout=5s \
  --health-retries=20 \
  redis:7-alpine \
  redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
```

---

### ขั้นตอนที่ 4: รัน MinIO S3 Object Storage
```bash
docker run -d \
  --name moo-krob-minio \
  --network ${NETWORK_NAME} \
  --restart unless-stopped \
  -e MINIO_ROOT_USER=${MINIO_ROOT_USER} \
  -e MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD} \
  -p ${MINIO_API_PORT}:9000 \
  -p ${MINIO_CONSOLE_PORT}:9001 \
  -v moo-krob-minio-data:/data \
  --health-cmd="mc ready local" \
  --health-interval=5s \
  --health-timeout=5s \
  --health-retries=20 \
  cgr.dev/chainguard/minio:latest \
  server /data --console-address ":9001"
```

---

### ขั้นตอนที่ 5: ตั้งค่า Bucket และ Service Account ใน MinIO (One-Shot)
```bash
docker run --rm \
  --network ${NETWORK_NAME} \
  --entrypoint /bin/sh \
  cgr.dev/chainguard/minio:latest \
  -c "
    set -e
    mc alias set local http://moo-krob-minio:9000 '${MINIO_ROOT_USER}' '${MINIO_ROOT_PASSWORD}'
    mc mb --ignore-existing 'local/${MINIO_BUCKET}'
    mc anonymous set none 'local/${MINIO_BUCKET}'
    echo '{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"s3:GetObject\",\"s3:PutObject\",\"s3:DeleteObject\",\"s3:ListBucket\",\"s3:GetBucketLocation\"],\"Resource\":[\"arn:aws:s3:::${MINIO_BUCKET}\",\"arn:aws:s3:::${MINIO_BUCKET}/*\"]}]}' > /tmp/policy.json
    mc admin policy create local app-rw /tmp/policy.json 2>/dev/null || true
    mc admin user add local '${MINIO_APP_ACCESS_KEY}' '${MINIO_APP_SECRET_KEY}' 2>/dev/null || true
    mc admin policy attach local app-rw --user '${MINIO_APP_ACCESS_KEY}' 2>/dev/null || true
    echo 'MinIO initialized successfully.'
  "
```

---

### ขั้นตอนที่ 6: รัน Database Migrations (One-Shot)
```bash
docker run --rm \
  --network ${NETWORK_NAME} \
  -e DB_HOST=moo-krob-postgres \
  -e DB_PORT=5432 \
  -e DB_NAME=${POSTGRES_DB} \
  -e DB_USER=${POSTGRES_USER} \
  -e DB_PASSWORD=${POSTGRES_PASSWORD} \
  -e DB_SSLMODE=disable \
  moo-krob-backend:latest \
  /app/migrate
```

---

### ขั้นตอนที่ 7: รัน Backend API
```bash
docker run -d \
  --name moo-krob-api \
  --network ${NETWORK_NAME} \
  --restart unless-stopped \
  -p ${API_PORT}:8080 \
  -e HTTP_PORT=8080 \
  -e LOG_LEVEL=info \
  -e APP_TIMEZONE=Asia/Bangkok \
  -e DB_HOST=moo-krob-postgres \
  -e DB_PORT=5432 \
  -e DB_NAME=${POSTGRES_DB} \
  -e DB_USER=${POSTGRES_USER} \
  -e DB_PASSWORD=${POSTGRES_PASSWORD} \
  -e DB_SSLMODE=disable \
  -e REDIS_ADDR=moo-krob-redis:6379 \
  -e REDIS_PASSWORD=${REDIS_PASSWORD} \
  -e REDIS_DB=0 \
  -e MINIO_ENDPOINT=moo-krob-minio:9000 \
  -e MINIO_ACCESS_KEY=${MINIO_APP_ACCESS_KEY} \
  -e MINIO_SECRET_KEY=${MINIO_APP_SECRET_KEY} \
  -e MINIO_BUCKET=${MINIO_BUCKET} \
  -e MINIO_USE_SSL=false \
  -e MINIO_PUBLIC_ENDPOINT=http://localhost:${MINIO_API_PORT} \
  -e JWT_SECRET=super-secret-crispy-pork-jwt-signing-key-minimum-32-bytes \
  -e JWT_ISSUER=mookrob-api \
  -e JWT_AUDIENCE=mookrob-web \
  -e CORS_ALLOWED_ORIGINS="http://localhost:${WEB_PORT},http://localhost:5173,http://localhost:${API_PORT}" \
  -e AUTO_MIGRATE=false \
  moo-krob-backend:latest
```

---

### ขั้นตอนที่ 8: รัน Frontend Web
```bash
docker run -d \
  --name moo-krob-web \
  --network ${NETWORK_NAME} \
  --restart unless-stopped \
  -p ${WEB_PORT}:80 \
  -e BACKEND_HOST=moo-krob-api \
  -e BACKEND_PORT=8080 \
  -e CLIENT_MAX_BODY_SIZE=25M \
  -e LISTEN_PORT=80 \
  moo-krob-frontend:latest
```

---

## 4. URL สำหรับเข้าใช้งาน

- **Frontend Web Application**: [http://localhost:8081](http://localhost:8081)
- **Backend API & Swagger/Health**: [http://localhost:8080/healthz](http://localhost:8080/healthz)
- **MinIO S3 Console**: [http://localhost:9001](http://localhost:9001) (User: `minioadmin` / Pass: `change-me-minio-root`)
- **Default Admin Account**:
  - Email: `admin@mookrob.local`
  - Password: `Admin@123456`
