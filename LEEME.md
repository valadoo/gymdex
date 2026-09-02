# GYMDEX

Web de objetivos diarios de gimnasio con temática Pokémon. Pensada para móvil.

---

## Cómo funciona

### Los 7 objetivos y el rango del día

| Objetivos cumplidos | Rango | Color en el calendario |
|---|---|---|
| 1 o 2 | Poké Ball | Rojo |
| 3 o 4 | Super Ball | Azul |
| 5 | Ultra Ball | Amarillo |
| 6 o 7 | Master Ball | Morado |

Los siete objetivos, cada uno con su tipo Pokémon:

| Objetivo | Tipo |
|---|---|
| 💪 Entreno de fuerza | Lucha |
| 🏃 Entreno de carrera | Volador |
| 🏊 Entreno de natación | Agua |
| 🥗 Comer bien | Planta |
| 💊 Tomar suplementación | Veneno |
| 😴 Dormir +7 horas | Psíquico |
| 👟 +10.000 pasos | Tierra |

La Master Ball exige casi el día perfecto: 6 de 7. Si tocas `TASKS` para añadir o quitar
objetivos, revisa también los umbrales en `RANK_MIN`.

Al pulsar **LANZAR** se cierra el día, se lanza la ball con animación y aparece un Pokémon.
Un día cerrado ya no se puede modificar. Si se te olvida cerrar un día, aparece en
**Recompensas pendientes** y lo puedes lanzar más tarde.

### Qué Pokémon salen

Solo aparecen las **541 formas base**. Los otros **484 se consiguen evolucionando**, así que
la Pokédex no se completa solo con suerte: hace falta constancia para acumular caramelos.

Probabilidades reales (medidas con 40.000 tiradas por ball):

| Ball | Común | Poco común | Rara | Muy rara | Legendario | Mítico | Shiny |
|---|---|---|---|---|---|---|---|
| Poké | 72 % | 20 % | 6 % | 2 % | — | — | 1/350 |
| Super | 45 % | 25 % | 18 % | 12 % | — | — | 1/220 |
| Ultra | 20 % | 22 % | 22 % | 32 % | 4 % | — | 1/130 |
| Master | 5 % | 10 % | 18 % | 45 % | 18 % | 4 % | 1/60 |

Los legendarios y míticos **solo salen con Ultra Ball o Master Ball**. La aparición es
aleatoria dentro de cada nivel de rareza, sin ningún orden de Pokédex.

### Caramelos y evolución

Cerrar un día da `objetivos × 5` caramelos, con multiplicador por racha:

- Menos de 7 días seguidos: x1
- 7 días o más: x1,5
- 30 días o más: x2
- Día Master Ball (6 o 7 objetivos): +10 extra

Los días guardados antes de añadir un objetivo se rellenan solos con la casilla nueva a cero:
no se pierde nada, pero sus rangos se recalculan con la escala actual, así que un día de 4
objetivos que antes era Master Ball ahora sale como Super Ball.

Los repetidos dan caramelos según su rareza (de 3 a 50, x3 si es shiny). Evolucionar cuesta
**25 caramelos** a la primera etapa y **100** a la segunda, x3 si es legendario o mítico.

Cuanto más constante seas, antes evolucionan. Los Pokémon con varias ramas (Eevee tiene 8)
te dejan elegir cuál. Un shiny sigue siendo shiny al evolucionar.

### Monsters

Cada día tiene su contador con **+** y **−**. En el calendario:
punto **verde** si tomaste 1, punto **rojo** si tomaste 2 o más. El total acumulado sale en
las estadísticas. No afecta a las recompensas, solo lo registra.

### Cuentas

Al entrar por primera vez creas una cuenta con tu nombre. **La foto de perfil es una medalla
de gimnasio elegida al azar** entre las 72 de las 9 generaciones (Kanto a Paldea, incluidos los
Cristales Z de Alola). Están dibujadas como SVG en `js/badges.js`, no son imágenes: no pesan
nada y se ven nítidas a cualquier tamaño. Puedes darle al dado hasta que salga una que te
guste, y cambiarla después desde la ficha de perfil.

**La sesión se guarda.** Cierras el navegador, vuelves y entras directo sin identificarte. Solo
te vuelve a preguntar si le das a *Cerrar sesión* o a *Cambiar de cuenta*.

Puedes tener **varias cuentas en el mismo dispositivo**, cada una con su Pokédex, su caja y su
calendario, completamente separadas. Opcionalmente le pones un **PIN de 4 dígitos** a una
cuenta; se guarda como hash SHA-256, nunca en claro. Aun así es un cierre para miradas
curiosas, no seguridad de verdad: quien tenga el móvil desbloqueado y sepa abrir las
herramientas del navegador puede saltárselo.

Todo esto es **local a este dispositivo**. No hay servidor: si quieres la misma cuenta en el
móvil y en el ordenador haría falta montarlo con PHP y MySQL en un hosting.

Toca tu medalla, arriba a la izquierda, para abrir la ficha de perfil.

### Peso

La pestaña **Peso** tiene arriba un **"Pesas como un…"** con el sprite y el nombre de un Pokémon
de peso parecido al tuyo, elegido entre los 25 más cercanos. **Cambia cada día** pero es el
mismo durante todo el día (se elige con un hash de la fecha, no al azar en cada carga). Con
79,4 kg salen cosas como Kommo-o, Carkol, Torkoal o Zoroark; en 30 días verás unos 18
Pokémon distintos.

Debajo, la **gráfica** de cómo va variando tu peso, con la diferencia respecto a la última
pesada y respecto a la primera. Y el historial completo, donde puedes borrar registros sueltos.

**Cuándo te lo pide:**

- La primera vez que entras con una cuenta nueva.
- Después, **una vez por semana, en un día y una hora que cambian cada vez**: entre 5 y 9 días
  tras la última pesada (7,2 de media), a una hora aleatoria entre las 9 y las 21. Con el
  tiempo va cayendo en los siete días de la semana.
- Si le das a *Ahora no*, te lo vuelve a pedir en 3 horas, no a la semana siguiente.
- Puedes anotarlo cuando quieras con el botón **ANOTAR PESO**.

Un aviso importante: esto es una web, no una app nativa. **No te puede avisar con el móvil
guardado en el bolsillo**; la pregunta te sale la próxima vez que abras GYMDEX después de la
hora que le tocaba. Para notificaciones de verdad haría falta una app instalada.

Solo se guarda un peso por día: si lo anotas dos veces el mismo día, se queda el último.

### Copia de seguridad

Los datos viven en el `localStorage` del navegador. Si borras datos de navegación o cambias
de móvil, **se pierden**. En la ficha de perfil (tu medalla, arriba a la izquierda) tienes
**Exportar** (descarga un `.json`) e **Importar**. Hazlo cada pocas semanas.

---

## Publicar en GitHub Pages

Desde esta carpeta:

```bash
git init && git add -A && git commit -m "GYMDEX inicial"
```

Crea un repositorio vacío en github.com (por ejemplo `gymdex`), y luego:

```bash
git remote add origin https://github.com/TU-USUARIO/gymdex.git && git branch -M main && git push -u origin main
```

En el repo: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.

En un par de minutos estará en `https://TU-USUARIO.github.io/gymdex/`.
### Instalarla en el móvil

**iPhone**: ábrela en **Safari** (con Chrome no aparece la opción), toca *Compartir* y luego
*Añadir a pantalla de inicio*. Queda con el icono de Snorlax y el nombre GYMDEX, y al abrirla
va a pantalla completa, sin barra de direcciones.

**Android**: Chrome ofrece *Instalar aplicación* en su menú.

Para cambiar el icono, sustituye la imagen y regenera los tamaños:

```bash
powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1 -Origen "C:\ruta\a\tu\imagen.jpg"
```

Debe ser cuadrada (si no, se recorta por el centro). Genera los cuatro PNG de `icons/`
sobre fondo opaco, porque iOS no admite transparencia en el icono de inicio.

Para actualizarla más adelante: `git add -A && git commit -m "cambios" && git push`.

---

## Probar en local

```bash
node tools/serve.js
```

Y abre `http://localhost:5173`. Hace falta servidor: con doble clic sobre `index.html`
el navegador bloquea la carga de `data/pokemon.json`.

---

## Estructura

```
index.html           Pantalla de acceso + las 5 vistas: Hoy, Calendario, Peso, Caja, Pokédex
manifest.json        Nombre, colores e iconos para instalarla en el móvil
icons/               apple-touch-icon 180, icon-192, icon-512 y favicon
css/styles.css       Estilos (las balls están dibujadas en CSS, sin imágenes)
js/badges.js         Las 72 medallas de gimnasio en SVG, para las fotos de perfil
js/app.js            Toda la lógica (cuentas, sesión, capturas, evoluciones)
data/pokemon.json    1025 Pokémon: nombre en español, categoría, generación,
                     etapa evolutiva, evoluciones, rareza y peso (99 KB)
                     El peso (w) va en hectogramos: w:2350 son 235,0 kg
sprites/normal/      1025 sprites  ·  sprites/shiny/  1025 sprites  (6,1 MB)
tools/build-data.js  Regenera data/pokemon.json desde PokeAPI
tools/add-weights.js Añade el peso (campo w, en hectogramos) a data/pokemon.json
tools/get-sprites.js Descarga los sprites que falten
tools/make-icons.ps1 Regenera los iconos desde una imagen cuadrada
tools/serve.js       Servidor local de pruebas
```

### Datos guardados

Tres claves en `localStorage`:

```js
// 1. Las cuentas del dispositivo
"gymdex_accounts": [
  { id: "ac_k3x9", name: "Pablo", badge: "k3", pin: null, created: "2026-08-27" }
  //                              ^ id de medalla   ^ hash SHA-256 del PIN, o null
]

// 2. La sesión abierta (esto es lo que evita volver a identificarse)
"gymdex_session": "ac_k3x9"

// 3. La partida, una clave por cuenta
"gymdex_save_ac_k3x9": {
  v: 1,
  candy: 0,              // caramelos
  uid: 1,                // contador de individuos de la caja
  monstersTotal: 0,
  days: { "2026-08-27": { t: [1,0,1,1,0,0,1], m: 1, cl: 1 } },
  //       fecha local     t = los 7 objetivos, m = monsters, cl = día cerrado
  box:  [ { u: 1, i: 25, sh: 0, d: "2026-08-27" } ],
  //        u = id único, i = nº Pokédex, sh = shiny, d = fecha de captura
  dex:  { "25": { c: 1, s: 0 } },
  //              c = normal conseguido, s = shiny conseguido
  weights: [ { d: "2026-08-27", kg: 78.5 } ],   // un registro por día
  nextWeigh: 1788134400000                      // cuándo toca pesarse (epoch ms)
}
```

Las fechas son siempre `YYYY-MM-DD` en hora local.

Si venías de una versión anterior a las cuentas, la clave `gymdex_v1` se convierte
automáticamente en una cuenta llamada *Entrenador* la primera vez que abres la app,
sin perder nada.

El guardado va con 120 ms de retraso para no escribir en cada toque, pero se fuerza
en cuanto la pestaña pasa a segundo plano (`visibilitychange` y `pagehide`), así que
bloquear el móvil justo después de marcar un objetivo no pierde el cambio.

---

## Cambiar cosas

- **Objetivos**: `TASKS` al principio de `js/app.js` (nombre, emoji, tipo, color).
- **Medallas**: `BADGES` en `js/badges.js`. Cada una es `{id, nombre, región, generación,
  silueta, emblema, [color, color]}`; las siluetas y emblemas son paths SVG en `B_SHAPES`
  y `B_ACCENTS`, en un lienzo de 100x100.
- **Probabilidades**: `WEIGHTS` y `SHINY_ODDS`.
- **Ritmo de caramelos**: `candyFor()` y `evoCost()`.
- **Colores**: variables `--pokeball`, `--superball`, `--ultraball`, `--masterball` en `css/styles.css`.

Los sprites vienen del repositorio [PokeAPI/sprites](https://github.com/PokeAPI/sprites) y los
datos de [PokeAPI](https://pokeapi.co). Pokémon es marca de Nintendo / Game Freak;
esto es un proyecto personal sin ánimo de lucro.
