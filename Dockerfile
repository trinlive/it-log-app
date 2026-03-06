# ใช้ Node.js LTS (Alpine Linux เพื่อความเบา)
FROM node:20-alpine

# สร้างโฟลเดอร์ทำงานข้างใน Container
WORKDIR /usr/src/app

# Copy ไฟล์ Package ไปก่อนเพื่อ Install (จะช่วยเรื่อง Cache)
COPY package*.json ./

# ติดตั้ง Library
RUN npm install

# Copy โค้ดทั้งหมดตามเข้าไป
COPY . .

# เปิด Port 3000
EXPOSE 3000

# คำสั่งรัน Server (เดี๋ยวเราจะสร้างไฟล์นี้กัน)
CMD [ "node", "src/server.js" ]