# 🖥️ IT Helpdesk Log System (Legacy Data Management)

ระบบจัดการข้อมูลย้อนหลังสำหรับฝ่าย IT รองรับการเก็บข้อมูล Helpdesk, Permission Request และ CCTV Request โดยซิงค์ข้อมูลจากระบบภายนอกผ่าน API และมีการจัดการสิทธิ์เข้าถึงผ่าน Google OAuth

## 🏗️ System Architecture (ภาพรวมระบบ)

```mermaid
graph TD
    User[Users / Staff] -- HTTPS --> Cloudflare[Cloudflare Edge]
    Cloudflare -- Tunnel (Secure) --> Tunnel[Container: cloudflared-tunnel]

    subgraph Docker Host [Server: IT-Log-App]
        Tunnel -- HTTP:3000 --> App[Container: Node.js App]
        App -- Port 3306 --> DB[(Container: MariaDB)]
    end

    subgraph External Systems [External Sources]
        HelpdeskAPI[Helpdesk Service API]
        EmpAuthAPI[EmpAuth API]
        CCTVAPI[CCTV Request API]
    end

    App -- Cron Job (Sync) --> HelpdeskAPI
    App -- Cron Job (Sync) --> EmpAuthAPI
    App -- Cron Job (Sync) --> CCTVAPI

    style User fill:#f9f,stroke:#333,stroke-width:2px
    style Cloudflare fill:#f60,stroke:#333,stroke-width:2px
    style App fill:#61DAFB,stroke:#333,stroke-width:2px
    style DB fill:#4479A1,stroke:#333,stroke-width:2px
```

## 🗃️ Database Schema

โครงสร้างตาราง `old_helpdesk_logs` สำหรับเก็บข้อมูลรวม

```mermaid
erDiagram
    OLD_LOG {
        string ticket_no PK "Primary Key (field: no)"
        string category
        text details
        text solution "วิธีแก้ไข"
        decimal cost "ค่าใช้จ่าย (Default 0.00)"
        string reporter_name
        string reporter_code
        string reporter_dept "ฝ่ายผู้แจ้ง"
        datetime created_date
        datetime finished_date
        string responsible_person
        string responsible_dept "ฝ่ายผู้รับงาน"
        string status
        datetime createdAt
        datetime updatedAt
    }
```

## 🔄 Sync Process Flow

ขั้นตอนการทำงานของระบบ Auto Sync (Cron Job)

```mermaid
sequenceDiagram
    participant Cron as CronJob/User
    participant Server as Node.js Server
    participant ExtAPI as External APIs
    participant DB as MariaDB

    Cron->>Server: Trigger Sync (Auto/Manual)
    activate Server

    par Fetch Data Parallel
        Server->>ExtAPI: GET /helpdesks/service/all
        Server->>ExtAPI: GET /empauth/request/all
        Server->>ExtAPI: GET /cctv/request/all
    end

    ExtAPI-->>Server: Return JSON Data Arrays

    loop Process Each Item
        Server->>DB: Find by Ticket_No (PK)
        alt Found (Existing)
            Server->>Server: Check if data changed?
            opt Data Changed
                Server->>DB: UPDATE Record
            end
        else Not Found (New)
            Server->>DB: INSERT New Record
        end
    end

    Server-->>Cron: Return Success & Count
    deactivate Server
```



