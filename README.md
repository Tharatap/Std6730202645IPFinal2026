# HR Manager & Salary Analytics System (IP Final 2026)

| โฟลเดอร์ | เทคโนโลยี |
|---|---|
| `backend/` | Node.js + Express 4 + MySQL (mysql2) |
| `frontend/` | Expo React Native (JavaScript) |

**Login:** `admin` / `password123`

## 1. รัน Backend บนเครื่อง (Local)
```bash
cd backend
npm install
cp .env.example .env   # แก้ DB_USER, DB_PASSWORD, DB_NAME ให้ตรงกับ MySQL ของเครื่อง (PORT=3000)
npm start              # node server.js
```
- Server สร้างตาราง `Tharatap_employees_final_exam` และใส่ข้อมูลตัวอย่าง 8 คนให้อัตโนมัติ (เฉพาะเมื่อตารางว่าง)
- หรือ import เองใน phpMyAdmin: `backend/sql/schema.sql` แล้ว `backend/sql/seed.sql`
- ทดสอบ: `curl http://localhost:3000/api/health` → `{"ok":true}`

## 2. รัน Backend บน server อาจารย์ (119.59.102.161:3059)
สรุปย่อ (ขั้นตอนเต็ม + ตารางแก้ปัญหาดูที่ **[backend/README.md](backend/README.md)**):
1. FileZilla SFTP `119.59.102.161` port `2222` → อัปโหลดไฟล์ใน `backend/` (ยกเว้น `node_modules`) ไปที่ `/app/std6730202645IPFinal2026/`
2. `ssh std6730202645@119.59.102.161 -p 2222` → `cd ~/std6730202645IPFinal2026`
3. สร้าง `.env` (`PORT=3059`, `DB_HOST=localhost`, user/password จริง, `DB_NAME=ip_std6730202645`)
4. `npm ci` → `nohup node server.js > out.log 2>&1 &`
5. ทดสอบ: http://119.59.102.161:3059/api/health

## 3. รัน Frontend
```bash
cd frontend
npm install && npx expo start
```
กด `w` เพื่อเปิดบนเว็บ หรือสแกน QR ด้วยแอป Expo Go บนมือถือ

### ตั้งค่า API_URL
แก้ที่ไฟล์ **`frontend/src/config.js`**
- ค่าเริ่มต้น: `http://119.59.102.161:3059/api` (server อาจารย์)
- ทดสอบกับ backend บนเครื่อง: `http://localhost:3000/api`
- มือถือจริง: ใช้ IP ของเครื่อง PC ในวง LAN เช่น `http://192.168.1.10:3000/api`

## ฟีเจอร์
- Login (mock token `mock-jwt-token`) — API `/api/employees*` ต้องมี `Authorization: Bearer mock-jwt-token`
- รายชื่อพนักงาน, เพิ่มพนักงาน (validate ทั้งฝั่ง frontend และ backend), สลับสถานะ Active ⇄ On Leave, ลบ (มี confirm ทั้งเว็บและมือถือ)
- วิเคราะห์โครงสร้างเงินเดือนด้วย K-Means 1 มิติ (k=3, เขียนเอง ไม่ใช้ library) → การ์ด Tier 1–3 แสดงเงินเดือนเฉลี่ย (centroid) และจำนวนคน
