// Script para capturar la firma del trabajador en un canvas y obtener la imagen base64

document.addEventListener('DOMContentLoaded', function () {
  // 1. Crear el canvas y controles (puedes agregar esto en el HTML)
  const container = document.createElement('div');
  container.style = "text-align:center; margin-top:24px;";

  const title = document.createElement('div');
  title.textContent = "Firma del Trabajador:";
  title.style = "font-weight:bold; margin-bottom:6px;";
  container.appendChild(title);

  const canvas = document.createElement('canvas');
  canvas.width = 350;
  canvas.height = 120;
  canvas.style = "border:1px solid #000b59; background:#fff; border-radius:8px; box-shadow:0 1px 4px #ccc;";
  container.appendChild(canvas);

  const controls = document.createElement('div');
  controls.style = "margin-top:8px;";

  const btnLimpiar = document.createElement('button');
  btnLimpiar.textContent = "Limpiar";
  btnLimpiar.style = "margin-right:10px;";
  controls.appendChild(btnLimpiar);

  const btnGuardar = document.createElement('button');
  btnGuardar.textContent = "Guardar Firma";
  controls.appendChild(btnGuardar);

  container.appendChild(controls);

  // insertar antes de la sección de firma
  const refFirma = document.querySelector('.signature-section');
  if (refFirma) refFirma.parentNode.insertBefore(container, refFirma);

  // 2. Lógica de dibujo en el canvas
  let dibujando = false;
  let ctx = canvas.getContext('2d');
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#000b59";

  canvas.addEventListener('mousedown', e => { dibujando = true; ctx.beginPath(); });
  canvas.addEventListener('mousemove', e => {
    if (!dibujando) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  });
  canvas.addEventListener('mouseup', e => { dibujando = false; });
  canvas.addEventListener('mouseleave', e => { dibujando = false; });

  // limpiar
  btnLimpiar.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  // guardar firma (esto es solo mostrar la imagen base64, luego lo enviaremos al backend)
btnGuardar.addEventListener('click', async () => {
  const imgBase64 = canvas.toDataURL('image/png');
  // Mostrar la firma en la sección original
  const imgFirma = document.getElementById('firmaImagen');
  if (imgFirma) imgFirma.src = imgBase64;

  // Obtener el idEntrega de la URL
  function getParam(name) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of params.entries()) {
      if (key.toLowerCase() === name.toLowerCase()) return value;
    }
    return null;
  }
  const idEntrega = getParam('idEntrega');
  if (!idEntrega) {
    alert('No se detectó el parámetro idEntrega en la URL.');
    return;
  }

  // Enviar la firma al backend
  try {
    const resp = await fetch('https://actas-backend-594761951101.us-central1.run.app/api/actas/upload-firma', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firma: imgBase64, idEntrega })
    });
    const data = await resp.json();
    if (resp.ok) {
      alert('Firma cargada correctamente.');
      // Opcional: actualiza la imagen mostrada con la URL pública
      if (data.url && imgFirma) imgFirma.src = data.url;
    } else {
      alert('Error al cargar la firma: ' + (data.error || 'Error desconocido'));
    }
  } catch (err) {
    alert('Error de red al cargar la firma: ' + err.message);
  }
});
});