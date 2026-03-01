const axios = require("axios");
const fs = require("fs");
const path = require("path");

// --- CONFIGURACIÓN ---
const USERNAME = process.env.USERNAMEEMINUS;
const PASSWORD = process.env.PASSWORD;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;


const DB_FILE = path.join(__dirname, "eminus_tasks.json");
const REMINDERS_FILE = path.join(__dirname, "reminders_sent.json");
const MESES_LIMITE = 6;
const MINUTOS_ANTES = 60;

// --------------------------------------------------

async function sendDiscordAlert(curso, tarea, fechaFin, color = 0x3498db, isReminder = false) {
  if (!DISCORD_WEBHOOK_URL) {
    return;
  }

  const title = isReminder ? "⏰ RECORDATORIO: Actividad por Vencer" : "🆕 Nueva Actividad en Eminus";
  const description = isReminder
    ? `⚠️ La actividad **${tarea}** del curso **${curso}** está por vencer en menos de ${MINUTOS_ANTES} minutos`
    : `Se ha detectado una nueva tarea para el curso **${curso}**`;

  const payload = {
    embeds: [
      {
        title,
        description,
        color,
        fields: [
          { name: "📝 Tarea", value: tarea, inline: false },
          { name: "📅 Fecha de Entrega", value: fechaFin, inline: true },
          ...(isReminder ? [{ name: "⚠️ Estado", value: "**¡URGENTE! Entrega pronto**", inline: true }] : [])
        ],
        footer: { text: "Bot de Monitoreo Eminus UV - GitHub Actions" },
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, payload);
  } catch (err) {
    console.error("Error en Discord:", err.response?.data || err.message);
  }
}

function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  const opciones = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City'
  };

  return fecha.toLocaleDateString('es-MX', opciones);
}

function esCursoReciente(fechaCreacion, mesesLimite = 6) {
  const fechaCurso = new Date(fechaCreacion);
  const fechaLimite = new Date();
  fechaLimite.setMonth(fechaLimite.getMonth() - mesesLimite);

  return fechaCurso >= fechaLimite;
}

function calcularMinutosRestantes(fechaTerminoStr) {
  const fechaTermino = new Date(fechaTerminoStr);
  const ahora = new Date();
  const diff = fechaTermino - ahora;
  return Math.floor(diff / (1000 * 60));
}

function debeEnviarRecordatorio(fechaTerminoStr, minutos = MINUTOS_ANTES) {
  const minutosRestantes = calcularMinutosRestantes(fechaTerminoStr);
  return minutosRestantes > 0 && minutosRestantes <= minutos;
}

async function getToken() {
  try {
    const url = "https://eminus.uv.mx/eminusapi/api/auth";

    const payload = {
      username: USERNAME,
      password: PASSWORD
    };


    const res = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": "https://eminus.uv.mx",
        "Referer": "https://eminus.uv.mx/"
      },
      timeout: 15000,
      validateStatus: function (status) {
        return status < 500;
      }
    });

    console.log(`   Status: ${res.status}`);

    if (res.status === 403) {
      console.error("Error 403: Acceso prohibido");
      console.error("   Verifica tus credenciales");
      return null;
    }

    if (res.status === 401) {
      console.error("Error 401: Credenciales incorrectas");
      console.error("   Usuario o contraseña inválidos");
      return null;
    }

    if (res.status === 200 || res.status === 201) {
      const token = res.data?.accessToken || res.data?.token;
      if (token) {
        console.log("✅ Login exitoso");
        return token;
      } else {
        console.error("Error: Token no encontrado en respuesta");
        console.error("   Respuesta:", JSON.stringify(res.data).substring(0, 200));
        return null;
      }
    }

    console.error("Error inesperado:", res.status);
    console.error("   Respuesta:", JSON.stringify(res.data).substring(0, 200));
    return null;

  } catch (err) {
    console.error("Error en Login:", err.message);
    if (err.response) {
      console.error("   Status:", err.response.status);
      console.error("   Data:", JSON.stringify(err.response.data).substring(0, 200));
    }
    return null;
  }
}

async function checkActivities() {
  const ahora = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🤖 Ejecutando revisión: ${ahora}`);
  console.log("=".repeat(60));

  const token = await getToken();
  if (!token) {
    console.error("Error: No se pudo obtener el token");
    process.exit(1);
  }

  // Cargar DB local
  let vistas = [];
  if (fs.existsSync(DB_FILE)) {
    vistas = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    console.log(`Tareas vistas previamente: ${vistas.length}`);
  }

  // Cargar recordatorios enviados
  let recordatoriosEnviados = [];
  if (fs.existsSync(REMINDERS_FILE)) {
    recordatoriosEnviados = JSON.parse(fs.readFileSync(REMINDERS_FILE, "utf8"));
    console.log(`Recordatorios enviados: ${recordatoriosEnviados.length}`);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin": "https://eminus.uv.mx",
    "Referer": "https://eminus.uv.mx/"
  };

  let nuevasVistas = [...vistas];
  let nuevosRecordatorios = [...recordatoriosEnviados];
  let actividadesNuevas = 0;
  let recordatoriosEnviados_count = 0;

  try {
    const cursosRes = await axios.get(
      "https://eminus.uv.mx/eminusapi8/api/Course/getAllCourses",
      { headers }
    );

    const todosCursos = cursosRes.data?.contenido || [];
    const cursosRecientes = todosCursos.filter(item => {
      const fechaCreacion = item.curso?.fechaCreacion;
      if (!fechaCreacion) return false;
      return esCursoReciente(fechaCreacion, MESES_LIMITE);
    });

    console.log(`Cursos activos: ${cursosRecientes.length}/${todosCursos.length}`);

    for (const item of cursosRecientes) {
      const curso = item.curso;
      const idCurso = curso.idCurso;
      const nombreCurso = curso.nombre;

      let actRes;

      try {
        actRes = await axios.get(
          `https://eminus.uv.mx/eminusapi8/api/Activity/getActividadesEstudiante/${idCurso}`,
          { headers }
        );

      } catch (err) {

        // 👇 Si es 404 → solo log y continuar con siguiente curso
        if (err.response?.status === 404) {
          console.log(`Curso sin actividades (404): ${nombreCurso}`);
          continue;
        }

        // 👇 Si API regresa error custom con codigo 404
        if (err.response?.data?.codigo === 404) {
          console.log(`Curso sin actividades: ${nombreCurso}`);
          continue;
        }

        // 👇 Otro error real → sí lo lanzamos
        console.error(`Error obteniendo actividades de ${nombreCurso}:`,
          err.response?.data || err.message
        );

        continue; // opcional: o throw err si quieres romper ejecución
      }

      console.log(
        `   📖 Curso: ${nombreCurso} - Actividades encontradas: ${actRes.data?.contenido?.length || 0
        }`
      );

      for (const act of actRes.data?.contenido || []) {
        const idAct = String(act.idActividad);
        const estadoEntrega = act.estadoEntrega;

        // NUEVAS
        if (!vistas.includes(idAct)) {
          const fechaFormato = formatearFecha(act.fechaTermino);

          await sendDiscordAlert(
            nombreCurso,
            act.titulo,
            fechaFormato,
            0x3498db,
            false
          );

          nuevasVistas.push(idAct);
          actividadesNuevas++;
        }

        // RECORDATORIOS
        if (estadoEntrega === 1 && debeEnviarRecordatorio(act.fechaTermino, MINUTOS_ANTES)) {
          const recordatorioKey = `${idAct}_reminder`;

          if (!recordatoriosEnviados.includes(recordatorioKey)) {
            const minutosRestantes = calcularMinutosRestantes(act.fechaTermino);
            const fechaFormato = formatearFecha(act.fechaTermino);

            await sendDiscordAlert(
              nombreCurso,
              act.titulo,
              fechaFormato,
              0xff6b6b,
              true
            );

            nuevosRecordatorios.push(recordatorioKey);
            recordatoriosEnviados_count++;

          }
        }
      }
    }



    fs.writeFileSync(DB_FILE, JSON.stringify(nuevasVistas, null, 2));
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(nuevosRecordatorios, null, 2));


  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
    process.exit(1);
  }
}

// --- INICIAR ---
console.log("Bot de Eminus para GitHub Actions");
console.log(`Recordatorios: ${MINUTOS_ANTES} minutos antes del vencimiento\n`);

checkActivities().catch(err => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});