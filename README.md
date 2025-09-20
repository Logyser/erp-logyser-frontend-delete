# ERP Logyser

Bienvenido al repositorio del **ERP para Logyser**, un sistema integral para la gestión de operaciones logísticas y administrativas, adaptado a las necesidades de la empresa.

---

## **Visión General**

Este ERP centraliza todas las áreas clave de la empresa Logyser en una plataforma escalable, moderna y conectada al ecosistema de Google Cloud. El objetivo es migrar gradualmente los procesos desde AppSheet y otras soluciones hacia un sistema robusto, documentado y adaptable, integrando agentes de IA y herramientas de automatización.

---

## **Áreas Cubiertas**

- **Selección**: Gestión de candidatos, procesos de reclutamiento y entrevistas.
- **Contratación**: Vinculación de personal, gestión de documentos y legalización.
- **Nómina**: Asistencia, liquidación, pagos, parametrización de impuestos.
- **Inventarios**: Control de artículos, insumos y equipos.
- **Dotación**: Registro y entrega de elementos, evidencia, control de stock.
- **Compras**: Gestión de órdenes, proveedores, integración con inventarios.
- **Facturación**: Emisión de recibos, consecutivos automáticos, integración con clientes.
- **Contabilidad**: Registros contables, bancos, impuestos.
- **Operaciones**: Actividades logísticas, control de vehículos, usuarios y reportes.
- **Gerencia**: Reportes, indicadores, dashboards.
- **Clientes**: CRM, facturación, comunicación y atención.

---

## **Tecnologías**

- **Frontend:** Flutter (móvil y web)
- **Backend/API:** Node.js (Express/NestJS/TypeScript)
- **Base de Datos:** MySQL 8.x (Google Cloud SQL)
- **Infraestructura:** Google Cloud (SQL, Storage, IAM, Pub/Sub, Vertex AI)
- **Automatización/IA:** Integración de agentes inteligentes para procesos repetitivos y analítica avanzada.

---

## **Migración y Transición**

1. **Modelo de Datos:** Migración y ajuste del modelo actual en MySQL.
2. **Documentación:** Cada módulo incluye documentación técnica y funcional.
3. **Modularización:** Estructura de carpetas por área, con endpoints y procesos independientes.
4. **Interfaces:** Flutter para UI, Node.js para lógica de negocio y API REST/GraphQL.
5. **Seguridad:** Roles, autenticación OAuth/JWT, integración con Google Identity.
6. **Agentes de IA:** Automatización en selección, facturación, atención a clientes y reportes.

---

## **Estructura del Repositorio**

- `/database`: Scripts SQL, migraciones, documentación de modelo de datos.
- `/docs`: Diagramas, manuales de usuario y desarrollador, procesos de negocio.
- `/backend`: Código fuente Node.js, endpoints, lógica de negocio.
- `/frontend`: Código fuente Flutter, interfaces de usuario.
- `/infra`: Configuración y scripts de despliegue en Google Cloud.
- `/ai`: Modelos, flujos y agentes inteligentes.
- `README.md`: Este documento.

---

## **Colaboración y Documentación**

- Cada área/módulo debe tener su propio archivo de documentación técnica y funcional.
- Las tablas, procedimientos, triggers y vistas están detallados en `/database`.
- Los diagramas entidad-relación están disponibles en `/docs`.
- Los procesos de negocio y flujos se documentan conforme se migran desde AppSheet.

---

## **Próximos pasos**

1. **Definir la estructura de carpetas y archivos por módulo.**
2. **Documentar el modelo de datos y relaciones principales.**
3. **Iniciar la migración funcional de cada área, comenzando por las más críticas (ejemplo: Operaciones y Nómina).**
4. **Desarrollar la API y la interfaz en Flutter.**
5. **Integrar agentes de IA y automatizaciones.**

---

## **Contacto**

- [Equipo Logyser](mailto:info@logyser.com)
- [Repositorio Principal](https://github.com/Logyser/erp-logyser)

---

*Este proyecto está en desarrollo activo. Todos los aportes y sugerencias son bienvenidos.*
