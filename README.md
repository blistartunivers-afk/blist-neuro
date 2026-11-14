<div align="center">

# 🧠 BLIST-NEURO

**Cuaderno de Campo · El Sistema Nervioso**

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen?style=flat-square&logo=github)](https://blistartunivers-afk.github.io/blist-neuro/docs/course/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Stack: Vanilla JS](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20JS-yellow?style=flat-square&logo=javascript)](https://developer.mozilla.org/)

*Curso interactivo y gratuito sobre el sistema nervioso humano — 11 módulos, diagramas SVG animados, cuestionarios interactivos y asistente IA integrado.*

</div>

---

## ✨ Características Principales

- **📚 11 Módulos Especializados**: Introducción, neurona, glía, sinapsis, neurotransmisores, SNC, SNP, plasticidad, arco reflejo, trastornos y evaluación final.
- **🎨 Diagramas SVG Animados**: Potencial de acción en tiempo real, regiones del encéfalo interactivas y capas del SNP activables por componentes.
- **📝 Evaluaciones Dinámicas**: Cuestionarios por módulo con marcas de dificultad (`aplicado`, `avanzado`), retroalimentación instantánea y examen final integrativo.
- **💾 Persistencia Local**: Progreso guardado automáticamente mediante `localStorage` (sin necesidad de cuentas ni servidores backend).
- **🤖 Asistente IA Integrado**: Asistente inteligente flotante conectable mediante API key de Ollama Cloud para tutorías personalizadas en tiempo real.

---

## 🛠️ Stack Tecnológico

Proyecto diseñado bajo arquitectura monolítica ligera de alto rendimiento:
- **Frontend**: HTML5, CSS3 y JavaScript (ES6+ sin dependencias de frameworks externos).
- **Tipografía**: Google Fonts (Inter / Fira Code).
- **IA**: Ollama Cloud API (integración nativa desde el navegador).

---

## 🚀 Puesta en Marcha (Desarrollo Local)

Dado que es una aplicación web estática autocontenido, puedes servirla localmente usando cualquier servidor HTTP para evitar restricciones de políticas de origen (`CORS`) con la API de Ollama:

```bash
# Clonar el repositorio
git clone https://github.com/blistartunivers-afk/blist-neuro.git
cd blist-neuro

# Levantar servidor local (Python 3)
python3 -m http.server 8000
```

Luego abre tu navegador en: `http://localhost:8000/docs/course/`

---

## 🗺️ Roadmap

- [x] Asistente IA flotante con soporte para Ollama Cloud
- [x] Despliegue oficial en GitHub Pages
- [ ] Ampliación de contenido para los 11 módulos principales
- [ ] Visualizaciones avanzadas 2D/3D (Three.js) para neuronas y sinapsis
- [ ] Sistema de puntuación y analíticas de progreso avanzadas
- [ ] Módulos interactivos desplegables adicionales

---

## 📄 Créditos y Licencia

Creado con pasión por **Estiven (Blist)** como parte del ecosistema educativo **BLIST**.

Distribuido bajo la licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.

---
**Estado:** 🟢 Activo y en producción | *Ecosistema BLIST · 2026*
