# Backend

Esta carpeta contiene el código fuente del backend del ERP Logyser.

## Descripción

Aquí se desarrollan los servicios, APIs y lógica de negocio, principalmente utilizando Node.js (Express, NestJS, TypeScript) según la arquitectura definida en el proyecto.

## Estructura sugerida

- /services — Lógica de negocio modularizada (por ejemplo, actas de entrega, nómina, inventarios).
- /controllers — Endpoints y rutas expuestas por la API.
- /middlewares — Middlewares reutilizables para autenticación, validación, etc.
- /utils — Funciones auxiliares y utilidades.
- /config — Archivos de configuración (entorno, conexión a Google Cloud, etc.).
- Otros módulos según necesidades del equipo.

## Integraciones destacadas

- **Google Cloud**: Conexión a Cloud SQL (MySQL), Storage, IAM.
- **Base de datos**: Scripts y utilidades para conexión segura a MySQL.
- **Automatización e IA**: Integración de agentes inteligentes y automatización de procesos, conforme a la visión general del ERP.

## Documentación

Cada módulo debe incluir su propia documentación técnica y ejemplos de uso en el backend.

---

Responsable de mantener esta estructura y documentación: Equipo de backend Logyser.
