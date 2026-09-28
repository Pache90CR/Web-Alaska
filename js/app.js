import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, query, where, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD2JhmA4m7NMbRcC2RqaHVIz1NLgI2IzE",
    authDomain: "bar-restaurante-alaska.firebaseapp.com",
    projectId: "bar-restaurante-alaska",
    storageBucket: "bar-restaurante-alaska.firebasestorage.app",
    messagingSenderId: "734422460427",
    appId: "1:734422460427:web:cee048a1edd6bf38b07f0e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let listaPlatos = [];
let carritoItems = [];
let categoriasNube = {};
const categoriasDefault = ["Bocas", "Comidas Rápidas", "Arroces", "Batidos", "Casados", "Ofertas"];
const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
let variantesTemporales = [];
let carritoStock = [];

let platoSeleccionadoParaPedir = null;
let cantidadSeleccionadaModal = 1;
let calificacionSeleccionadaModal = 5;
let adminAutenticado = false;
let negocioAbiertoGlobal = true;
let pedidosOnlinePausados = false;
let miGraficoFinanciero = null;

let checkoutPaso = 1; 
let pedidoTipoEntrega = "";
let pedidoMetodoPago = "";

window.clienteActualId = localStorage.getItem('alaska_cliente_doc_id') || null;
window.clienteActualSellos = Number(localStorage.getItem('alaska_cliente_sellos') || 0);
window.clienteActualNombre = localStorage.getItem('alaska_cliente_nombre') || '';

function mostrarToast(mensaje) {
    const toast = document.getElementById('toast-notification');
    document.getElementById('toast-msg').textContent = mensaje;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// ==========================================
// CONTROL DE VISTAS Y ADMINISTRACIÓN
// ==========================================
window.intentarAccesoAdmin = function() {
    if (!adminAutenticado) {
        let clave = prompt("Introduce la contraseña de administración:");
        if (clave === "1234" || clave === "alaska2026") {
            adminAutenticado = true;
            mostrarToast("🔓 ¡Acceso de Administrador Concedido!");
            cambiarVista('admin');
            abrirSidebar();
        } else if (clave !== null) {
            mostrarToast("❌ Contraseña incorrecta.");
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
    mostrarToast("🔒 Sesión de administrador cerrada.");
}

window.cambiarVista = function(vista) {
    document.getElementById('view-menu').classList.remove('active-view');
    document.getElementById('view-admin').classList.remove('active-view');
    const floatingBar = document.getElementById('floating-bar');

    if (vista === 'menu') {
        document.getElementById('view-menu').classList.add('active-view');
        if(floatingBar) floatingBar.classList.remove('hidden');
        window.scrollTo(0,0);
    } else if (vista === 'admin') {
        if (!adminAutenticado) {
            intentarAccesoAdmin();
            return;
        }
        document.getElementById('view-admin').classList.add('active-view');
        if(floatingBar) floatingBar.classList.add('hidden');
        seleccionarSeccionAdmin('historial');
        window.scrollTo(0,0);
    }
}

window.abrirSidebar = function() {
    document.getElementById('sidebar-drawer').classList.add('open');
    document.getElementById('sidebar-overlay').style.display = 'block';
}

window.cerrarSidebar = function() {
    document.getElementById('sidebar-drawer').classList.remove('open');
    document.getElementById('sidebar-overlay').style.display = 'none';
}

window.seleccionarSeccionAdmin = function(seccion) {
    document.querySelectorAll('.admin-section-tab').forEach(tab => tab.classList.remove('active-admin-tab'));
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));

    if (seccion === 'pedidos') {
        document.getElementById('admin-tab-pedidos').classList.add('active-admin-tab');
        cargarAdminPedidos();
    } else if (seccion === 'deudas') {
        document.getElementById('admin-tab-deudas').classList.add('active-admin-tab');
        cargarAdminDeudas();
    } else if (seccion === 'historial') {
        document.getElementById('admin-tab-historial').classList.add('active-admin-tab');
        cargarAdminHistorial();
    } else if (seccion === 'ranking') {
        document.getElementById('admin-tab-ranking').classList.add('active-admin-tab');
        cargarAdminRanking();
    } else if (seccion === 'platos') {
        document.getElementById('admin-tab-platos').classList.add('active-admin-tab');
        cargarAdminPlatos();
    } else if (seccion === 'stock') {
        document.getElementById('admin-tab-stock').classList.add('active-admin-tab');
        cargarAdminStock();
    } else if (seccion === 'caja') {
        document.getElementById('admin-tab-caja').classList.add('active-admin-tab');
        calcularEstadisticasCaja();
    } else if (seccion === 'analisis') {
        document.getElementById('admin-tab-analisis').classList.add('active-admin-tab');
        renderizarAnalisisMensual();
    } else if (seccion === 'categorias') {
        document.getElementById('admin-tab-categorias').classList.add('active-admin-tab');
        cargarAdminCategorias();
    } else if (seccion === 'nuevo-plato') {
        document.getElementById('admin-tab-nuevo-plato').classList.add('active-admin-tab');
    } else if (seccion === 'lealtad') {
        document.getElementById('admin-tab-lealtad').classList.add('active-admin-tab');
    } else if (seccion === 'clientes') {
        document.getElementById('admin-tab-clientes').classList.add('active-admin-tab');
        cargarAdminClientes();
    } else if (seccion === 'horarios') {
        document.getElementById('admin-tab-horarios').classList.add('active-admin-tab');
    } else if (seccion === 'ajustes') {
        document.getElementById('admin-tab-ajustes').classList.add('active-admin-tab');
    }

    event && event.currentTarget && event.currentTarget.classList.add('active');
    cerrarSidebar();
}

async function cargarMenu() {
    try {
        const querySnapshot = await getDocs(collection(db, "menu"));
        listaPlatos = [];
        querySnapshot.forEach((docSnap) => { listaPlatos.push({ id: docSnap.id, ...docSnap.data() }); });
        mostrarPlatos(listaPlatos);
        inicializarCategoriasNube();
    } catch (error) { console.log(error); }
}

function mostrarPlatos(platos) {
    const menuGrid = document.getElementById("menu-grid");
    if (!menuGrid) return;
    menuGrid.innerHTML = "";
    const visibles = platos.filter(p => p.categoria !== 'Stock_Interno');
    
    if (visibles.length === 0) {
        menuGrid.innerHTML = "<p style='text-align:center; color:var(--text-muted);'>No hay platos disponibles.</p>";
        return;
    }
    visibles.forEach((plato) => {
        let tieneFotoValida = plato.imagenUrl && typeof plato.imagenUrl === 'string' && plato.imagenUrl.trim() !== "";
        const imagen = tieneFotoValida ? plato.imagenUrl : 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80';
        
        let disponible = plato.disponible !== false;
        let badgeAgotadoHTML = !disponible ? `<span class="badge-agotado">Agotado</span>` : '';

        let promedioEstrellas = plato.ratingPromedio ? Number(plato.ratingPromedio).toFixed(1) : "5.0";
        let totalResenas = plato.totalResenas || 0;

        let btnClase = "";
        let btnTexto = "";
        let accionClick = "";

        if (!negocioAbiertoGlobal) {
            btnClase = "order-btn closed";
            btnTexto = "Cerrado";
            accionClick = "mostrarToast('⚠️ El establecimiento está cerrado temporalmente.')";
        } else if (pedidosOnlinePausados) {
            btnClase = "order-btn closed";
            btnTexto = "Cocina Ocupada";
            accionClick = "mostrarToast('⚠️ Pedidos online pausados temporalmente por alta demanda.')";
        } else if (!disponible) {
            btnClase = "order-btn soldout";
            btnTexto = "Agotado Temporalmente";
            accionClick = "mostrarToast('⚠️ Este plato se encuentra agotado por hoy.')";
        } else {
            btnClase = "order-btn";
            btnTexto = "Pedir";
            accionClick = `abrirModalDetallePlato('${plato.id}')`;
        }

        menuGrid.innerHTML += `
            <div class="food-card" style="opacity: ${disponible ? '1' : '0.65'};">
                <div class="card-image-container">
                    <img src="${imagen}" alt="${plato.nombre}">
                    <span class="badge">${plato.categoria || 'Especialidad'}</span>
                    ${badgeAgotadoHTML}
                </div>
                <div class="card-content">
                    <div>
                        <div class="card-header-flex">
                            <h3>${plato.nombre}</h3>
                            <div class="price">₡${Number(plato.precio).toLocaleString()}</div>
                        </div>
                        <div class="stars">
                            <span>★</span> ${promedioEstrellas} <span style="font-size:11px; color:var(--text-muted);">(${totalResenas} reseñas)</span>
                        </div>
                    </div>
                    <button class="${btnClase}" onclick="${accionClick}">${btnTexto}</button>
                </div>
            </div>
        `;
    });
}

window.filtrarMenuPorTexto = function(textoBusqueda) {
    let texto = textoBusqueda.toLowerCase().trim();
    if (!texto) {
        mostrarPlatos(listaPlatos);
        return;
    }
    const filtrados = listaPlatos.filter(p => 
        p.categoria !== 'Stock_Interno' && 
        (p.nombre.toLowerCase().includes(texto) || (p.descripcion && p.descripcion.toLowerCase().includes(texto)))
    );
    mostrarPlatos(filtrados);
}

window.abrirModalDetallePlato = function(id) {
    if (!negocioAbiertoGlobal || pedidosOnlinePausados) {
        mostrarToast("⚠️ El sistema de pedidos online no está disponible en este momento.");
        return;
    }
    const plato = listaPlatos.find(p => p.id === id);
    if (!plato || plato.disponible === false) return;
    platoSeleccionadoParaPedir = plato;
    cantidadSeleccionadaModal = 1;
    calificacionSeleccionadaModal = 5;
    actualizarEstrellasVisuales(5);
    document.getElementById('modal-cantidad-valor').textContent = "1";
    document.getElementById('modal-nota-plato-individual').value = "";
    document.getElementById('input-comentario-resena').value = "";

    document.getElementById('modal-detalle-titulo').textContent = plato.nombre;
    document.getElementById('modal-detalle-img').src = plato.imagenUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80';
    document.getElementById('modal-detalle-desc').textContent = plato.descripcion || 'Sin descripción adicional.';
    actualizarPrecioTotalModal();

    const containerExtras = document.getElementById('modal-detalle-extras-container');
    containerExtras.innerHTML = "";

    if (plato.variantes && plato.variantes.length > 0) {
        let htmlExtras = `<label style="font-weight:700; color:var(--color-principal); margin-bottom:8px;">Acompañamientos / Extras (Elige hasta 2):</label>`;
        plato.variantes.forEach((v, index) => {
            let agotado = v.agotado === true;
            let imgUrlAttr = v.imagenUrl ? v.imagenUrl : '';
            let imgIconHtml = v.imagenUrl ? `<span style="font-size:10px;">📷</span> ` : '';
            
            if (!agotado) {
                htmlExtras += `
                    <label style="display:flex; align-items:center; justify-content:space-between; background:#222; padding:10px; border-radius:8px; margin-bottom:6px; cursor:pointer;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <input type="checkbox" class="chk-extra-item" value="${index}" data-nombre="${v.nombre}" data-precio="${v.precio}" data-img="${imgUrlAttr}" onchange="manejarCambioExtra(this)" style="width:16px; height:16px;">
                            <span>${imgIconHtml}${v.nombre}</span>
                        </div>
                        <span style="color:var(--color-principal); font-weight:bold;">+₡${Number(v.precio).toLocaleString()}</span>
                    </label>
                `;
            }
        });
        containerExtras.innerHTML = htmlExtras;
    } else {
        containerExtras.innerHTML = `<span style="font-size:12px; color:var(--text-muted);">Este plato no cuenta con acompañamientos adicionales.</span>`;
    }

    document.getElementById('modal-detalle-plato').style.display = 'flex';
}

window.cerrarModalDetallePlato = function() {
    document.getElementById('modal-detalle-plato').style.display = 'none';
}

window.manejarCambioExtra = function(chk) {
    const checkboxes = document.querySelectorAll('.chk-extra-item:checked');
    if (checkboxes.length > 2) {
        mostrarToast("⚠️ Solo puedes seleccionar un máximo de 2 acompañamientos.");
        chk.checked = false;
    }
    actualizarPrecioTotalModal();
}

window.seleccionarEstrellasCalificacion = function(num) {
    calificacionSeleccionadaModal = num;
    actualizarEstrellasVisuales(num);
}

function actualizarEstrellasVisuales(num) {
    for (let i = 1; i <= 5; i++) {
        const starEl = document.getElementById(`star-${i}`);
        if (starEl) {
            starEl.style.color = i <= num ? 'var(--color-principal)' : '#555';
        }
    }
}

window.enviarCalificacionPlato = async function() {
    if (!platoSeleccionadoParaPedir) return;
    const comentario = document.getElementById('input-comentario-resena').value.trim();
    const platoId = platoSeleccionadoParaPedir.id;

    try {
        let totalActual = Number(platoSeleccionadoParaPedir.totalResenas || 0);
        let promedioActual = Number(platoSeleccionadoParaPedir.ratingPromedio || 5.0);

        let nuevoTotal = totalActual + 1;
        let nuevoPromedio = ((promedioActual * totalActual) + calificacionSeleccionadaModal) / nuevoTotal;

        await updateDoc(doc(db, "menu", platoId), {
            ratingPromedio: nuevoPromedio,
            totalResenas: nuevoTotal
        });

        await addDoc(collection(db, "resenas"), {
            platoId: platoId,
            platoNombre: platoSeleccionadoParaPedir.nombre,
            estrellas: calificacionSeleccionadaModal,
            comentario: comentario || "Sin comentario",
            fecha: new Date().toISOString()
        });

        platoSeleccionadoParaPedir.ratingPromedio = nuevoPromedio;
        platoSeleccionadoParaPedir.totalResenas = nuevoTotal;

        mostrarToast("⭐ ¡Gracias por calificar este plato!");
        document.getElementById('input-comentario-resena').value = "";
        cargarMenu();
    } catch(e) {
        mostrarToast("Error al enviar calificación.");
    }
}

window.cambiarCantidadModal = function(cambio) {
    cantidadSeleccionadaModal += cambio;
    if (cantidadSeleccionadaModal < 1) cantidadSeleccionadaModal = 1;
    document.getElementById('modal-cantidad-valor').textContent = cantidadSeleccionadaModal;
    actualizarPrecioTotalModal();
}

function actualizarPrecioTotalModal() {
    if (!platoSeleccionadoParaPedir) return;
    let totalUnitario = Number(platoSeleccionadoParaPedir.precio);
    const checkboxes = document.querySelectorAll('.chk-extra-item:checked');
    checkboxes.forEach(chk => {
        totalUnitario += Number(chk.getAttribute('data-precio') || 0);
    });
    let totalFinal = totalUnitario * cantidadSeleccionadaModal;
    document.getElementById('modal-detalle-precio-total').textContent = `₡${totalFinal.toLocaleString()}`;
}

window.agregarPlatoConExtrasAlCarrito = function() {
    if (!negocioAbiertoGlobal || pedidosOnlinePausados) {
        mostrarToast("⚠️ El establecimiento não está recibiendo pedidos online.");
        return;
    }
    if (!platoSeleccionadoParaPedir) return;
    const checkboxes = document.querySelectorAll('.chk-extra-item:checked');
    let extrasSeleccionados = [];
    let adicionalPrecio = 0;

    checkboxes.forEach(chk => {
        extrasSeleccionados.push(chk.getAttribute('data-nombre'));
        adicionalPrecio += Number(chk.getAttribute('data-precio') || 0);
    });

    let detalleTexto = extrasSeleccionados.length > 0 ? `Con: ${extrasSeleccionados.join(', ')}` : 'Sin extras';
    let precioUnitario = Number(platoSeleccionadoParaPedir.precio) + adicionalPrecio;
    let notaPlatoIndividual = document.getElementById('modal-nota-plato-individual').value.trim();

    carritoItems.push({
        nombre: platoSeleccionadoParaPedir.nombre,
        detalle: detalleTexto,
        precioUnitario: precioUnitario,
        cantidad: cantidadSeleccionadaModal,
        nota: notaPlatoIndividual
    });

    actualizarContadorCarrito();
    mostrarToast(`✅ ¡${cantidadSeleccionadaModal}x ${platoSeleccionadoParaPedir.nombre} agregado al carrito!`);
    cerrarModalDetallePlato();
}

function actualizarContadorCarrito() {
    const badge = document.getElementById('cart-count');
    let totalUnidades = carritoItems.reduce((acc, item) => acc + item.cantidad, 0);
    if (badge) badge.textContent = totalUnidades;
}

window.abrirModalCarrito = function() {
    checkoutPaso = 1;
    renderizarPasoCarrito();
    document.getElementById('modal-carrito').style.display = 'flex';
}

window.cerrarModalCarrito = function() {
    document.getElementById('modal-carrito').style.display = 'none';
}

window.renderizarPasoCarrito = function() {
    const tituloEl = document.getElementById('modal-carrito-titulo');
    const bodyEl = document.getElementById('carrito-body-contenido');
    const footerEl = document.getElementById('carrito-footer-contenido');

    if (checkoutPaso === 1) {
        tituloEl.textContent = "🛒 Tu Pedido";
        if (carritoItems.length === 0) {
            bodyEl.innerHTML = "<p style='color:var(--text-muted); text-align:center;'>Tu carrito está vacío.</p>";
            footerEl.innerHTML = `<button onclick="cerrarModalCarrito()" class="btn-admin-action" style="width:100%;">Cerrar</button>`;
            return;
        }

        let html = "";
        let sumaTotal = 0;
        carritoItems.forEach((item, index) => {
            let subtotalItem = item.precioUnitario * item.cantidad;
            sumaTotal += subtotalItem;
            let notaPlatoHtml = item.nota ? `<span style="font-size:11px; color:#facc15; display:block;">Nota: ${item.nota}</span>` : '';
            html += `
                <div style="background:#222; padding:14px; border-radius:12px; margin-bottom:10px; border:1px solid var(--border-color);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                        <div>
                            <strong style="color:white; font-size:15px;">${item.nombre}</strong><br>
                            <span style="font-size:12px; color:var(--color-principal);">${item.detalle}</span><br>
                            ${notaPlatoHtml}
                            <strong style="color:white; font-size:13px;">₡${subtotalItem.toLocaleString()}</strong>
                        </div>
                        <button type="button" onclick="eliminarItemCarrito(${index})" style="background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#ef4444; padding:6px 12px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:bold;">Eliminar ✕</button>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:8px; border-top:1px solid #333;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <button type="button" onclick="cambiarCantidadItemCarrito(${index}, -1)" style="background:#333; color:white; border:none; width:26px; height:26px; border-radius:6px; font-weight:bold; cursor:pointer;">-</button>
                            <span style="font-size:14px; font-weight:800;">${item.cantidad}</span>
                            <button type="button" onclick="cambiarCantidadItemCarrito(${index}, 1)" style="background:var(--color-principal); color:#121212; border:none; width:26px; height:26px; border-radius:6px; font-weight:bold; cursor:pointer;">+</button>
                        </div>
                        <input type="text" placeholder="Nota específica" value="${item.nota || ''}" onchange="actualizarNotaItem(${index}, this.value)" style="width:55%; padding:8px 10px; font-size:12px; background:#181818; border-radius:8px;">
                    </div>
                </div>
            `;
        });
        bodyEl.innerHTML = html;

        footerEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:4px;">
                <span style="font-size:13px; color:var(--text-muted);">Total a Pagar:</span>
                <span style="font-size:18px; font-weight:800; color:var(--color-principal);">₡${sumaTotal.toLocaleString()}</span>
            </div>
            <button type="button" onclick="avanzarCheckout(2)" class="btn-admin-action" style="width:100%; padding:12px;">Continuar pedido 🚀</button>
        `;
    } else if (checkoutPaso === 2) {
        tituloEl.textContent = "📍 Tipo de Entrega";
        bodyEl.innerHTML = `
            <p style="font-size:13px; color:var(--text-muted); margin-top:0;">Selecciona cómo deseas recibir tu orden:</p>
            <div style="display:flex; flex-direction:column; gap:10px;">
                <div onclick="seleccionarEntrega('Consumo en Mesa')" style="background:${pedidoTipoEntrega==='Consumo en Mesa'?'rgba(212,175,55,0.15)':'#222'}; border:1px solid ${pedidoTipoEntrega==='Consumo en Mesa'?'var(--color-principal)':'var(--border-color)'}; padding:14px; border-radius:12px; cursor:pointer;">
                    <strong style="color:white; font-size:15px;">🍽️ Consumo en Mesa</strong>
                    <p style="margin:4px 0 0 0; font-size:12px; color:var(--text-muted);">Atención directa en tu mesa dentro del local.</p>
                </div>
                <div onclick="seleccionarEntrega('Retiró en Local')" style="background:${pedidoTipoEntrega==='Retiró en Local'?'rgba(212,175,55,0.15)':'#222'}; border:1px solid ${pedidoTipoEntrega==='Retiró en Local'?'var(--color-principal)':'var(--border-color)'}; padding:14px; border-radius:12px; cursor:pointer;">
                    <strong style="color:white; font-size:15px;">🛍️ Retiró en Local</strong>
                    <p style="margin:4px 0 0 0; font-size:12px; color:var(--text-muted);">Pasa a recoger tu pedido listo en barra.</p>
                </div>
            </div>
        `;
        footerEl.innerHTML = `
            <button type="button" onclick="avanzarCheckout(1)" class="action-pill" style="width:100%; padding:10px; border:none; background:#2a2a2a; color:white; justify-content:center;">Atrás</button>
            <button type="button" onclick="ejecutarSiguienteEntrega()" class="btn-admin-action" style="width:100%; padding:12px;">Siguiente</button>
        `;
    } else if (checkoutPaso === 3) {
        tituloEl.textContent = "💳 Método de Pago";
        bodyEl.innerHTML = `
            <p style="font-size:13px; color:var(--text-muted); margin-top:0;">Elige cómo realizarás el pago:</p>
            <div style="display:flex; flex-direction:column; gap:10px;">
                <div onclick="seleccionarPago('Efectivo')" style="background:${pedidoMetodoPago==='Efectivo'?'rgba(212,175,55,0.15)':'#222'}; border:1px solid ${pedidoMetodoPago==='Efectivo'?'var(--color-principal)':'var(--border-color)'}; padding:14px; border-radius:12px; cursor:pointer;">
                    <strong style="color:white; font-size:15px;">💵 Efectivo</strong>
                </div>
                <div onclick="seleccionarPago('SINPE Móvil')" style="background:${pedidoMetodoPago==='SINPE Móvil'?'rgba(212,175,55,0.15)':'#222'}; border:1px solid ${pedidoMetodoPago==='SINPE Móvil'?'var(--color-principal)':'var(--border-color)'}; padding:14px; border-radius:12px; cursor:pointer;">
                    <strong style="color:white; font-size:15px;">📱 SINPE Móvil</strong>
                    <span style="font-size:11px; color:var(--color-principal); display:block; margin-top:2px;">Tel: 8521-3829</span>
                </div>
                <div onclick="seleccionarPago('Datáfono')" style="background:${pedidoMetodoPago==='Datáfono'?'rgba(212,175,55,0.15)':'#222'}; border:1px solid ${pedidoMetodoPago==='Datáfono'?'var(--color-principal)':'var(--border-color)'}; padding:14px; border-radius:12px; cursor:pointer;">
                    <strong style="color:white; font-size:15px;">💳 Datáfono (Tarjeta)</strong>
                </div>
            </div>
        `;
        footerEl.innerHTML = `
            <button type="button" onclick="avanzarCheckout(2)" class="action-pill" style="width:100%; padding:10px; border:none; background:#2a2a2a; color:white; justify-content:center;">Atrás</button>
            <button type="button" onclick="ejecutarSiguientePago()" class="btn-admin-action" style="width:100%; padding:12px;">Siguiente</button>
        `;
    } else if (checkoutPaso === 4) {
        tituloEl.textContent = "📝 Datos Finales";
        bodyEl.innerHTML = `
            <div class="form-group">
                <label>Tu Nombre o Número de Mesa *</label>
                <input type="text" id="input-nombre-final" placeholder="Ej. Mesa 4 o Juan Pérez" value="${window.clienteActualNombre || ''}">
            </div>
            <div class="form-group">
                <label>Teléfono (Opcional)</label>
                <input type="text" id="input-telefono-final" placeholder="Ej. 88888888">
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label>Instrucciones Generales (Opcional)</label>
                <textarea id="input-nota-general" placeholder="Alguna indicación adicional para la cocina..." style="height:70px; resize:none;"></textarea>
            </div>
        `;
        footerEl.innerHTML = `
            <button type="button" onclick="avanzarCheckout(3)" class="action-pill" style="width:100%; padding:10px; border:none; background:#2a2a2a; color:white; justify-content:center;">Atrás</button>
            <button type="button" onclick="enviarPedidoFinalDefinitivo()" class="btn-admin-action" style="width:100%; padding:12px; background:var(--color-principal);">Confirmar Pedido 📲</button>
        `;
    }
}

window.eliminarItemCarrito = function(index) {
    carritoItems.splice(index, 1);
    renderizarPasoCarrito();
    actualizarContadorCarrito();
}

window.cambiarCantidadItemCarrito = function(index, cambio) {
    carritoItems[index].cantidad += cambio;
    if (carritoItems[index].cantidad < 1) carritoItems[index].cantidad = 1;
    renderizarPasoCarrito();
    actualizarContadorCarrito();
}

window.actualizarNotaItem = function(index, val) {
    carritoItems[index].nota = val;
}

window.avanzarCheckout = function(paso) {
    checkoutPaso = paso;
    renderizarPasoCarrito();
}

window.seleccionarEntrega = function(tipo) {
    pedidoTipoEntrega = tipo;
    renderizarPasoCarrito();
}

window.ejecutarSiguienteEntrega = function() {
    if (!pedidoTipoEntrega) {
        mostrarToast('⚠️ Selecciona un tipo de entrega.');
        return;
    }
    avanzarCheckout(3);
}

window.seleccionarPago = function(metodo) {
    pedidoMetodoPago = metodo;
    renderizarPasoCarrito();
}

window.ejecutarSiguientePago = function() {
    if (!pedidoMetodoPago) {
        mostrarToast('⚠️ Selecciona un método de pago.');
        return;
    }
    avanzarCheckout(4);
}

window.enviarPedidoFinalDefinitivo = async function() {
    const nombreFinal = document.getElementById('input-nombre-final').value.trim();
    if (!nombreFinal) {
        mostrarToast("⚠️ Por favor ingresa tu nombre o número de mesa.");
        return;
    }
    const telefonoFinal = document.getElementById('input-telefono-final').value.trim();
    const notaGeneral = document.getElementById('input-nota-general').value.trim();

    try {
        let sumaTotalGeneral = 0;
        let resumenDetallesArray = [];

        for (let item of carritoItems) {
            let subtotalItem = item.precioUnitario * item.cantidad;
            sumaTotalGeneral += subtotalItem;
            let detalleCompleto = `${item.cantidad}x ${item.nombre} (${item.detalle})`;
            if (item.nota) detalleCompleto += ` [Nota: ${item.nota}]`;
            resumenDetallesArray.push(detalleCompleto);

            await addDoc(collection(db, "pedidos"), {
                nombre: `${nombreFinal} (${pedidoTipoEntrega})`,
                detalle: detalleCompleto,
                total: subtotalItem,
                estado: 'Preparación',
                metodoPago: pedidoMetodoPago || 'Efectivo',
                telefono: telefonoFinal,
                fecha: new Date().toISOString()
            });
        }

        await fetch('https://hook.us2.make.com/dlrk5a5o4f75a76cjc3ci6bb5b4f7s3m', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: `${nombreFinal} (${pedidoTipoEntrega})`,
                detalle: resumenDetallesArray.join(' | '),
                total: sumaTotalGeneral,
                metodoPago: pedidoMetodoPago || 'Efectivo',
                telefono: telefonoFinal,
                notaGeneral: notaGeneral || 'Ninguna'
            })
        });

        mostrarToast("🎉 ¡Pedido confirmado con éxito!");
        carritoItems = [];
        pedidoTipoEntrega = "";
        pedidoMetodoPago = "";
        actualizarContadorCarrito();
        cerrarModalCarrito();

    } catch(e) {
        console.error(e);
        mostrarToast("Error al guardar el pedido.");
    }
}

window.cargarAdminHistorial = async function() {
    const container = document.getElementById('admin-historial-container');
    if (!container) return;
    container.innerHTML = `<p style="color:var(--text-muted); font-size:13px;">Cargando historial de pedidos y paquetes cobrados...</p>`;
    
    try {
        const q = query(collection(db, "pedidos"), limit(100));
        const querySnapshot = await getDocs(q);
        
        let pedidos = [];
        querySnapshot.forEach(d => {
            pedidos.push({ id: d.id, ...d.data() });
        });

        pedidos.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

        if (pedidos.length === 0) {
            container.innerHTML = `<p style="color:var(--text-muted); font-size:13px;">No hay registros en el historial.</p>`;
            return;
        }

        let html = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Fecha / Hora</th>
                        <th>Tipo / Cliente</th>
                        <th>Detalle del Pedido o Paquete</th>
                        <th>Método de Pago</th>
                        <th>Total (₡)</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
        `;

        pedidos.forEach(p => {
            let fechaFormateada = p.fecha ? new Date(p.fecha).toLocaleString() : 'Fecha no registrada';
            let esPaquete = p.nombre && p.nombre.includes("Paquete de Stock");
            let estiloFila = esPaquete ? `background: rgba(59, 130, 246, 0.08);` : '';
            
            html += `
                <tr style="${estiloFila}">
                    <td style="font-size:12px; color:var(--text-muted);">${fechaFormateada}</td>
                    <td><strong style="color:${esPaquete ? '#3b82f6' : 'white'};">${p.nombre || 'General'}</strong></td>
                    <td>${p.detalle || 'Sin detalle'}</td>
                    <td><span style="background:#222; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold; color:var(--color-principal);">${p.metodoPago || 'Efectivo'}</span></td>
                    <td><strong style="color:var(--color-principal);">₡${Number(p.total || 0).toLocaleString()}</strong></td>
                    <td>
                        <button type="button" onclick="eliminarRegistroHistorial('${p.id}')" class="action-pill" style="padding:4px 10px; font-size:11px; background:rgba(239,68,68,0.2); color:#ef4444; border-color:#ef4444;">Eliminar ✕</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    } catch(e) {
        console.error(e);
        container.innerHTML = `<p style="color:#ef4444; font-size:13px;">Error al cargar el historial.</p>`;
    }
}

window.eliminarRegistroHistorial = async function(idPedido) {
    if (confirm("¿Estás seguro de eliminar este registro del historial?")) {
        try {
            await deleteDoc(doc(db, "pedidos", idPedido));
            mostrarToast("🗑️ Registro eliminado correctamente.");
            cargarAdminHistorial();
        } catch(e) {
            mostrarToast("Error al eliminar el registro.");
        }
    }
}

window.descargarReporteCSV = async function() {
    try {
        const qs = await getDocs(collection(db, "pedidos"));
        let csvContent = "data:text/csv;charset=utf-8,ID,Fecha,Cliente,Detalle,MetodoPago,Total\n";
        
        qs.forEach(d => {
            let p = d.data();
            let fecha = p.fecha ? new Date(p.fecha).toLocaleString() : '';
            let cliente = `"${(p.nombre || '').replace(/"/g, '""')}"`;
            let detalle = `"${(p.detalle || '').replace(/"/g, '""')}"`;
            let pago = p.metodoPago || 'Efectivo';
            let total = p.total || 0;
            
            csvContent += `${d.id},"${fecha}",${cliente},${detalle},${pago},${total}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reporte_ventas_alaska_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        mostrarToast("📥 Reporte descargado con éxito.");
    } catch(e) {
        mostrarToast("Error al generar el reporte CSV.");
    }
}

window.calcularEstadisticasCaja = async function() {
    try {
        const qs = await getDocs(collection(db, "pedidos"));
        let totalEfectivo = 0;
        let totalElectronico = 0;
        let hoy = new Date();

        qs.forEach(d => {
            let p = d.data();
            if (p.estado === 'Entregado' && p.fecha) {
                let fechaDoc = new Date(p.fecha);
                if (fechaDoc.getDate() === hoy.getDate() && 
                    fechaDoc.getMonth() === hoy.getMonth() && 
                    fechaDoc.getFullYear() === hoy.getFullYear()) {
                    
                    let monto = Number(p.total || 0);
                    if (p.metodoPago === 'Efectivo') totalEfectivo += monto;
                    else totalElectronico += monto;
                }
            }
        });

        let totalIngresos = totalEfectivo + totalElectronico;
        document.getElementById('stat-ingresos').textContent = `₡${totalIngresos.toLocaleString()}`;
        document.getElementById('stat-efectivo-sis').textContent = `₡${totalEfectivo.toLocaleString()}`;
        document.getElementById('stat-electronico-sis').textContent = `₡${totalElectronico.toLocaleString()}`;
        document.getElementById('stat-efectivo-sis').setAttribute('data-valor', totalEfectivo);
    } catch(e) {
        console.error(e);
        mostrarToast("Error al calcular la caja de hoy.");
    }
}

window.ejecutarCuadreCaja = function() {
    let fondo = Number(document.getElementById('input-fondo-inicial').value || 0);
    let fisico = Number(document.getElementById('input-efectivo-fisico').value || 0);
    let efectivoSistema = Number(document.getElementById('stat-efectivo-sis').getAttribute('data-valor') || 0);

    let esperado = fondo + efectivoSistema;
    let diferencia = fisico - esperado;

    let divRes = document.getElementById('resultado-corte-container');
    if (diferencia === 0) {
        divRes.innerHTML = `<div style="background:rgba(16,185,129,0.2); border:1px solid #10b981; color:#10b981; padding:15px; border-radius:10px; text-align:center; font-weight:bold; font-size:15px;">✅ ¡Cuadre Exacto! Todo está en orden.</div>`;
    } else if (diferencia > 0) {
        divRes.innerHTML = `<div style="background:rgba(59,130,246,0.2); border:1px solid #3b82f6; color:#3b82f6; padding:15px; border-radius:10px; text-align:center; font-weight:bold; font-size:15px;">⚠️ Hay un SOBRANTE de ₡${Math.abs(diferencia).toLocaleString()} en caja física.</div>`;
    } else {
        divRes.innerHTML = `<div style="background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#ef4444; padding:15px; border-radius:10px; text-align:center; font-weight:bold; font-size:15px;">❌ Hay un FALTANTE de ₡${Math.abs(diferencia).toLocaleString()} en caja física.</div>`;
    }
}

window.renderizarAnalisisMensual = async function() {
    let anioSeleccionado = document.getElementById('select-ano-analisis').value;
    let ventasMensuales = new Array(12).fill(0);
    
    try {
        const qsPedidos = await getDocs(collection(db, "pedidos"));
        qsPedidos.forEach(d => {
            let p = d.data();
            if (p.estado === 'Entregado' && p.fecha) {
                let fecha = new Date(p.fecha);
                if (fecha.getFullYear().toString() === anioSeleccionado) {
                    let mes = fecha.getMonth();
                    ventasMensuales[mes] += Number(p.total || 0);
                }
            }
        });

        let totalAnualVentas = ventasMensuales.reduce((a, b) => a + b, 0);
        document.getElementById('analisis-stat-ventas').textContent = `₡${totalAnualVentas.toLocaleString()}`;

        let inversionActual = 0;
        const qsMenu = await getDocs(collection(db, "menu"));
        qsMenu.forEach(d => {
            let s = d.data();
            if (s.categoria === 'Stock_Interno') {
                inversionActual += (Number(s.stockCantidad || 0) * Number(s.stockCompra || 0));
            }
        });
        
        document.getElementById('analisis-stat-compras').textContent = `₡${inversionActual.toLocaleString()}`;
        document.getElementById('analisis-stat-ganancia').textContent = `₡${(totalAnualVentas - inversionActual).toLocaleString()}`;

        const ctx = document.getElementById('graficoVentasCompras').getContext('2d');
        if (window.miGraficoFinanciero) {
            window.miGraficoFinanciero.destroy();
        }
        
        window.miGraficoFinanciero = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                datasets: [
                    {
                        label: 'Ingresos por Ventas (₡)',
                        data: ventasMensuales,
                        backgroundColor: '#d4af37'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#fff' } }
                },
                scales: {
                    x: { ticks: { color: '#a0a0a0' }, grid: { color: '#333' } },
                    y: { ticks: { color: '#a0a0a0' }, grid: { color: '#333' } }
                }
            }
        });
    } catch (e) {
        console.error(e);
        mostrarToast("Error al cargar análisis mensual.");
    }
}

window.agregarAlCarritoStock = function(id, nombre, precio, stockMax) {
    if(stockMax <= 0) {
        mostrarToast("⚠️ Ese artículo está agotado.");
        return;
    }
    
    let existente = carritoStock.find(item => item.id === id);
    if (existente) {
        if (existente.cantidad < stockMax) {
            existente.cantidad++;
            mostrarToast("✅ Añadida otra unidad al paquete.");
        } else {
            mostrarToast("⚠️ Límite de stock alcanzado.");
        }
    } else {
        carritoStock.push({ id, nombre, precio, max: stockMax, cantidad: 1 });
        mostrarToast("✅ Artículo añadido al paquete.");
    }
    renderizarCarritoStock();
}

window.actualizarCantidadStockInput = function(idx, valorStr) {
    let val = parseInt(valorStr);
    let item = carritoStock[idx];
    if (isNaN(val) || val < 1) {
        item.cantidad = 1;
    } else if (val > item.max) {
        item.cantidad = item.max;
        mostrarToast(`⚠️ El stock máximo disponible es ${item.max}.`);
    } else {
        item.cantidad = val;
    }
    renderizarCarritoStock();
}

window.renderizarCarritoStock = function() {
    const panel = document.getElementById('panel-carrito-stock');
    const lista = document.getElementById('lista-carrito-stock');
    const totalText = document.getElementById('total-carrito-stock');
    
    if (carritoStock.length === 0) {
        panel.style.display = 'none';
        return;
    }
    
    panel.style.display = 'block';
    let html = '';
    let suma = 0;
    
    carritoStock.forEach((item, idx) => {
        let sub = item.precio * item.cantidad;
        suma += sub;
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#222; padding:8px 12px; border-radius:8px; margin-bottom:6px; gap:10px;">
                <span style="color:white; font-size:14px; font-weight:bold; flex:1;">${item.nombre}</span>
                <div style="display:flex; align-items:center; gap:8px;">
                    <input type="number" min="1" max="${item.max}" value="${item.cantidad}" oninput="actualizarCantidadStockInput(${idx}, this.value)" style="width:75px; padding:6px; text-align:center; font-weight:bold; font-size:14px; background:#121212; border:1px solid var(--border-color); border-radius:6px; color:white;">
                    <button type="button" onclick="carritoStock.splice(${idx}, 1); renderizarCarritoStock();" style="background:rgba(239,68,68,0.2); color:#ef4444; border:none; padding:6px 10px; border-radius:6px; font-weight:bold; cursor:pointer;" title="Quitar">✕</button>
                </div>
                <span style="color:var(--color-principal); font-size:14px; font-weight:bold; min-width:80px; text-align:right;">₡${sub.toLocaleString()}</span>
            </div>
        `;
    });
    
    lista.innerHTML = html;
    totalText.textContent = `₡${suma.toLocaleString()}`;
}

window.abrirModalCobrarPaqueteStock = function() {
    if(carritoStock.length === 0) return;
    document.getElementById('modal-cobrar-paquete').style.display = 'flex';
}

window.cerrarModalCobrarPaquete = function() {
    document.getElementById('modal-cobrar-paquete').style.display = 'none';
}

window.confirmarVentaPaqueteStock = async function() {
    if (carritoStock.length === 0) return;
    
    const metodoPago = document.getElementById('paquete-metodo-pago').value;
    let totalVenta = 0;
    let detallesArray = [];

    try {
        for (let item of carritoStock) {
            totalVenta += (item.precio * item.cantidad);
            detallesArray.push(`${item.cantidad}x ${item.nombre}`);
            
            let nuevoStock = item.max - item.cantidad;
            await updateDoc(doc(db, "menu", item.id), { stockCantidad: nuevoStock });
        }

        await addDoc(collection(db, "pedidos"), {
            nombre: "Venta Paquete de Stock",
            detalle: detallesArray.join(" | "),
            total: totalVenta,
            estado: 'Entregado',
            metodoPago: metodoPago,
            fecha: new Date().toISOString()
        });

        mostrarToast(`✅ ¡Paquete vendido por ₡${totalVenta.toLocaleString()}!`);
        carritoStock = [];
        renderizarCarritoStock();
        cerrarModalCobrarPaquete();
        cargarAdminStock();
        calcularEstadisticasCaja(); 

    } catch(e) {
        console.error(e);
        mostrarToast("Error al procesar la venta en paquete.");
    }
}

async function inicializarCategoriasNube() {
    try {
        const qs = await getDocs(collection(db, "categorias"));
        categoriasNube = {};
        qs.forEach(d => { categoriasNube[d.id] = { idDoc: d.id, ...d.data() }; });

        for (let cat of categoriasDefault) {
            if (!categoriasNube[cat]) {
                await setDoc(doc(db, "categorias", cat), { nombre: cat, visible: true, icono: "" });
                categoriasNube[cat] = { idDoc: cat, nombre: cat, visible: true, icono: "" };
            }
        }
        renderizarCategoriasPublicas();
    } catch (e) { renderizarCategoriasPublicas(); }
}

function renderizarCategoriasPublicas() {
    const container = document.getElementById('category-container');
    if (!container) return;
    let html = `<button class="cat-btn active" onclick="filtrarMenuPorCategoria('Todos', this)">Todos</button>`;
    categoriasDefault.forEach(cat => {
        let catData = categoriasNube[cat] || {};
        let iconoHtml = catData.icono ? `<img src="${catData.icono}" class="cat-icon-img">` : '';
        let claseExtra = (cat === 'Ofertas') ? 'full-width' : '';
        html += `<button class="cat-btn ${claseExtra}" onclick="filtrarMenuPorCategoria('${cat}', this)">${iconoHtml} ${cat}</button>`;
    });
    container.innerHTML = html;
}

window.filtrarMenuPorCategoria = function(categoriaSeleccionada, elementoBtn) {
    document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
    if (elementoBtn) elementoBtn.classList.add('active');
    document.getElementById('input-buscador-menu').value = "";

    if (categoriaSeleccionada === 'Todos') {
        mostrarPlatos(listaPlatos);
    } else {
        const filtrados = listaPlatos.filter(p => p.categoria === categoriaSeleccionada);
        mostrarPlatos(filtrados);
    }
}

window.hacerClickCasillaSello = function(numeroCasilla) {
    if (!window.clienteActualId) {
        abrirLealtadModalSimple();
        mostrarToast("Primero ingresa tu nombre y teléfono.");
        return;
    }

    let selloEsperado = window.clienteActualSellos + 1;
    if (numeroCasilla <= window.clienteActualSellos) {
        mostrarToast("⭐ ¡Este sello ya lo tienes acumulado!");
        return;
    }

    if (numeroCasilla === selloEsperado) {
        document.getElementById('titulo-modal-sello').textContent = `⭐ Reclamar Sello #${numeroCasilla}`;
        document.getElementById('input-codigo-sello-rapido').value = "";
        document.getElementById('modal-sello-interactivo').style.display = 'flex';
    } else {
        mostrarToast(`⚠️ Debes completar primero el sello #${selloEsperado}.`);
    }
}

window.cerrarModalSelloInteractivo = function() {
    document.getElementById('modal-sello-interactivo').style.display = 'none';
}

window.validarYGanarSelloRapido = async function() {
    const codigoIngresado = document.getElementById('input-codigo-sello-rapido').value.trim();
    if (!codigoIngresado) { mostrarToast("Introduce el código."); return; }

    try {
        const docRefConfig = doc(db, "configuracion", "selloActivo");
        const docSnap = await getDoc(docRefConfig);

        if (docSnap.exists() && docSnap.data().codigo === codigoIngresado) {
            await setDoc(docRefConfig, { codigo: null });

            window.clienteActualSellos++;
            if (window.clienteActualSellos >= 5) {
                mostrarToast("🎉 ¡Felicidades! Completaste tus 5 sellos.");
                window.clienteActualSellos = 0;
            } else {
                mostrarToast("⭐ ¡Sello añadido con éxito!");
            }

            await updateDoc(doc(db, "clientes", window.clienteActualId), { sellos: window.clienteActualSellos });
            localStorage.setItem('alaska_cliente_sellos', window.clienteActualSellos);
            actualizarUILealtadPublica();
            cerrarModalSelloInteractivo();
        } else {
            mostrarToast("❌ Código incorrecto o ya fue utilizado.");
        }
    } catch(e) { mostrarToast("Error al validar código."); }
}

function actualizarUILealtadPublica() {
    const counterEl = document.getElementById('loyalty-counter-text');
    if (counterEl) counterEl.textContent = `${window.clienteActualSellos} / 5 Sellos`;
    let gridHTML = "";
    for (let i = 1; i <= 5; i++) {
        let filled = i <= window.clienteActualSellos;
        let isNext = i === (window.clienteActualSellos + 1);
        let claseBox = filled ? 'stamp-box filled' : (isNext ? 'stamp-box next-to-fill' : 'stamp-box');
        let contenido = filled ? '⭐' : i;
        gridHTML += `<div class="${claseBox}" onclick="hacerClickCasillaSello(${i})">${contenido}</div>`;
    }
    const gridEl = document.getElementById('public-stamps-grid');
    if (gridEl) gridEl.innerHTML = gridHTML;
}

window.abrirLealtadModal = function(e) { 
    if(e) e.preventDefault();
    if (!window.clienteActualId) document.getElementById('modal-lealtad').style.display = 'flex'; 
    else mostrarToast(`¡Hola ${window.clienteActualNombre}! Tienes ${window.clienteActualSellos}/5 sellos.`);
}
window.abrirLealtadModalSimple = function() { document.getElementById('modal-lealtad').style.display = 'flex'; }
window.cerrarLealtadModal = function() { document.getElementById('modal-lealtad').style.display = 'none'; }

window.registrarOIdentificarCliente = async function() {
    const nombre = document.getElementById('reg-nombre').value.trim();
    const telefono = document.getElementById('reg-telefono').value.trim();
    if (!nombre || !telefono) { mostrarToast("Ingresa nombre y teléfono."); return; }

    try {
        const q = query(collection(db, "clientes"), where("telefono", "==", telefono));
        const querySnapshot = await getDocs(q);
        let clienteId = null, sellos = 0;

        if (!querySnapshot.empty) {
            let docRef = querySnapshot.docs[0];
            clienteId = docRef.id;
            sellos = docRef.data().sellos || 0;
        } else {
            const nuevoDoc = await addDoc(collection(db, "clientes"), { nombre, telefono, sellos: 0, fechaRegistro: new Date().toLocaleDateString() });
            clienteId = nuevoDoc.id;
        }

        window.clienteActualId = clienteId;
        window.clienteActualNombre = nombre;
        window.clienteActualSellos = sellos;
        localStorage.setItem('alaska_cliente_doc_id', clienteId);
        localStorage.setItem('alaska_cliente_nombre', nombre);
        localStorage.setItem('alaska_cliente_sellos', sellos);

        actualizarUILealtadPublica();
        cerrarLealtadModal();
        mostrarToast("¡Bienvenido al Club Alaska, " + nombre + "!");
    } catch(e) { mostrarToast("Error al registrar."); }
}

function renderizarFormularioHorarios(horariosData = {}) {
    const container = document.getElementById('days-schedule-container');
    if (!container) return;
    container.innerHTML = "";
    diasSemana.forEach(dia => {
        let info = horariosData[dia] || { cerrado: false, apertura: "12:00", cierre: "22:00" };
        container.innerHTML += `
            <div class="day-schedule-card">
                <div class="day-header-flex">
                    <h4>${dia}</h4>
                    <label class="checkbox-label">
                        <input type="checkbox" id="chk-cerrado-${dia}" ${info.cerrado ? 'checked':''} onchange="toggleDiaCerrado('${dia}')" style="width:16px; height:16px;"> Cerrado
                    </label>
                </div>
                <div id="wrapper-horas-${dia}" style="display:${info.cerrado ? 'none':'flex'}; gap:10px; align-items:center;">
                    <input type="time" id="time-apertura-${dia}" value="${info.apertura || '12:00'}" style="flex:1;">
                    <span style="color:var(--text-muted);">a</span>
                    <input type="time" id="time-cierre-${dia}" value="${info.cierre || '22:00'}" style="flex:1;">
                </div>
            </div>
        `;
    });
}

window.toggleDiaCerrado = function(dia) {
    const chk = document.getElementById(`chk-cerrado-${dia}`);
    const wrapper = document.getElementById(`wrapper-horas-${dia}`);
    if(chk && wrapper) wrapper.style.display = chk.checked ? 'none' : 'flex';
}

window.guardarHorariosNube = async function() {
    let horariosObj = {};
    diasSemana.forEach(dia => {
        const cerrado = document.getElementById(`chk-cerrado-${dia}`).checked;
        const apertura = document.getElementById(`time-apertura-${dia}`).value;
        const cierre = document.getElementById(`time-cierre-${dia}`).value;
        horariosObj[dia] = { cerrado, apertura, cierre };
    });
    try {
        await setDoc(doc(db, "configuracion", "horariosAtencion"), horariosObj);
        mostrarToast("✅ ¡Horarios guardados en la nube!");
        verificarEstadoNegocioConHorarios(horariosObj);
    } catch(e) { mostrarToast("Error al guardar horarios."); }
}

function verificarEstadoNegocioConHorarios(horariosObj) {
    const now = new Date();
    const diaIndex = now.getDay();
    const nombreDiaHoy = diasSemana[diaIndex];
    const infoHoy = horariosObj[nombreDiaHoy];

    if (!infoHoy || infoHoy.cerrado) {
        negocioAbiertoGlobal = false;
        aplicarEstadoVisualNegocio(false, "Cerrado hoy");
        return;
    }

    const horaActualMinutos = now.getHours() * 60 + now.getMinutes();
    const [aperturaH, aperturaM] = (infoHoy.apertura || "12:00").split(':').map(Number);
    const [cierreH, cierreM] = (infoHoy.cierre || "22:00").split(':').map(Number);
    const aperturaMinutos = aperturaH * 60 + aperturaM;
    const cierreMinutos = cierreH * 60 + cierreM;

    if (horaActualMinutos >= aperturaMinutos && horaActualMinutos <= cierreMinutos) {
        negocioAbiertoGlobal = true;
        aplicarEstadoVisualNegocio(true, "Abierto");
    } else {
        negocioAbiertoGlobal = false;
        aplicarEstadoVisualNegocio(false, "Cerrado ahora");
    }
}

function aplicarEstadoVisualNegocio(abierto, texto) {
    const dotEl = document.getElementById('floating-status-dot');
    const textEl = document.getElementById('floating-status-text');
    const sideDotEl = document.getElementById('sidebar-status-dot');
    const sideTextEl = document.getElementById('sidebar-status-text');

    if (abierto) {
        if (dotEl) { dotEl.className = "status-dot"; dotEl.style.background = "#22c55e"; dotEl.style.boxShadow = "0 0 6px #22c55e"; }
        if (textEl) textEl.textContent = texto;
        if (sideDotEl) { sideDotEl.className = "status-dot"; sideDotEl.style.background = "#22c55e"; sideDotEl.style.boxShadow = "0 0 6px #22c55e"; }
        if (sideTextEl) sideTextEl.textContent = "NEGOCIO ABIERTO";
    } else {
        if (dotEl) { dotEl.className = "status-dot closed"; dotEl.style.background = "#ef4444"; dotEl.style.boxShadow = "0 0 6px #ef4444"; }
        if (textEl) textEl.textContent = texto;
        if (sideDotEl) { sideDotEl.className = "status-dot closed"; sideDotEl.style.background = "#ef4444"; sideDotEl.style.boxShadow = "0 0 6px #ef4444"; }
        if (sideTextEl) sideTextEl.textContent = "NEGOCIO CERRADO";
    }
    if (listaPlatos.length > 0) mostrarPlatos(listaPlatos);
}

window.togglePausarPedidosOnline = function() {
    pedidosOnlinePausados = !pedidosOnlinePausados;
    const btn = document.getElementById('btn-pausa-online');
    if (pedidosOnlinePausados) {
        btn.style.background = "rgba(239,68,68,0.2)";
        btn.style.color = "#ef4444";
        btn.style.borderColor = "#ef4444";
        btn.textContent = "🔴 Pedidos Pausados (Cocina Llena)";
        mostrarToast("⚠️ Pedidos online pausados temporalmente.");
    } else {
        btn.style.background = "rgba(16,185,129,0.2)";
        btn.style.color = "#10b981";
        btn.style.borderColor = "#10b981";
        btn.textContent = "🟢 Recibiendo Pedidos Online";
        mostrarToast("✅ Pedidos online reactivados.");
    }
    mostrarPlatos(listaPlatos);
}

window.actualizarTiempoEstimadoNube = async function(nuevoTiempo) {
    try {
        await setDoc(doc(db, "configuracion", "tiempoEstimado"), { texto: nuevoTiempo }, { merge: true });
        document.getElementById('banner-tiempo-estimado').innerHTML = `⏳ Tiempo estimado de preparación: <strong>${nuevoTiempo}</strong>`;
        mostrarToast(`⏱️ Tiempo estimado actualizado a: ${nuevoTiempo}`);
    } catch(e) { mostrarToast("Error al actualizar tiempo."); }
}

async function cargarConfiguracionVisualNube() {
    try {
        const docRef = doc(db, "configuracion", "estilosGenerales");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.nombreInterno && document.getElementById('input-nombre-interno')) document.getElementById('input-nombre-interno').value = data.nombreInterno;
            if (data.tituloPublico && document.getElementById('input-titulo-publico')) {
                document.getElementById('input-titulo-publico').value = data.tituloPublico;
                document.getElementById('public-title-display').textContent = data.tituloPublico;
            }
            if (data.subtituloPublico && document.getElementById('input-subtitulo-publico')) {
                document.getElementById('input-subtitulo-publico').value = data.subtituloPublico;
                document.getElementById('public-subtitle-display').textContent = data.subtituloPublico;
            }
            if (data.descAdicional && document.getElementById('input-desc-adicional')) document.getElementById('input-desc-adicional').value = data.descAdicional;
            
            if (data.colorPrincipal) {
                document.documentElement.style.setProperty('--color-principal', data.colorPrincipal);
                if(document.getElementById('input-color-principal')) document.getElementById('input-color-principal').value = data.colorPrincipal;
            }
            if (data.colorSecundario) {
                document.documentElement.style.setProperty('--color-secundario', data.colorSecundario);
                if(document.getElementById('input-color-secundario')) document.getElementById('input-color-secundario').value = data.colorSecundario;
            }
            if (data.colorOferta) {
                document.documentElement.style.setProperty('--color-oferta', data.colorOferta);
                if(document.getElementById('input-color-oferta')) document.getElementById('input-color-oferta').value = data.colorOferta;
            }
            if (data.colorFondo) {
                document.documentElement.style.setProperty('--bg-dark', data.colorFondo);
                if(document.getElementById('input-color-fondo')) document.getElementById('input-color-fondo').value = data.colorFondo;
            }
            if (data.logoUrl) {
                if(document.getElementById('logo-display')) document.getElementById('logo-display').src = data.logoUrl;
                if(document.getElementById('settings-logo-preview')) document.getElementById('settings-logo-preview').src = data.logoUrl;
            }
        }

        const docRefT = doc(db, "configuracion", "tiempoEstimado");
        const docSnapT = await getDoc(docRefT);
        if (docSnapT.exists() && docSnapT.data().texto) {
            let tVal = docSnapT.data().texto;
            document.getElementById('banner-tiempo-estimado').innerHTML = `⏳ Tiempo estimado de preparación: <strong>${tVal}</strong>`;
            if (document.getElementById('select-tiempo-admin')) document.getElementById('select-tiempo-admin').value = tVal;
        }

        const docRefH = doc(db, "configuracion", "horariosAtencion");
        const docSnapH = await getDoc(docRefH);
        let horariosData = docSnapH.exists() ? docSnapH.data() : {};
        renderizarFormularioHorarios(horariosData);
        verificarEstadoNegocioConHorarios(horariosData);
    } catch (e) { console.log(e); }
}

window.guardarAjustesYConfiguracionNube = async function() {
    const nombreInterno = document.getElementById('input-nombre-interno').value.trim();
    const tituloPublico = document.getElementById('input-titulo-publico').value.trim();
    const subtituloPublico = document.getElementById('input-subtitulo-publico').value.trim();
    const descAdicional = document.getElementById('input-desc-adicional').value.trim();
    const colorPrincipal = document.getElementById('input-color-principal').value;
    const colorSecundario = document.getElementById('input-color-secundario').value;
    const colorOferta = document.getElementById('input-color-oferta').value;
    const colorFondo = document.getElementById('input-color-fondo').value;
    const fileInput = document.getElementById('logoFileInput');

    const guardarFin = async (logoUrl) => {
        try {
            let dataObj = { nombreInterno, tituloPublico, subtituloPublico, descAdicional, colorPrincipal, colorSecundario, colorOferta, colorFondo };
            if(logoUrl) dataObj.logoUrl = logoUrl;
            await setDoc(doc(db, "configuracion", "estilosGenerales"), dataObj, { merge: true });
            
            document.documentElement.style.setProperty('--color-principal', colorPrincipal);
            document.documentElement.style.setProperty('--color-secundario', colorSecundario);
            document.documentElement.style.setProperty('--color-oferta', colorOferta);
            document.documentElement.style.setProperty('--bg-dark', colorFondo);
            if(logoUrl) {
                document.getElementById('logo-display').src = logoUrl;
                document.getElementById('settings-logo-preview').src = logoUrl;
            }
            mostrarToast("✅ ¡Ajustes guardados correctamente!");
        } catch(e) { mostrarToast("Error al guardar."); }
    };

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.readAsDataURL(fileInput.files[0]);
        reader.onload = async function() { await guardarFin(reader.result); };
    } else { await guardarFin(null); }
}

async function cargarAdminStock() {
    const tbody = document.getElementById('admin-tabla-stock-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Cargando stock...</td></tr>`;
    try {
        const qs = await getDocs(collection(db, "menu"));
        tbody.innerHTML = "";
        let hayStock = false;
        let totalInversion = 0;
        let totalVentaEst = 0;

        qs.forEach(d => {
            let s = { id: d.id, ...d.data() };
            if (s.categoria === 'Stock_Interno') {
                hayStock = true;
                let cant = Number(s.stockCantidad || 0);
                let comp = Number(s.stockCompra || 0);
                let vent = Number(s.precio || 0);

                totalInversion += (cant * comp);
                totalVentaEst += (cant * vent);

                tbody.innerHTML += `
                    <tr>
                        <td style="font-weight:700;">${s.nombre}</td>
                        <td style="font-weight:800; color:var(--color-principal);">${cant} unids</td>
                        <td>₡${comp.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td>₡${vent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <button type="button" onclick="agregarAlCarritoStock('${s.id}', '${s.nombre.replace(/'/g,"\\'")}', ${vent}, ${cant})" class="action-pill" style="padding:4px 8px; font-size:11px; background:rgba(59,130,246,0.2); color:#3b82f6; border-color:#3b82f6;">➕ Añadir a Paquete</button>
                                <button type="button" onclick="ajustarCantidadStock('${s.id}', ${cant}, 'aumentar')" class="action-pill" style="padding:4px 8px; font-size:11px; background:rgba(16,185,129,0.2); color:#10b981; border-color:#10b981;">+ Stock</button>
                                <button type="button" onclick="ajustarMermaStock('${s.id}', ${cant})" class="action-pill" style="padding:4px 8px; font-size:11px; background:rgba(239,68,68,0.2); color:#ef4444; border-color:#ef4444;">- Merma</button>
                                <button type="button" onclick="abrirModalEditarStock('${s.id}')" class="action-pill" style="padding:4px 8px; font-size:11px;">Editar</button>
                                <button type="button" onclick="eliminarStockItem('${s.id}')" class="action-pill" style="padding:4px 8px; font-size:11px; background:#5c2222; color:#ff6b6b; border:none;">Eliminar</button>
                            </div>
                        </td>
                    </tr>
                `;
            }
        });

        document.getElementById('stock-stat-inversion').textContent = `₡${totalInversion.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('stock-stat-venta').textContent = `₡${totalVentaEst.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('stock-stat-ganancia').textContent = `₡${(totalVentaEst - totalInversion).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        if (!hayStock) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No hay stock interno registrado.</td></tr>`;
    } catch(e) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ef4444;">Error al cargar stock.</td></tr>`; }
}

window.abrirModalEditarStock = async function(id) {
    try {
        const docSnap = await getDoc(doc(db, "menu", id));
        if (docSnap.exists()) {
            let d = docSnap.data();
            document.getElementById('stock-edit-id').value = id;
            document.getElementById('stock-input-nombre').value = d.nombre || '';
            document.getElementById('stock-input-cantidad').value = d.stockCantidad || 0;
            document.getElementById('stock-input-compra').value = d.stockCompra || 0;
            document.getElementById('stock-input-venta').value = d.precio || 0;
            document.getElementById('modal-stock-titulo').textContent = "✏️ Editar Artículo de Stock";
            document.getElementById('modal-stock-item').style.display = 'flex';
        }
    } catch(e) {
        mostrarToast("Error al cargar artículo.");
    }
}

window.eliminarStockItem = async function(id) {
    if (confirm("¿Estás seguro de eliminar este artículo del stock?")) {
        try {
            await deleteDoc(doc(db, "menu", id));
            mostrarToast("Artículo eliminado.");
            cargarAdminStock();
        } catch(e) {
            mostrarToast("Error al eliminar.");
        }
    }
}

window.ajustarCantidadStock = async function(idPlato, stockActual, tipoAccion) {
    let cantidadStr = prompt("¿Cuántas unidades deseas AUMENTAR al stock?", "1");
    if (!cantidadStr) return;
    let cantidad = Number(cantidadStr);
    if (isNaN(cantidad) || cantidad <= 0) { mostrarToast("Cantidad inválida."); return; }

    let nuevoStock = stockActual + cantidad;
    try {
        await updateDoc(doc(db, "menu", idPlato), { stockCantidad: nuevoStock });
        mostrarToast("✅ ¡Stock aumentado con éxito!");
        cargarAdminStock();
    } catch(e) { mostrarToast("Error al actualizar stock."); }
}

window.ajustarMermaStock = async function(idPlato, stockActual) {
    let cantidadStr = prompt(`Stock actual: ${stockActual} unidades\n¿Cuántas unidades deseas descontar por MERMA o pérdida?`, "1");
    if (!cantidadStr) return;
    let cantidad = Number(cantidadStr);
    if (isNaN(cantidad) || cantidad <= 0) { mostrarToast("Cantidad inválida."); return; }
    if (cantidad > stockActual) { mostrarToast("⚠️ No puedes restar más de las unidades disponibles en stock."); return; }

    let nuevoStock = stockActual - cantidad;
    try {
        await updateDoc(doc(db, "menu", idPlato), { stockCantidad: nuevoStock });
        mostrarToast(`📉 Se descontaron ${cantidad} unids por merma correctamente.`);
        cargarAdminStock();
    } catch(e) {
        mostrarToast("Error al registrar merma.");
    }
}

cargarConfiguracionVisualNube();
actualizarUILealtadPublica();
cargarMenu();
