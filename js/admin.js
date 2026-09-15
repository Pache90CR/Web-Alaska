import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let adminAutenticado = false;

window.intentarAccesoAdmin = function() {
    if (!adminAutenticado) {
        let clave = prompt("Introduce la contraseña de administración:");
        if (clave === "1234" || clave === "alaska2026") {
            adminAutenticado = true;
            alert("¡Acceso Concedido!");
            cambiarVista('admin');
            abrirSidebar();
        } else if (clave !== null) {
            alert("Contraseña incorrecta.");
        }
    } else {
        cambiarVista('admin');
        abrirSidebar();
    }
}

window.cerrarSesionAdmin = function() {
    adminAutenticado = false;
    cambiarVista('menu');
    cerrarSidebar();
}

window.cambiarVista = function(vista) {
    document.getElementById('view-menu').classList.remove('active-view');
    document.getElementById('view-admin').classList.remove('active-view');
    if (vista === 'menu') {
        document.getElementById('view-menu').classList.add('active-view');
    } else if (vista === 'admin') {
        if (!adminAutenticado) { intentarAccesoAdmin(); return; }
        document.getElementById('view-admin').classList.add('active-view');
        seleccionarSeccionAdmin('pedidos');
    }
    window.scrollTo(0,0);
}

window.abrirSidebar = function() { document.getElementById('sidebar-drawer').classList.add('open'); document.getElementById('sidebar-overlay').style.display = 'block'; }
window.cerrarSidebar = function() { document.getElementById('sidebar-drawer').classList.remove('open'); document.getElementById('sidebar-overlay').style.display = 'none'; }

window.seleccionarSeccionAdmin = function(seccion) {
    document.querySelectorAll('.admin-section-tab').forEach(tab => tab.classList.remove('active-admin-tab'));
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));

    let tabEl = document.getElementById(`admin-tab-${seccion}`);
    if(tabEl) tabEl.classList.add('active-admin-tab');
    
    if (seccion === 'historial') cargarAdminHistorial();
    else if (seccion === 'platos') cargarAdminPlatos();
    else if (seccion === 'clientes') cargarAdminClientes();
    else if (seccion === 'deudas') cargarAdminDeudas();
    else if (seccion === 'stock') cargarAdminStock();
    
    event && event.currentTarget && event.currentTarget.classList.add('active');
    cerrarSidebar();
}

async function cargarAdminHistorial() {
    const container = document.getElementById('admin-historial-container');
    if (!container) return;
    container.innerHTML = `<p>Cargando historial...</p>`;
    try {
        const querySnapshot = await getDocs(collection(db, "pedidos"));
        let pedidos = [];
        querySnapshot.forEach(d => pedidos.push({ id: d.id, ...d.data() }));
        
        if (pedidos.length === 0) {
            container.innerHTML = `<p>No hay registros en el historial.</p>`;
            return;
        }
        let html = `<table class="admin-table"><thead><tr><th>Cliente</th><th>Total (&#8353;)</th></tr></thead><tbody>`;
        pedidos.forEach(p => {
            html += `<tr><td>${p.nombre || ''}</td><td>&#8353;${Number(p.total || 0).toLocaleString()}</td></tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    } catch(e) { container.innerHTML = `<p style="color:red;">Error al cargar datos.</p>`; }
}

async function cargarAdminPlatos() {
    const tbody = document.getElementById('admin-tabla-platos-body');
    if(!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6">Cargando platos...</td></tr>`;
    try {
        const qs = await getDocs(collection(db, "menu"));
        tbody.innerHTML = "";
        qs.forEach(d => {
            let p = d.data();
            tbody.innerHTML += `<tr><td>-</td><td>${p.nombre}</td><td>${p.categoria}</td><td>&#8353;${p.precio}</td><td>Activo</td><td>-</td></tr>`;
        });
    } catch(e) { tbody.innerHTML = `<tr><td colspan="6">Error de carga.</td></tr>`; }
}

async function cargarAdminClientes() {
    const tbody = document.getElementById('admin-tabla-clientes-body');
    if(!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4">Cargando clientes...</td></tr>`;
    try {
        const qs = await getDocs(collection(db, "clientes"));
        tbody.innerHTML = "";
        qs.forEach(d => {
            let c = d.data();
            tbody.innerHTML += `<tr><td>${c.nombre}</td><td>${c.telefono}</td><td>${c.sellos || 0}</td><td>-</td></tr>`;
        });
    } catch(e) { tbody.innerHTML = `<tr><td colspan="4">Error de carga.</td></tr>`; }
}

async function cargarAdminDeudas() {
    const tbody = document.getElementById('admin-tabla-deudas-body');
    if(!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7">Cargando cuentas por cobrar...</td></tr>`;
}

async function cargarAdminStock() {
    const tbody = document.getElementById('admin-tabla-stock-body');
    if(!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5">Cargando stock...</td></tr>`;
}

window.abrirModalNuevaDeuda = function() { alert("Módulo de cuentas por cobrar"); }
window.abrirModalNuevoStock = function() { alert("Módulo de control de stock"); }
window.ejecutarCuadreCaja = function() { alert("Cierre de caja ejecutado"); }
window.generarNuevoCodigoSello = function() { alert("Nuevo código de sello generado"); }
window.guardarHorariosNube = function() { alert("Horarios guardados"); }
window.guardarAjustesYConfiguracionNube = function() { alert("Ajustes guardados"); }
window.actualizarTiempoEstimadoNube = function(val) { alert("Tiempo actualizado a: " + val); }
window.togglePausarPedidosOnline = function() { alert("Estado de pedidos online cambiado"); }
window.abrirModalCobrarPaqueteStock = function() {}
window.descargarReporteCSV = function() {}