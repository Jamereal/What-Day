# วิธี Deploy ขึ้น GitHub Pages

ทำตามขั้นตอนด้านล่างทีละบรรทัด ใน Command Prompt หรือ Terminal:

### 1. เริ่มต้น Git ในโปรเจกต์
เปิด Terminal ในโฟลเดอร์โปรเจกต์ `whatday-project` แล้วรันคำสั่งเหล่านี้ทีละบรรทัด:

```bash
git init
git add .
git commit -m "Initial commit - WhatDay PWA"
```

### 2. สร้าง Repository บน GitHub
1. ไปที่ [GitHub](https://github.com/new) แล้วสร้าง repository ใหม่
2. ตั้งชื่อ เช่น `whatday-app`
3. ตั้งเป็น **Public** (เพื่อให้ GitHub Pages ทำงานฟรี)
4. **ไม่ต้อง** ติ๊ก "Add a README file" หรือ .gitignore ในหน้านั้น
5. กดปุ่ม `Create repository`

### 3. เชื่อมต่อและอัปโหลดโค้ด
กลับมาที่ Terminal แล้วรันคำสั่งตามที่ GitHub บอก (เปลี่ยน URL เป็นของคุณ):

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/whatday-app.git
git push -u origin main
```

*(ถ้าโดนถาม username/password ให้ใช้ username GitHub และใช้ Personal Access Token แทน password)*

### 4. เปิดใช้งาน GitHub Pages
1. ไปที่หน้า repository ของคุณบน GitHub
2. กดแท็บ **Settings** ด้านบน
3. เมนูด้านซ้าย เลือก **Pages**
4. ตรง **Build and deployment > Source** เลือก `Deploy from a branch`
5. ตรง **Branch** เลือก `main` แล้วกด `Save`

รอสักครู่ (ประมาณ 1-2 นาที) แล้วโหลดหน้า Settings ใหม่ จะมีลิงก์เว็บโผล่ขึ้นมาด้านบน (เช่น `https://username.github.io/whatday-app/`)

---

### วิธีอัปเดตโค้ดทีหลัง
เมื่อแก้ไขโค้ดเสร็จแล้ว ให้รันคำสั่งเหล่านี้เพื่ออัปเดตเว็บไซต์:

```bash
git add .
git commit -m "Update website"
git push
```
