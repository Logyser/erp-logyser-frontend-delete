const API_URL = "/api/config";

// ==============================
// Cargar Tipo de Identificación
// ==============================
async function cargarTipoIdentificacion() {
  const res = await fetch(`${API_URL}/tipo-identificacion`);
  const data = await res.json();

  // Guardar dinámicamente
  window.tiposIdentificacion = data;

  const select = document.getElementById("tipo_documento");
  if (select) {
    select.innerHTML = `<option value="">Selecciona...</option>`;
    data.forEach(item => {
      select.innerHTML += `<option value="${item.descripcion}">${item.descripcion}</option>`;
    });
  }

  // ✅ Notificar que los tipos se cargaron
  document.dispatchEvent(new Event("tipos-cargados"));
}


// ==============================
// Cargar Departamentos
// ==============================
async function cargarDepartamentos() {
  const res = await fetch(`${API_URL}/departamentos`);
  const data = await res.json();

  const depExp = document.getElementById("departamento_expedicion");
  const depRes = document.getElementById("departamento_residencia");

  if (depExp) depExp.innerHTML = `<option value="">Selecciona...</option>`;
  if (depRes) depRes.innerHTML = `<option value="">Selecciona...</option>`;

  data.forEach(item => {
    if (depExp) depExp.innerHTML += `<option value="${item.departamento}">${item.departamento}</option>`;
    if (depRes) depRes.innerHTML += `<option value="${item.departamento}">${item.departamento}</option>`;
  });
}

// ==============================
// Cargar Ciudades según Departamento
// ==============================
async function cargarCiudades(selectDepartamentoId, selectCiudadId) {
  const depEl = document.getElementById(selectDepartamentoId);
  const ciudadSelect = document.getElementById(selectCiudadId);
  if (!depEl || !ciudadSelect) return;

  const dep = depEl.value;

  ciudadSelect.innerHTML = `<option value="">Selecciona...</option>`;

  if (!dep) return;

  const res = await fetch(`${API_URL}/ciudades?departamento=${encodeURIComponent(dep)}`);
  const data = await res.json();

  data.forEach(item => {
    ciudadSelect.innerHTML += `<option value="${item.ciudad}">${item.ciudad}</option>`;
  });
}

// ==============================
// Cargar EPS
// ==============================
async function cargarEPS() {
  const res = await fetch(`${API_URL}/eps`);
  const data = await res.json();

  const select = document.getElementById("eps");
  if (!select) return;
  select.innerHTML = `<option value="">Selecciona...</option>`;

  data.forEach(item => {
    select.innerHTML += `<option value="${item.eps}">${item.eps}</option>`;
  });
}

// ==============================
// Cargar Fondos de Pensión
// ==============================
async function cargarPension() {
  const res = await fetch(`${API_URL}/pension`);
  const data = await res.json();

  const select = document.getElementById("afp");
  if (!select) return;
  select.innerHTML = `<option value="">Selecciona...</option>`;

  data.forEach(item => {
    select.innerHTML += `<option value="${item.pension}">${item.pension}</option>`;
  });
}

// ==============================
// Inicializar todos los selects (ahora devuelve promesa y dispara evento al terminar)
// ==============================
async function inicializarSelects() {
  try {
    // Ejecutamos en paralelo pero esperamos a que todos terminen
    await Promise.all([
      cargarTipoIdentificacion(),
      cargarDepartamentos(),
      cargarEPS(),
      cargarPension()
    ]);
    // Marcar que todo está cargado y notificar
    window.selectsLoaded = true;
    document.dispatchEvent(new Event("selects-cargados"));
  } catch (err) {
    console.error("Error inicializando selects:", err);
    // no bloqueamos la app, pero asegúrate de revisar errores en consola
  }
}

// Ejecutar al cargar la página
document.addEventListener("DOMContentLoaded", inicializarSelects);

// Escuchar cambios de departamentos para cargar ciudades
const depExpEl = document.getElementById("departamento_expedicion");
if (depExpEl) depExpEl.addEventListener("change", () => cargarCiudades("departamento_expedicion", "ciudad_expedicion"));

const depResEl = document.getElementById("departamento_residencia");
if (depResEl) depResEl.addEventListener("change", () => cargarCiudades("departamento_residencia", "ciudad_residencia"));