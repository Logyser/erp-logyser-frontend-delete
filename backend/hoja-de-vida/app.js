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
  select.innerHTML = `<option value="">Selecciona...</option>`;

  data.forEach(item => {
    select.innerHTML += `<option value="${item.descripcion}">${item.descripcion}</option>`;
  });
    // ✅ MUY IMPORTANTE: Notificar que el select ya está cargado
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

  depExp.innerHTML = `<option value="">Selecciona...</option>`;
  depRes.innerHTML = `<option value="">Selecciona...</option>`;

  data.forEach(item => {
    depExp.innerHTML += `<option value="${item.departamento}">${item.departamento}</option>`;
    depRes.innerHTML += `<option value="${item.departamento}">${item.departamento}</option>`;
  });
}

// ==============================
// Cargar Ciudades según Departamento
// ==============================
async function cargarCiudades(selectDepartamentoId, selectCiudadId) {
  const dep = document.getElementById(selectDepartamentoId).value;
  const ciudadSelect = document.getElementById(selectCiudadId);

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
  select.innerHTML = `<option value="">Selecciona...</option>`;

  data.forEach(item => {
    select.innerHTML += `<option value="${item.pension}">${item.pension}</option>`;
  });
}

// ==============================
// Inicializar todos los selects
// ==============================
function inicializarSelects() {
  cargarTipoIdentificacion();
  cargarDepartamentos();
  cargarEPS();
  cargarPension();
}

// Ejecutar al cargar la página
document.addEventListener("DOMContentLoaded", inicializarSelects);

// Escuchar cambios de departamentos para cargar ciudades
document.getElementById("departamento_expedicion")
  .addEventListener("change", () => cargarCiudades("departamento_expedicion", "ciudad_expedicion"));

document.getElementById("departamento_residencia")
  .addEventListener("change", () => cargarCiudades("departamento_residencia", "ciudad_residencia"));
