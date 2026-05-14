# NEXORA 🚀

### SaaS de Facturación Electrónica para Ecuador 🇪🇨

Nexora es una plataforma SaaS moderna de facturación electrónica enfocada en negocios ecuatorianos.
Permite generar, firmar, transmitir y autorizar comprobantes electrónicos ante el SRI utilizando arquitectura escalable y tecnologías modernas.

---

# ✨ Características principales

## ✅ Facturación electrónica SRI

* Generación de XML según ficha técnica SRI v2.26
* Firma digital XAdES-BES con certificados `.p12`
* Transmisión automática al SRI
* Polling de autorización en tiempo real
* Facturas autorizadas en segundos
* Descarga de XML firmado
* Generación de PDF RIDE

---

## ✅ Arquitectura SaaS

* Multi-tenant preparado
* Sistema de planes y cuotas
* Dashboard con métricas reales
* Gestión de empresas
* Gestión de clientes
* Gestión de productos
* Sistema de autenticación JWT
* Roles y guards

---

## ✅ Infraestructura moderna

* Docker
* PostgreSQL
* Redis
* BullMQ
* PM2
* VPS Ubuntu
* Next.js + NestJS

---

# 🏗️ Arquitectura del proyecto

```text
Nexora-SAAS/
│
├── nexora-api/        → Backend NestJS
├── nexora-web/        → Frontend Next.js
│
├── PostgreSQL         → Base de datos
├── Redis              → Colas y cache
├── BullMQ             → Procesamiento asíncrono
└── Docker             → Infraestructura
```

---

# ⚙️ Stack tecnológico

## Backend

* NestJS v11
* TypeORM
* PostgreSQL
* Redis
* BullMQ
* JWT Authentication
* PDFKit
* SOAP SRI Ecuador

## Frontend

* Next.js 16
* React
* Tailwind CSS
* Axios
* React Hook Form
* Zod

## Infraestructura

* Docker
* Ubuntu 24.04
* PM2
* Nginx (pendiente SSL)

---

# 🔥 Funcionalidades implementadas

## Backend ✅

* JWT Authentication
* CRUD empresas
* CRUD clientes
* CRUD productos
* CRUD certificados
* CRUD facturas
* Firma XAdES-BES
* Integración SRI Producción
* Retry automático
* Polling de autorización
* Recovery Processor
* Generación PDF RIDE
* Storage XML/PDF
* Sistema de colas

---

## Frontend ✅

* Login
* Dashboard
* Facturas
* Nueva factura
* Clientes
* Productos
* Empresas
* Certificados
* Planes SaaS
* Auto-refresh tiempo real
* UI responsive moderna

---

# 🔄 Flujo de facturación

```text
Crear factura
      ↓
Generar XML
      ↓
Firmar XAdES-BES
      ↓
Enviar al SRI
      ↓
RECIBIDA
      ↓
Polling automático
      ↓
AUTORIZADA
      ↓
Generar PDF RIDE
      ↓
Descargar XML/PDF
```

---

# 📦 Instalación local

## 1️⃣ Clonar repositorio

```bash
git clone https://github.com/Fabricioanchundia/Nexora-SAAS.git
cd Nexora-SAAS
```

---

# 🐳 Backend — NestJS

## Entrar al backend

```bash
cd nexora-api
```

## Instalar dependencias

```bash
npm install
```

## Variables de entorno

Crear `.env`

```env
DATABASE_URL=postgresql://nexora:password@localhost:5432/nexora
REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=supersecret

PORT=3000
NODE_ENV=development
```

---

## Levantar Docker

```bash
docker-compose up -d
```

---

## Ejecutar backend

```bash
npm run start:dev
```

Backend:

```text
http://localhost:3000/api/v1
```

---

# 🌐 Frontend — Next.js

## Entrar al frontend

```bash
cd nexora-web
```

## Instalar dependencias

```bash
npm install
```

## Variables de entorno

Crear `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

---

## Ejecutar frontend

```bash
npm run dev
```

Frontend:

```text
http://localhost:3001
```

---

# 🧾 Integración SRI Ecuador

Nexora implementa:

* XML v2.26 SRI
* Firma XAdES-BES
* SOAP Recepción
* SOAP Autorización
* Ambiente PRUEBAS
* Ambiente PRODUCCIÓN

---

# 🔐 Certificados digitales

Compatible con certificados:

* BCE
* Security Data
* ANF
* archivos `.p12`

---

# 📊 Calidad de código

## SonarQube

* ✅ Quality Gate PASSED
* ✅ 0 Vulnerabilities
* ✅ 0 New Bugs
* ✅ 0 New Code Smells

---

# 🚀 Roadmap

## Próximamente

* HTTPS/SSL
* Landing page pública
* Pasarela de pagos
* Reportes avanzados
* Notificaciones por email
* Multi-tenant completo
* Migraciones TypeORM
* Registro público de usuarios
* API pública

---

# 💼 Objetivo del proyecto

Nexora busca modernizar la facturación electrónica en Ecuador mediante:

* UX moderna
* automatización
* rapidez
* arquitectura escalable
* experiencia SaaS real

---

# 👨‍💻 Autor

## Fabricio Anchundia

Proyecto desarrollado como plataforma SaaS real para negocios ecuatorianos.

Repositorio oficial:

[GitHub - Nexora SAAS](https://github.com/Fabricioanchundia/Nexora-SAAS?utm_source=chatgpt.com)
