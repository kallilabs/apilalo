# Apílalo

Juego de apilar bloques con un solo toque. El mismo código sirve para la app de Android (con Capacitor) y para la versión web (GitHub Pages).

## Qué incluye

| Ruta | Para qué sirve |
|---|---|
| `src/game/engine.js` | Reglas del juego (cortes, perfectos, racha, velocidad). No toca DOM ni plataforma. |
| `src/game/renderer.js` | Dibujo isométrico en canvas y cámara. |
| `src/game/audio.js` | Efectos de sonido sintetizados (sin archivos de audio). |
| `src/challenge.js` | Enlaces `#reto-N-Nombre` y textos del reto. Funciones puras. |
| `src/share-card.js` | Imagen del reto de 1080 × 1920 (tamaño de estado de WhatsApp). |
| `src/platform.js` | **Único** módulo que distingue app nativa y navegador: almacenamiento, compartir, vibración y botón atrás. |
| `src/config.js` + `.env` | URL pública, enlace a Play y opción de pedir nombre. |
| `src/main.js` | Pantallas y conexión de todo lo anterior. |
| `tests/` | Pruebas de reglas y de enlaces (`node --test`, sin dependencias). |
| `android/` | Proyecto de Android Studio ya configurado (ícono, splash, orientación vertical, API 36). |
| `public/privacy.html` | Aviso de privacidad para la ficha de Play. |
| `store/` | Ícono 512, gráfico de funciones, capturas y textos de la ficha. |
| `.github/workflows/deploy-web.yml` | Publica la versión web en GitHub Pages en cada push a `main`. |

### Diferencias con la versión de claude.ai

- **Compartir:** en la app, "Compartir reto" abre el menú del sistema con la imagen y el mensaje en un solo paso. En WhatsApp puedes elegir "Mi estado" o un chat.
- **Récord:** se guarda con Capacitor Preferences, que es más confiable que `localStorage` dentro de la app.
- **Fuentes:** van incluidas, así que la app no necesita internet.
- **Vibración** en perfectos, cortes y al perder.
- **Botón atrás de Android:** cierra el panel de reto, después regresa al inicio y, desde el inicio, sale de la app.

## Requisitos

- Node.js 22 o más reciente.
- Android Studio reciente (ya incluye el JDK que necesita Gradle).
- Un teléfono Android con depuración USB, o el emulador de Android Studio.

## ID de la app

`com.kallilabs.apilalo`, ya configurado en `capacitor.config.json`, `android/app/build.gradle` (`applicationId` y `namespace`) y en el paquete de `MainActivity.java`. **No lo cambies después de publicar:** Google Play lo usa como identificador permanente. Las siguientes apps de Kalli Labs siguen el mismo patrón: `com.kallilabs.<nombre>`.

## Desarrollo

```bash
npm install
npm test          # pruebas de reglas y enlaces
npm run dev       # abre http://localhost:5173 (o la IP de tu red en el celular)
```

## Probar en Android

```bash
npm run android   # compila la web, la copia a android/ y abre Android Studio
```

En Android Studio, conecta tu teléfono y presiona **Run**. Después de cualquier cambio en `src/`, vuelve a correr `npm run sync`.

Revisa en el teléfono:

- [ ] "Compartir reto" abre el menú del sistema y WhatsApp recibe la imagen con el mensaje.
- [ ] En WhatsApp aparece "Mi estado".
- [ ] "Copiar mensaje" copia el texto; si el teléfono no lo permite, el mensaje aparece seleccionado para copiarlo a mano.
- [ ] Vibra en perfectos y al perder.
- [ ] El botón atrás funciona como se describe arriba.
- [ ] El marcador y el botón de sonido no quedan debajo de la barra de estado ni del notch.
- [ ] El récord se conserva al cerrar y volver a abrir la app.

## Generar el archivo para Play (AAB firmado)

1. En Android Studio: **Build → Generate Signed App Bundle or APK → Android App Bundle**.
2. Crea una llave nueva (*Create new…*). Guarda el archivo `.jks` y sus contraseñas fuera del repositorio (`.gitignore` ya los excluye) y en un lugar seguro.
3. Elige la variante `release`. El archivo queda en `android/app/release/app-release.aab`.
4. En Play Console activa **Play App Signing** (viene activado por defecto). La llave que creaste es la de *subida*: si la pierdes, Google puede restablecerla, pero el trámite tarda.

**En cada actualización** aumenta `versionCode` (1, 2, 3…) y `versionName` en `android/app/build.gradle`. Play rechaza un `versionCode` que ya subiste.

## Versión web en kallilabs.com

Ya está configurada:

- **Repositorio:** `github.com/kallilabs/apilalo` (público). Pages usa **GitHub Actions** como fuente.
- **Dirección:** `https://kallilabs.com/apilalo/`. El sitio de la organización (`kallilabs.github.io`) tiene el dominio propio, y los repositorios de cada app se publican debajo, en `kallilabs.com/<repo>`.
- **Aviso de privacidad para Play:** `https://kallilabs.com/apilalo/privacy.html`.
- Cada push a `main` corre las pruebas, compila y publica. No hay que hacer nada más.

### Primer push (desde tu computadora)

Configura el correo anónimo de GitHub solo para este repositorio, para que tus commits no expongan tu correo personal:

```bash
cd apilalo
git init -b main
git config user.name "Manuel Soberano"
git config user.email "29130627+jmanuelsoberano@users.noreply.github.com"
git add .
git commit -m "Initial commit: Apílalo 1.0.0"
git remote add origin https://github.com/kallilabs/apilalo.git
git push -u origin main
```

Con la URL configurada, WhatsApp muestra una vista previa con la imagen `public/og-image.png` cuando alguien pega el enlace.

## Publicar en Google Play

1. **Cuenta de desarrollador:** pago único de US$25, identificación oficial y verificación con un dispositivo Android.
2. **Crear la app** en Play Console: idioma español (Latinoamérica), tipo *Juego*, *Gratis*.
3. **Contenido de la app:** aviso de privacidad, anuncios (no tiene), clasificación de contenido, público objetivo y seguridad de los datos. Las respuestas sugeridas están en `store/ficha-play.md`.
4. **Ficha:** textos, ícono, gráfico de funciones y capturas de `store/`.
5. **Prueba cerrada:** sube el AAB a *Pruebas → Prueba cerrada* e invita al menos a **12 testers con cuenta de Google**. Deben quedarse inscritos **14 días seguidos**. Es el requisito para cuentas personales creadas después del 13 de noviembre de 2023.
6. **Solicitar acceso a producción** desde el Panel. Google suele responder en 7 días o menos.

### Público objetivo y niños

Si van a jugarla menores de 13 años, declara esos rangos de edad. Así aplica la política de Familias de Google Play. Esta versión no tiene anuncios, no usa internet y no envía datos, así que cumplir es sencillo. Si después quieres poner anuncios, solo puedes usar SDKs certificados para Familias y sin anuncios personalizados.

El campo "Tu nombre" es opcional y el nombre nunca sale del teléfono, salvo en el mensaje que el jugador decide enviar. Si prefieres que la app no pida ningún dato, compila con `VITE_ALLOW_PLAYER_NAME=false` en `.env`.

## Lo que no se probó al preparar este proyecto

- **No se compiló el APK ni el AAB:** en el entorno donde se armó el proyecto no había Android SDK ni acceso a los repositorios de Gradle. La primera compilación será en tu Android Studio.
- **Sí se probó:** las pruebas unitarias, la compilación web y una partida completa en Chromium (tocar, cortar, perder, reto, imagen, compartir y enlace de reto), sin errores en consola.
- El menú de compartir nativo, la vibración y los márgenes seguros solo se pueden comprobar en un teléfono real. Usa la lista de "Probar en Android".

## Íconos

`store/icon-source-1024.png` es la imagen de origen. Si cambias el diseño, regenera los íconos en Android Studio con **File → New → Image Asset**: capa de primer plano con la torre y capa de fondo con el degradado.
