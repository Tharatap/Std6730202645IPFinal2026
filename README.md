# HR Manager & Salary Analytics System
**Internet Programming Final 2026 — รหัสนักศึกษา 6730202645**

ระบบจัดการพนักงาน (เพิ่ม / แก้ไข / สลับสถานะ / ลบ / ค้นหา) และวิเคราะห์โครงสร้างเงินเดือนด้วย **1D K-Means (k = 3)**

| ส่วน | เทคโนโลยี | โฟลเดอร์ |
|---|---|---|
| Backend | Node.js + Express 4 + MySQL (`mysql2/promise`) | [`backend/`](backend/) |
| Frontend | React Native (Expo, JavaScript) — รันได้ทั้งเว็บและมือถือ | [`frontend/`](frontend/) |

---

## ⚡ ตรวจเร็ว (Backend รันอยู่บน server อาจารย์แล้ว)

Backend ออนไลน์อยู่ที่ **http://119.59.102.161:3059/api** — ตรวจได้ทันทีโดยรันแค่ frontend:

```bash
git clone https://github.com/Tharatap/Std6730202645IPFinal2026.git
cd Std6730202645IPFinal2026/frontend
npm install
npx expo start --web
```

เบราว์เซอร์จะเปิด http://localhost:8081 → Login ด้วย

| Username | Password |
|---|---|
| `admin` | `password123` |

เช็คว่า backend ทำงาน: เปิด http://119.59.102.161:3059/api/health → ต้องได้ `{"ok":true}`

---

## 1. รัน Frontend

> ต้องมี Node.js 20.19+ (แนะนำ 22 LTS ขึ้นไป)

```bash
cd frontend
npm install
npx expo start          # แล้วกด w = เปิดบนเว็บ, หรือสแกน QR ด้วยแอป Expo Go บนมือถือ
# หรือเปิดเว็บทันที:  npx expo start --web
```

- Font (Fraunces, IBM Plex Sans) ติดตั้งอัตโนมัติจาก `npm install` — ถ้าโหลดไม่ได้จะใช้ font ของระบบแทน
- **API_URL** ตั้งที่ไฟล์ [`frontend/src/config.js`](frontend/src/config.js)
  - ค่าเริ่มต้น: `http://119.59.102.161:3059/api` (server อาจารย์)
  - ถ้ารัน backend บนเครื่องตัวเอง: เปลี่ยนเป็น `http://localhost:3000/api`
  - มือถือจริง + backend บนเครื่อง: ใช้ IP ของ PC ในวง LAN เช่น `http://192.168.1.10:3000/api`

## 2. รัน Backend บนเครื่อง (ไม่บังคับ)

> ต้องมี Node.js 18+ และ MySQL (backend ใช้ Node 18+ ได้)

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
# แก้ .env → PORT, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
npm start                   # = node server.js
```

- ตอนเริ่ม server จะ **สร้างตาราง + ใส่ข้อมูลตัวอย่าง 8 คนให้อัตโนมัติ** (เฉพาะเมื่อตารางว่าง) — ไม่ต้อง import SQL เอง
- หรือ import เองใน phpMyAdmin: [`backend/sql/schema.sql`](backend/sql/schema.sql) → [`backend/sql/seed.sql`](backend/sql/seed.sql)
- ทดสอบ: `curl http://localhost:3000/api/health` → `{"ok":true}`

## 3. Deploy บน server อาจารย์ (119.59.102.161:3059)

ขั้นตอนเต็มและตารางแก้ปัญหา: [`backend/README.md`](backend/README.md)

```bash
# อัปโหลดไฟล์ใน backend/ (ยกเว้น node_modules) ด้วย FileZilla SFTP port 2222 → /app/std6730202645IPFinal2026/
ssh std6730202645@119.59.102.161 -p 2222
cd ~/std6730202645IPFinal2026
npm ci
# สร้าง .env: PORT=3059, DB_HOST=localhost, DB_USER, DB_PASSWORD, DB_NAME=ip_std6730202645
nohup node server.js > out.log 2>&1 &
curl http://localhost:3059/api/health
```

---

## Database

- MySQL database `ip_std6730202645` (บน server อาจารย์)
- ตาราง **`Tharatap_employees_final_exam`** — ชื่อตารางและทุกคอลัมน์ขึ้นต้นด้วย `Tharatap_` ตามข้อกำหนด

| คอลัมน์ | ชนิด |
|---|---|
| `Tharatap_id` | INT UNSIGNED, AUTO_INCREMENT, PK |
| `Tharatap_name` | VARCHAR(100) |
| `Tharatap_position` | VARCHAR(100) |
| `Tharatap_status` | ENUM('Active','On Leave') |
| `Tharatap_salary` | DECIMAL(10,2) |
| `Tharatap_created_at` | DATETIME |

- ไม่ใช้ FOREIGN KEY / TRUNCATE / CREATE DATABASE / DROP, ใช้ **prepared statement** ทุก query

## API

ทุก route `/api/employees*` ต้องส่ง header **`Authorization: Bearer mock-jwt-token`** (ไม่ส่ง → `401`)

| Method | Path | ผลลัพธ์ |
|---|---|---|
| GET | `/api/health` | `{ok:true}` |
| POST | `/api/login` | `admin/password123` → `200 {success:true, token:"mock-jwt-token"}` · ผิด → `401` |
| GET | `/api/employees` | `{success:true, data:[{id, name, position, status, salary}]}` |
| GET | `/api/employees?search=dev` | ค้นชื่อหรือตำแหน่ง (LIKE) — รองรับ `position`, `status`, `minSalary`, `maxSalary` เพิ่มเติม |
| GET | `/api/employees/salary-clusters` | `{success:true, clusters:[{group:"Tier 1", centroid, count}, …]}` |
| POST | `/api/employees` | body `{name, position, salary}` → `201` · ข้อมูลไม่ถูกต้อง → `400` |
| PUT | `/api/employees/:id` | แก้ชื่อ/ตำแหน่ง/เงินเดือน → `200` · `400` · `404` |
| PUT | `/api/employees/:id/status` | สลับ Active ⇄ On Leave → `200` · id ไม่มี → `404` |
| DELETE | `/api/employees/:id` | ลบจาก MySQL จริง → `200` · id ไม่มี → `404` |

ตัวอย่างทดสอบด้วย curl:
```bash
curl -X POST http://119.59.102.161:3059/api/login -H "Content-Type: application/json" -d '{"username":"admin","password":"password123"}'
curl http://119.59.102.161:3059/api/employees -H "Authorization: Bearer mock-jwt-token"
curl http://119.59.102.161:3059/api/employees/salary-clusters -H "Authorization: Bearer mock-jwt-token"
```

## K-Means (Salary Clusters)

เขียนเองใน [`backend/kmeans.js`](backend/kmeans.js) ไม่ใช้ library
- เริ่ม centroid ที่ min / median / max, วนสูงสุด 100 รอบ หรือจนกลุ่มไม่เปลี่ยน
- เรียงผลจากเงินเดือนต่ำ → สูง เป็น Tier 1 → Tier 3, centroid ปัดเป็นจำนวนเต็ม
- กรณีพิเศษไม่ crash: 0 คน → `clusters: []` · เงินเดือนไม่ซ้ำน้อยกว่า 3 ค่า → จำนวน Tier เท่ากับจำนวนค่าที่ไม่ซ้ำ · cluster ว่างคง centroid เดิม

## ฟีเจอร์ในแอป

| หน้า | สิ่งที่ทำได้ |
|---|---|
| Login | ตรวจช่องว่างก่อนส่ง, รหัสผิดแสดง error, กด F5 แล้วไม่ต้อง login ใหม่ (เว็บ) |
| Employees | สถิติ Total / Active / On Leave, ค้นหา (debounce), ตัวกรองตำแหน่ง/สถานะ/ช่วงเงินเดือน, เพิ่ม / แก้ไข (validate ในฟอร์ม), Toggle status, Delete (ยืนยัน "Are you sure?" ก่อนลบ) — ทุกครั้งโหลดรายการใหม่จาก API |
| Analytics | ปุ่ม **Analyze Salary Structure** (มีทั้งหน้า Employees และ Analytics), แสดง ActivityIndicator ระหว่างคำนวณ, กราฟแท่งจำนวนคนต่อ Tier, การ์ด Tier (จำนวนคน, เงินเดือนเฉลี่ย, ช่วงเงินเดือน), เปิดแท็บแล้ววิเคราะห์ให้อัตโนมัติ |
| ทั่วไป | Responsive: จอกว้าง ≥ 768px เป็นตาราง, มือถือเป็นรายการ + แท็บด้านล่าง · ได้ 401 จะกลับหน้า Login อัตโนมัติ · ข้อความ error อ่านเข้าใจง่าย |

## โครงสร้างโปรเจกต์

```
Std6730202645IPFinal2026/
├── backend/
│   ├── server.js          # Express routes + validation + auth middleware
│   ├── db.js              # MySQL pool + สร้างตาราง/ข้อมูลตัวอย่างอัตโนมัติ
│   ├── kmeans.js          # 1D K-Means
│   ├── sql/schema.sql, sql/seed.sql
│   └── .env.example
└── frontend/
    ├── App.js             # โหลด font, สลับ Login ↔ Main
    └── src/
        ├── config.js      # API_URL
        ├── api.js         # fetch wrapper (ใส่ token, แปลง error)
        ├── alert.js       # dialog / confirm / toast
        ├── theme.js       # สี ฟอนต์ ระยะห่าง
        ├── components/    # Button, Input, Dropdown, AppModal, DialogHost, StatusBadge
        └── screens/       # LoginScreen, MainScreen, EmployeesScreen, AnalyticsScreen
```
