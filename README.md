# 🤖 Eminus Monitor - GitHub Actions

Bot automatizado que monitorea actividades de Eminus UV y envía notificaciones a Discord.

## 📋 Características

- ✅ Detección automática de nuevas actividades
- ⏰ Recordatorios antes del vencimiento (configurable)
- 🔔 Notificaciones a Discord con embeds
- 🔄 Ejecución automática cada 5 minutos
- 💾 Persistencia de datos entre ejecuciones

## 🚀 Configuración

### 1. Fork o crea el repositorio

Crea un nuevo repositorio en GitHub con los archivos proporcionados.

### 2. Configurar Secrets

Ve a **Settings** → **Secrets and variables** → **Actions** y agrega:

| Secret | Descripción | Ejemplo |
|--------|-------------|---------|
| `USERNAMEEMINUS` | Usuario de Eminus UV | tu_usuario |
| `PASSWORD` | Contraseña de Eminus | tu_contraseña |
| `DISCORD_WEBHOOK_URL` | URL del webhook de Discord | https://discord.com/api/webhooks/... |

### 3. Habilitar GitHub Actions

1. Ve a la pestaña **Actions**
2. Si aparece un mensaje, haz clic en **"I understand my workflows, go ahead and enable them"**

### 4. Configurar permisos del workflow

Ve a **Settings** → **Actions** → **General**:
- En "Workflow permissions", selecciona **"Read and write permissions"**
- Marca **"Allow GitHub Actions to create and approve pull requests"**
- Guarda los cambios

### 5. Crear el webhook de Discord

1. Ve a tu servidor de Discord
2. Selecciona el canal donde quieres recibir notificaciones
3. Configuración del canal → Integraciones → Webhooks
4. Crea un nuevo webhook y copia la URL

### 6. Ejecutar manualmente (primera vez)

1. Ve a **Actions** → **Eminus Monitor**
2. Haz clic en **"Run workflow"**
3. Verifica que funcione correctamente en los logs

## ⚙️ Personalización

### Cambiar frecuencia de ejecución

Edita `.github/workflows/eminus-monitor.yml`:

```yaml
on:
  schedule:
    # Cada 5 minutos (recomendado)
    - cron: '*/5 * * * *'
    
    # Cada 15 minutos
    # - cron: '*/15 * * * *'
    
    # Cada hora
    # - cron: '0 * * * *'
```

### Ajustar tiempo de recordatorios

Edita `index.js`:

```javascript
const MINUTOS_ANTES = 10; // Cambiar a 30, 60, etc.
```

### Filtrar cursos por antigüedad

Edita `index.js`:

```javascript
const MESES_LIMITE = 6; // Cambiar a 3, 12, etc.
```

## 📊 Monitoreo

### Ver logs de ejecución

1. Ve a **Actions**
2. Selecciona la ejecución más reciente
3. Haz clic en el job **"check-activities"**
4. Expande los pasos para ver detalles

### Verificar datos guardados

Los archivos `eminus_tasks.json` y `reminders_sent.json` se guardan automáticamente en el repositorio.

## 🔍 Solución de problemas

### El workflow no se ejecuta automáticamente

- Verifica que los permisos estén correctamente configurados
- Asegúrate de que el repositorio no esté en modo privado sin GitHub Actions habilitado

### Error de autenticación

- Verifica que los secrets estén correctamente configurados
- Confirma que tus credenciales de Eminus sean correctas

### No se guardan los datos

- Verifica que el workflow tenga permisos de escritura
- Revisa los logs del paso "Commit and push changes"

### No llegan notificaciones a Discord

- Verifica que el webhook URL sea correcto
- Confirma que el webhook tenga permisos en el canal

## 📝 Notas importantes

- ⚠️ **Seguridad**: Nunca subas tus credenciales al repositorio
- 🔄 **Límites**: GitHub Actions tiene límites de ejecución mensuales
- 🕒 **Zona horaria**: Configurado para America/Mexico_City
- 💾 **Datos**: Los archivos JSON se actualizan automáticamente

## 📄 Licencia

MIT