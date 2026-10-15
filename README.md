# HR Manager & Salary Analytics System (IP Final 2026)

- `backend/` — Node.js + Express 4 + MySQL (ดูรายละเอียด endpoint และวิธี deploy ใน [backend/README.md](backend/README.md))
- `frontend/` — Expo React Native (JavaScript)

## วิธีรัน

### Backend
```bash
cd backend
npm install
cp .env.example .env   # ใส่ PORT, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
npm start
```
Server จะสร้างตาราง `Tharatap_employees` และข้อมูลตัวอย่างให้อัตโนมัติ

### Frontend
```bash
cd frontend
npm install
npx expo start         # กด w = เปิดบนเว็บ, หรือสแกน QR ด้วย Expo Go
```
ค่าเริ่มต้นเรียก API ที่ `http://119.59.102.161:3059/api` — ถ้าทดสอบกับ backend บนเครื่อง ให้แก้ `frontend/src/config.js` เป็น `http://localhost:3000/api` (มือถือจริงใช้ IP ของเครื่อง PC ในวง LAN)

**Login:** `admin` / `password123`

## ฟีเจอร์
- Login (mock token)
- รายชื่อพนักงาน, เพิ่มพนักงาน (validate ข้อมูล), สลับสถานะ Active ⇄ On Leave, ลบ (มี confirm)
- วิเคราะห์โครงสร้างเงินเดือนด้วย K-Means 1 มิติ (k=3) แบ่งเป็น Tier 1–3 แสดงค่าเฉลี่ยและจำนวนคน
