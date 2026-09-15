import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let listaPlatos = [];

async function cargarMenuPublico() {
    try {
        const querySnapshot = await getDocs(collection(db, "menu"));
        listaPlatos = [];
        querySnapshot.forEach((docSnap) => { listaPlatos.push({ id: docSnap.id, ...docSnap.data() }); });
        mostrarPlatosPublicos(listaPlatos);
    } catch (error) { console.log("Error al cargar menú:", error); }
}

function mostrarPlatosPublicos(platos) {
    const menuGrid = document.getElementById("menu-grid");
    if (!menuGrid) return;
    menuGrid.innerHTML = "";
    const visibles = platos.filter(p => p.categoria !== 'Stock_Interno');
    
    if (visibles.length === 0) {
        menuGrid.innerHTML = "<p style='text-align:center; color:var(--text-muted);'>No hay platos disponibles.</p>";
        return;
    }
    
    visibles.forEach((plato) => {
        let imagen = plato.imagenUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80';
        menuGrid.innerHTML += `
            <div class="food-card">
                <div class="card-image-container">
                    <img src="${imagen}" alt="${plato.nombre}">
                </div>
                <div class="card-content">
                    <h3>${plato.nombre}</h3>
                    <div class="price">¢${Number(plato.precio).toLocaleString()}</div>
                    <button class="order-btn" onclick="alert('Módulo de pedido en línea')">Pedir</button>
                </div>
            </div>
        `;
    });
}

window.filtrarMenuPorTexto = function(textoBusqueda) {
    let texto = textoBusqueda.toLowerCase().trim();
    if (!texto) {
        mostrarPlatosPublicos(listaPlatos);
        return;
    }
    const filtrados = listaPlatos.filter(p => 
        p.categoria !== 'Stock_Interno' && 
        (p.nombre.toLowerCase().includes(texto) || (p.descripcion && p.descripcion.toLowerCase().includes(texto)))
    );
    mostrarPlatosPublicos(filtrados);
}

cargarMenuPublico();

