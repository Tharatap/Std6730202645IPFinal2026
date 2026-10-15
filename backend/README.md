# HR Manager & Salary Analytics System — Backend

Node.js + Express 4 + MySQL (mysql2/promise)

## รันบนเครื่อง (Local)

```bash
cd backend
npm install
cp .env.example .env      # แล้วแก้ DB_USER / DB_PASSWORD / DB_NAME ให้ตรงกับ MySQL ของเครื่อง
npm start                 # node server.js
```

- ตอนเริ่ม server จะสร้างตาราง `Tharatap_employees` ให้อัตโนมัติ (`CREATE TABLE IF NOT EXISTS`) และใส่ข้อมูลตัวอย่าง 8 คน **เฉพาะเมื่อตารางว่าง**
- ถ้าไม่มี `PORT` ใน `.env` server จะหยุดทำงานทันที (exit 1)
- ทดสอบ: `curl http://localhost:3000/api/health` → `{"ok":true}`

## Endpoints

ทุก route `/api/employees*` ต้องส่ง header `Authorization: Bearer mock-jwt-token` (ไม่ส่ง → 401 `{"success":false,"message":"Unauthorized"}`)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/health` | – | `200 {ok:true}` |
| POST | `/api/login` | `{username,password}` | `200 {success:true,token:"mock-jwt-token"}` / `401 {success:false,message:"Invalid username or password"}` |
| GET | `/api/employees` | – | `200 {success:true,data:[{id,name,position,status,salary}]}` |
| POST | `/api/employees` | `{name,position,salary}` | `201 {success:true,data:employee}` / `400` ข้อมูลไม่ถูกต้อง |
| PUT | `/api/employees/:id/status` | – | สลับ `Active` ⇄ `On Leave` → `200 {success:true,data:employee}` / `404` |
| DELETE | `/api/employees/:id` | – | `200 {success:true,message}` / `404` |
| GET | `/api/employees/salary-clusters` | – | `200 {success:true,clusters:[{group:"Tier 1",centroid,count}]}` |

- Validation POST: `name`, `position` ห้ามว่าง (หลัง trim, ไม่เกิน 100 ตัวอักษร), `salary` ต้องเป็นตัวเลข > 0
- JSON ผิดรูปแบบ → `400`, route ไม่มีอยู่ → `404`, error ภายใน → `500 {success:false,message}`
- Salary clusters: K-Means 1 มิติ (k=3) เขียนเอง ไม่ใช้ library — เริ่ม centroid ที่ min/median/max, สูงสุด 100 รอบ, เรียง Tier 1 (ต่ำสุด) → Tier 3 (สูงสุด); ไม่มีพนักงาน → `clusters: []`; เงินเดือนไม่ซ้ำกันน้อยกว่า 3 ค่า → k = จำนวนค่าที่ไม่ซ้ำ

## ฐานข้อมูล

ตาราง `Tharatap_employees` (ชื่อตารางและทุกคอลัมน์ขึ้นต้นด้วย `Tharatap_` ตามข้อกำหนด) — ดู `sql/schema.sql`, ข้อมูลตัวอย่าง `sql/seed.sql`
ไม่ใช้ FOREIGN KEY / TRUNCATE / DROP / CREATE DATABASE (สิทธิ์ไม่พอบน server)

## Deploy ขึ้น server อาจารย์ (119.59.102.161, port 3059)

1. **ฐานข้อมูล (ไม่บังคับ — server สร้างตารางเองได้)**: เปิด phpMyAdmin http://119.59.102.161/nindamdb → เลือก `ip_std6730202645` → Import `sql/schema.sql` แล้วตามด้วย `sql/seed.sql`
2. **อัปโหลดไฟล์**: FileZilla → SFTP `119.59.102.161` port `2222` → อัปโหลดโฟลเดอร์ `backend/` **โดยไม่เอา `node_modules` และ `.env`** ไปที่ `/app/std6730202645IPFinal2026/`
3. **ตั้งค่า**:
   ```bash
   ssh std6730202645@119.59.102.161 -p 2222
   cd /app/std6730202645IPFinal2026
   npm install
   cp .env.example .env
   nano .env        # PORT=3059, DB_HOST=localhost, DB_USER/DB_PASSWORD ของจริง, DB_NAME=ip_std6730202645
   ```
4. **หยุดแอปเก่าที่ใช้ port 3059**:
   ```bash
   pm2 list
   pm2 stop <name>
   # หรือถ้าไม่ได้ใช้ pm2
   pkill -f "node server.js"
   ```
5. **รัน**:
   ```bash
   pm2 start server.js --name hr-final
   # fallback ถ้าไม่มี pm2
   nohup node server.js > out.log 2>&1 &
   ```
6. **ทดสอบ**: `curl http://119.59.102.161:3059/api/health` → `{"ok":true}`

### แก้ปัญหา (Troubleshooting)

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `EADDRINUSE` | แอปเก่ายังใช้ port 3059 อยู่ → ทำขั้นตอนที่ 4 ก่อน |
| เรียกจากข้างนอกแล้ว timeout | server ไม่ได้ listen ที่ `0.0.0.0` หรือ PORT ไม่ใช่ 3059 → เช็ค `.env` |
| `ER_ACCESS_DENIED_ERROR` | `DB_USER` / `DB_PASSWORD` ใน `.env` ผิด |
| `#1142` (command denied) | ใช้คำสั่งที่ไม่มีสิทธิ์ เช่น FOREIGN KEY / TRUNCATE / DROP → ใช้ไฟล์ SQL ในโปรเจกต์นี้ (ใช้ `DELETE` แทน) |
| CORS error ฝั่ง frontend | ไม่ได้เรียก `app.use(cors())` (ในโปรเจกต์นี้มีแล้ว) |
