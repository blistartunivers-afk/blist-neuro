# blist-neuro

**Cuaderno de Campo · El Sistema Nervioso**

Curso interactivo y gratuito sobre el sistema nervioso humano — 11 módulos, diagramas SVG animados, cuestionarios con niveles de dificultad, progreso guardado en el navegador, y un asistente IA personal integrado para resolver dudas mientras estudiás.

🔗 **En vivo:** https://blistartunivers-afk.github.io/blist-neuro/

## ✨ Qué tiene

- **11 módulos**: introducción, neurona, glía, sinapsis, neurotransmisores, SNC, SNP, plasticidad, arco reflejo, trastornos, evaluación final.
- **Diagramas SVG animados** — potencial de acción dibujándose en vivo, regiones del encéfalo interactivas, capas del SNP activables por botón.
- **Cuestionarios por módulo** con preguntas marcadas por dificultad (`aplicado`, `avanzado`) y feedback inmediato, más un examen final que combina todo el temario.
- **Progreso persistente** vía `localStorage` — no requiere cuenta ni backend.
- **Asistente IA flotante** (🧠 abajo a la derecha): el usuario conecta su propia API key gratuita de [Ollama Cloud](https://ollama.com/settings/keys), elige un modelo, y chatea con un asistente experto *solo* en sistema nervioso. La key vive únicamente en el navegador del usuario — nunca se sube al repo ni pasa por ningún servidor propio.

## 🛠️ Stack

Un solo archivo (`index.html`) — HTML + CSS + JS vanilla, sin build, sin dependencias externas más que Google Fonts y la API de Ollama Cloud (llamada directo desde el navegador del usuario). Pensado para servirse como página estática desde GitHub Pages.

## 🚀 Desarrollo

Como es un único archivo estático, para editarlo alcanza con abrir `index.html` y modificarlo directamente. Para probar el asistente IA en local hace falta servirlo por `http`/`https` real:

```bash
python3 -m http.server 8000
```

Luego entra a `http://localhost:8000`. Abrirlo como `file://` puede bloquear las llamadas a la API de Ollama Cloud por política de origen.

## ✅ Roadmap

- [x] Asistente IA flotante con Ollama Cloud
- [x] Deploy en GitHub Pages (COMPLETADO - Agosto 2026)
- [ ] Completar todos los módulos con contenido
- [ ] Visualizaciones 2D/3D (Three.js) para neurona y sinapsis
- [ ] Quiz completos y sistema de puntuación avanzado
- [ ] Más actividades interactivas desplegables por módulo

## 📝 Créditos

Curso creado por **Estiven (Blist)**, parte del ecosistema **BLIST**.

---

**Estado:** ✅ En vivo y funcionando | Última actualización: Agosto 2026
