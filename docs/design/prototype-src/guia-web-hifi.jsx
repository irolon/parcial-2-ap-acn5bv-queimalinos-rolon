// Guía web hi-fi — contenido documental por pantalla

const GW_ALUMNO = [
  {
    n: 'A1', t: 'Hoy · Rutina del día', c: () => <AW_Hoy/>,
    d: 'Pantalla de entrada del alumno en escritorio. Responde qué entreno hoy.',
    f: [
      ['Rutina del día resuelta por el sistema', 'Según el día de la semana y la rutina asignada, la aplicación decide qué toca. El alumno no elige ni busca.'],
      ['Tabla completa de ejercicios', 'Series, repeticiones y carga sugerida por ejercicio, aprovechando un ancho que en el teléfono no existe.'],
      ['Columna de contexto', 'Semana en curso, nota del entrenador y próximo turno, visibles sin desplazar.'],
      ['Un solo CTA primario', 'El botón de comenzar domina la jerarquía; el resto de la pantalla es información.'],
    ],
    tech: 'Resuelve el día calendario contra los días asignados de la rutina activa. Comparte endpoint con la aplicación móvil: cambia la disposición, no el modelo de datos.'
  },
  {
    n: 'A2', t: 'Sesión activa', c: () => <AW_Sesion/>,
    d: 'La sesión de entrenamiento adaptada al escritorio, para quien entrena en casa.',
    f: [
      ['Ejercicio actual a la izquierda', 'Carga y repeticiones en cifras de 64 px con botones de ajuste rápido. El registro sigue siendo de dos pasos.'],
      ['Registro de series a la derecha', 'Las series completadas quedan a la vista junto a la que está en curso, sin cambiar de pantalla.'],
      ['Temporizador siempre visible', 'En escritorio hay espacio para mostrarlo en permanente, en lugar de ocupar toda la pantalla como en el teléfono.'],
      ['Carga sugerida antes del registro', 'La propuesta del sistema aparece destacada para aceptarla o ajustarla.'],
      ['Progreso del entrenamiento', 'Los seis ejercicios de la sesión y el tiempo transcurrido, siempre en la cabecera.'],
    ],
    tech: 'Cada serie confirmada se registra con peso, repeticiones y marca de tiempo. La sugerencia surge de la última serie del mismo ejercicio más la progresión definida por el entrenador.'
  },
  {
    n: 'A3', t: 'Mi progreso', c: () => <AW_Progreso/>,
    d: 'El tablero de datos del alumno: la pantalla que más gana al pasar a escritorio.',
    f: [
      ['Cuatro indicadores de cabecera', 'Sesiones del mes, racha, récords y volumen total, cada uno con su contexto.'],
      ['Progresión de cargas comparada', 'Los tres levantamientos principales superpuestos en un mismo gráfico, algo que en el teléfono obliga a alternar.'],
      ['Detalle por ejercicio', 'Valor actual, curva y porcentaje de mejora para cada movimiento.'],
      ['Peso corporal y medidas', 'Evolución antropométrica con las variaciones del período.'],
      ['Logros obtenidos', 'Rachas y récords presentes, sin desplazar a los datos.'],
    ],
    tech: 'Series históricas agregadas por ejercicio y semana. El estimado de una repetición máxima se calcula sobre la mejor serie del período.'
  },
  {
    n: 'A4', t: 'Asistente IA', c: () => <AW_Chat/>,
    d: 'Las consultas al asistente, con el historial navegable que en el teléfono no cabe.',
    f: [
      ['Consultas guardadas', 'El alumno recupera lo que ya preguntó en lugar de volver a preguntarlo.'],
      ['Contexto de sesión explícito', 'La conversación indica sobre qué rutina, ejercicio y serie está consultando.'],
      ['Respuestas accionables', 'Las alternativas llegan como opciones aplicables a la rutina, con su carga equivalente.'],
      ['Consultas frecuentes precargadas', 'Atajos a las preguntas típicas, para no escribir desde cero.'],
    ],
    tech: 'Webhook a un flujo de n8n que recibe el contexto de sesión y la consulta, consulta la biblioteca de ejercicios y devuelve la respuesta junto con alternativas estructuradas.'
  },
  {
    n: 'A5', t: 'Mi perfil', wh: 840, c: () => <AW_Perfil/>,
    d: 'Los datos del alumno, sus medidas y la configuración de la cuenta.',
    f: [
      ['Datos personales editables', 'Nombre, contacto, objetivo y frecuencia comprometida.'],
      ['Medidas con su variación', 'Seis métricas antropométricas y el registro de una nueva medición.'],
      ['Su entrenadora a la vista', 'Quién lo entrena y acceso directo al mensaje, sin buscar en otra sección.'],
      ['Configuración de la cuenta', 'Contraseña, notificaciones, modo sin conexión y exportación de datos.'],
    ],
    tech: 'Las mediciones se guardan con fecha para construir las curvas de evolución. El alumno edita solo sus propios datos; la rutina la modifica el entrenador.'
  },
];

const GW_PT = [
  {
    n: 'E1', t: 'Dashboard', wh: 930, c: () => <PTDashboard/>,
    d: 'Pantalla de entrada del entrenador. Responde qué necesita atención hoy.',
    f: [
      ['Indicadores de cartera', 'Alumnos activos, sesiones de la semana, adherencia general e inactivos, cada uno con su variación.'],
      ['Gráfico de actividad', 'Sesiones completadas por día, con selección de período.'],
      ['Alertas de inactividad', 'Alumnos que dejaron de entrenar, ordenados por gravedad. Evita que alguien se pierda en silencio.'],
      ['Actividad reciente', 'Quién entrenó, con qué rutina y con qué esfuerzo percibido. El punto verde marca sesión en curso.'],
    ],
    tech: 'Agregaciones por entrenador. La adherencia se calcula como sesiones completadas sobre planificadas del mes; las alertas se derivan de los días desde la última sesión, con umbrales a siete y nueve días.'
  },
  {
    n: 'E2', t: 'Panel de alumnos', c: () => <PTPanelAlumnos/>,
    d: 'La cartera completa: cómo viene cada alumno sin abrir uno por uno.',
    f: [
      ['Grilla de tarjetas', 'Nombre, objetivo, frecuencia y última sesión de cada alumno, con indicador de sesión en curso.'],
      ['Adherencia por alumno', 'Barra de cumplimiento con código de color, para detectar el abandono antes de que sea definitivo.'],
      ['Filtros y ordenamiento', 'Por objetivo, por estado y por última sesión.'],
      ['Alumnos en riesgo señalados', 'Borde y color propios, de modo que salten sin tener que leer la grilla entera.'],
      ['Alta desde el mismo lugar', 'El acceso al alta por código QR está siempre disponible en la cabecera.'],
    ],
    tech: 'Listado paginado con filtros. La adherencia se precalcula por alumno y se refresca al cerrarse cada sesión, para no recalcularla en cada carga de la grilla.'
  },
  {
    n: 'E3', t: 'Perfil del alumno', c: () => <PTPerfil/>,
    d: 'La ficha completa en un solo panel: lo que el entrenador necesita antes de ajustar un plan.',
    f: [
      ['Antropometría con evolución', 'Peso, talla, composición, IMC y circunferencias, cada uno con su variación.'],
      ['Evolución de cargas clave', 'Tres levantamientos principales superpuestos en un gráfico de doce semanas.'],
      ['Indicadores de compromiso', 'Sesiones del mes sobre planificadas, racha, esfuerzo promedio y récords.'],
      ['Historial con notas', 'Cada sesión con duración, esfuerzo percibido, marca de récord y la nota del entrenador.'],
      ['Acciones sobre el alumno', 'Mensaje directo y asignación de rutina desde la misma pantalla.'],
    ],
    tech: 'El panel único evita pestañas porque el entrenador necesita cruzar medidas con cargas de un vistazo. Las mediciones se cargan desde cualquiera de las dos aplicaciones.'
  },
  {
    n: 'E4', t: 'Crear rutina', c: () => <PTCrearRutina/>,
    d: 'El armado de rutinas en formato de tabla, el mismo al que el entrenador ya está acostumbrado.',
    f: [
      ['Tabla editable por ejercicio', 'Series, repeticiones, descanso, esfuerzo objetivo y nota, todo en la misma fila.'],
      ['Biblioteca lateral filtrable', 'Los ejercicios se agregan sin salir del editor, filtrados por grupo muscular.'],
      ['Partir de una plantilla', 'La rutina arranca de una plantilla reutilizable y se ajusta por alumno.'],
      ['Metadatos de la rutina', 'Días asignados, duración estimada y nivel, que gobiernan qué ve el alumno cada día.'],
      ['Guardado automático', 'El borrador se guarda solo; asignar al alumno es un paso aparte y explícito.'],
    ],
    tech: 'Una rutina es una cabecera más las filas de ejercicios con orden, series, rango de repeticiones y descanso. Asignar crea un vínculo con vigencia, de modo que el historial anterior no se altera.'
  },
  {
    n: 'E5', t: 'Generar QR de invitación', c: () => <PTGenerarQR/>,
    d: 'El momento diferencial del producto: dar de alta un alumno en menos de un minuto.',
    f: [
      ['Datos que el entrenador ya conoce', 'Nombre, contacto, objetivo, frecuencia y medidas básicas. El alumno no vuelve a tipearlos.'],
      ['Plantilla inicial opcional', 'Se puede asignar ya un plan, así el alumno entra y tiene qué entrenar el primer día.'],
      ['Código generado al instante', 'Con la marca al centro y la dirección de respaldo visible por si la cámara falla.'],
      ['Envío por mensajería', 'Se comparte por el canal donde la relación con el alumno ya existe.'],
      ['Qué ve el alumno', 'La pantalla explica los cuatro pasos del otro lado, para que el entrenador sepa qué está enviando.'],
    ],
    tech: 'La invitación devuelve un token firmado con los datos de precarga y su vencimiento a 48 horas. El código se genera en el cliente sobre ese token y queda marcado como usado al consumirse.'
  },
  {
    n: 'E6', t: 'Agenda', c: () => <PTAgenda/>,
    d: 'Los turnos de la semana, sobre la disponibilidad que publicó el entrenador.',
    f: [
      ['Vista semanal por franja', 'Seis días por catorce franjas horarias, con el día actual destacado.'],
      ['Turnos identificados por alumno', 'Cada bloque muestra quién reservó, con color por tipo de sesión.'],
      ['Alta manual de turnos', 'El entrenador puede cargar un turno directamente, sin esperar la solicitud.'],
      ['Origen en la disponibilidad', 'Las franjas ofrecidas salen de la configuración de su cuenta: el alumno solo elige entre las libres.'],
    ],
    tech: 'La disponibilidad se guarda como franjas por día de la semana. Los turnos se validan contra ellas, y una restricción de unicidad por franja evita la doble reserva.'
  },
];

function GWPages() {
  const W = 1200, s = 0.585;
  const page = (p, roleLabel, roleCls) => (
    <section className="page" key={p.n}>
      <div className="shead">
        <div className="snum">{p.n}</div>
        <div>
          <h2>{p.t}</h2>
          <p>{p.d}</p>
        </div>
        <div className={'role ' + roleCls}>{roleLabel}</div>
      </div>
      <div className="wcap">
        <i>MAQUETA</i><b>{p.t}</b><span>1200 × {p.wh || 780} px · barra lateral y contenido</span>
      </div>
      <div className="wshot" style={{ width: W * s, height: (p.wh || 780) * s }}>
        <div className="wwrap" style={{ width: W, height: p.wh || 780, transform: `scale(${s})` }}>{p.c()}</div>
      </div>
      <div className="feats" style={{ marginTop: 18 }}>
        <h4>Funcionalidades</h4>
        {p.f.map((f, i) => (
          <div className="f" key={i}>
            <div className="n">{i + 1}</div>
            <div className="tx"><b>{f[0]}</b><p>{f[1]}</p></div>
          </div>
        ))}
        <div className="tech" style={{ marginTop: 13 }}>
          <span>Nota técnica</span>
          <p dangerouslySetInnerHTML={{ __html: p.tech }}/>
        </div>
      </div>
      <div className="foot">
        <span>FITTRAINER · GUÍA WEB</span>
        <span>{p.n} · {p.t.toUpperCase()}</span>
      </div>
    </section>
  );
  return (
    <>
      {GW_ALUMNO.map(p => page(p, 'Web · Alumno', 'al'))}
      {GW_PT.map(p => page(p, 'Web · Entrenador', ''))}
    </>
  );
}

const stagingGW = document.createElement('div');
ReactDOM.createRoot(stagingGW).render(<GWPages/>);
requestAnimationFrame(() => requestAnimationFrame(() => {
  const doc = document.querySelector('doc-page');
  const anchor = document.getElementById('screens');
  while (stagingGW.firstChild) doc.appendChild(stagingGW.firstChild);
  if (anchor) anchor.remove();
}));
