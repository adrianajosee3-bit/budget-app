import { useState, useEffect, useRef } from "react";

const QUINCENA_INICIAL = () => {
  const now = new Date();
  const q = now.getDate() <= 15 ? "Q1" : "Q2";
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${q}`;
};

const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const labelQuincena = (key) => {
  if (!key) return "";
  const [y, m, q] = key.split("-");
  const nombreMes = MESES_ES[parseInt(m) - 1];
  const nombreQ = q === "Q1" ? "1ra quincena" : "2da quincena";
  return `${nombreQ} · ${nombreMes} ${y}`;
};

const DATA_BASE = {
  sueldo: 800,
  categorias: [
    { id: 1, nombre: "Casa", gastos: [] },
    { id: 2, nombre: "Gastos Fijos", gastos: [] },
    { id: 3, nombre: "Ocio", gastos: [] },
  ],
  ahorros: {
    propositos: [
      { id: 1, nombre: "Casa", monto: 0, fijo: true },
      { id: 2, nombre: "Vitamina C", monto: 0, fijo: true },
      { id: 3, nombre: "Forros", monto: 0, fijo: false },
      { id: 4, nombre: "Carro", monto: 0, fijo: false },
      { id: 5, nombre: "Regalo", monto: 0, fijo: false },
    ],
    bancos: [
      { id: 1, nombre: "Multimoney", monto: 0 },
      { id: 2, nombre: "Bancovi", monto: 0 },
      { id: 3, nombre: "Pay", monto: 0 },
    ],
  },
};

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;
const TABS = ["Resumen", "Gastos", "Ahorros"];

function loadStorage() {
  try {
    const raw = localStorage.getItem("budget_app_v2");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveStorage(state) {
  try {
    localStorage.setItem("budget_app_v2", JSON.stringify(state));
  } catch {}
}

export default function App() {
  const [historial, setHistorial] = useState({});
  const [mesActual, setMesActual] = useState(QUINCENA_INICIAL());
  const [data, setData] = useState(DATA_BASE);
  const [tab, setTab] = useState("Resumen");
  const [catAbierta, setCatAbierta] = useState(null);
  const [nuevoGasto, setNuevoGasto] = useState({ nombre: "", monto: "" });
  const [nuevaCat, setNuevaCat] = useState("");
  const [nuevoProp, setNuevoProp] = useState("");
  const [nuevoBanco, setNuevoBanco] = useState("");
  const [modal, setModal] = useState(null);
  const [editSueldo, setEditSueldo] = useState(false);
  const [sueldoInput, setSueldoInput] = useState(800);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    const saved = loadStorage();
    if (saved) {
      setHistorial(saved.historial || {});
      setMesActual(saved.mesActual || QUINCENA_INICIAL());
      setData(saved.data || DATA_BASE);
    } else {
      const mes = QUINCENA_INICIAL();
      setMesActual(mes);
      setData(DATA_BASE);
      setHistorial({ [mes]: DATA_BASE });
    }
    mounted.current = true;
  }, []);

  useEffect(() => {
    if (!mounted.current) return;
    const nuevoHistorial = { ...historial, [mesActual]: data };
    setHistorial(nuevoHistorial);
    saveStorage({ historial: nuevoHistorial, mesActual, data });
  }, [data]);

  const mesesEnHistorial = Object.keys(historial).sort().reverse();
  const mesReciente = mesesEnHistorial[0] || mesActual;

  const cambiarMes = (mes) => {
    const nuevoHistorial = { ...historial, [mesActual]: data };
    const datosMes = nuevoHistorial[mes] || { ...DATA_BASE, sueldo: data.sueldo };
    setData(datosMes);
    setMesActual(mes);
    setHistorial(nuevoHistorial);
    saveStorage({ historial: nuevoHistorial, mesActual: mes, data: datosMes });
    setMenuAbierto(false);
    setTab("Resumen");
    setCatAbierta(null);
  };

  // FIX 1: lógica correcta de quincenas (Q1 → Q2 mismo mes, Q2 → Q1 mes siguiente)
  const nuevoMes = () => {
    const partes = mesActual.split("-");
    const year = parseInt(partes[0]);
    const month = parseInt(partes[1]) - 1;
    const q = partes[2];

    let sigKey;
    if (q === "Q1") {
      sigKey = `${year}-${String(month + 1).padStart(2, "0")}-Q2`;
    } else {
      const sigDate = new Date(year, month + 1, 1);
      sigKey = `${sigDate.getFullYear()}-${String(sigDate.getMonth() + 1).padStart(2, "0")}-Q1`;
    }

    const dataNueva = {
      ...data,
      categorias: data.categorias.map((c) => ({
        ...c,
        gastos: c.gastos.filter((g) => g.fijo).map((g) => ({ ...g, pagado: false })),
      })),
      ahorros: {
        ...data.ahorros,
        propositos: data.ahorros.propositos.map((p) => ({ ...p, monto: p.fijo ? p.monto : 0 })),
      },
    };

    const nuevoHistorial = { ...historial, [mesActual]: data, [sigKey]: dataNueva };
    setHistorial(nuevoHistorial);
    setMesActual(sigKey);
    setData(dataNueva);
    saveStorage({ historial: nuevoHistorial, mesActual: sigKey, data: dataNueva });
    setModal(null);
    setTab("Resumen");
  };

  // FIX 2: eliminar quincena del historial
  const eliminarQuincena = (mes) => {
    const nuevoHistorial = { ...historial };
    delete nuevoHistorial[mes];
    setHistorial(nuevoHistorial);
    saveStorage({ historial: nuevoHistorial, mesActual, data });
    setModal(null);
  };

  const esReadOnly = mesActual !== mesReciente;

  const totalGastos = data.categorias.reduce((sum, cat) => sum + cat.gastos.reduce((s, g) => s + parseFloat(g.monto || 0), 0), 0);
  const totalPagado = data.categorias.reduce((sum, cat) => sum + cat.gastos.filter(g => g.pagado).reduce((s, g) => s + parseFloat(g.monto || 0), 0), 0);
  const totalAhorros = data.ahorros.propositos.reduce((s, p) => s + parseFloat(p.monto || 0), 0);
  const totalBancos = data.ahorros.bancos.reduce((s, b) => s + parseFloat(b.monto || 0), 0);
  const libre = data.sueldo - totalGastos - totalAhorros;
  const pctGastos = Math.min((totalGastos / (data.sueldo || 1)) * 100, 100);
  const pctAhorros = Math.min((totalAhorros / (data.sueldo || 1)) * 100, 100);

  const agregarGasto = (catId) => {
    if (!nuevoGasto.nombre || !nuevoGasto.monto) return;
    setData((d) => ({ ...d, categorias: d.categorias.map((c) => c.id === catId ? { ...c, gastos: [...c.gastos, { id: Date.now(), nombre: nuevoGasto.nombre, monto: parseFloat(nuevoGasto.monto), fijo: false, pagado: false }] } : c) }));
    setNuevoGasto({ nombre: "", monto: "" });
  };
  const eliminarGasto = (catId, gastoId) => { setData((d) => ({ ...d, categorias: d.categorias.map((c) => c.id === catId ? { ...c, gastos: c.gastos.filter((g) => g.id !== gastoId) } : c) })); setModal(null); };
  const toggleFijo = (catId, gastoId) => setData((d) => ({ ...d, categorias: d.categorias.map((c) => c.id === catId ? { ...c, gastos: c.gastos.map((g) => g.id === gastoId ? { ...g, fijo: !g.fijo } : g) } : c) }));
  const togglePagado = (catId, gastoId) => setData((d) => ({ ...d, categorias: d.categorias.map((c) => c.id === catId ? { ...c, gastos: c.gastos.map((g) => g.id === gastoId ? { ...g, pagado: !g.pagado } : g) } : c) }));
  const agregarCategoria = () => { if (!nuevaCat.trim()) return; setData((d) => ({ ...d, categorias: [...d.categorias, { id: Date.now(), nombre: nuevaCat.trim(), gastos: [] }] })); setNuevaCat(""); };
  const eliminarCategoria = (catId) => { setData((d) => ({ ...d, categorias: d.categorias.filter((c) => c.id !== catId) })); setModal(null); };

  const updateProp = (id, val) => setData((d) => ({ ...d, ahorros: { ...d.ahorros, propositos: d.ahorros.propositos.map((p) => p.id === id ? { ...p, monto: parseFloat(val) || 0 } : p) } }));
  const toggleFijoProp = (id) => setData((d) => ({ ...d, ahorros: { ...d.ahorros, propositos: d.ahorros.propositos.map((p) => p.id === id ? { ...p, fijo: !p.fijo } : p) } }));
  const eliminarProp = (id) => { setData((d) => ({ ...d, ahorros: { ...d.ahorros, propositos: d.ahorros.propositos.filter((p) => p.id !== id) } })); setModal(null); };
  const agregarProp = () => { if (!nuevoProp.trim()) return; setData((d) => ({ ...d, ahorros: { ...d.ahorros, propositos: [...d.ahorros.propositos, { id: Date.now(), nombre: nuevoProp.trim(), monto: 0, fijo: false }] } })); setNuevoProp(""); };
  const updateBanco = (id, val) => setData((d) => ({ ...d, ahorros: { ...d.ahorros, bancos: d.ahorros.bancos.map((b) => b.id === id ? { ...b, monto: parseFloat(val) || 0 } : b) } }));
  const eliminarBanco = (id) => { setData((d) => ({ ...d, ahorros: { ...d.ahorros, bancos: d.ahorros.bancos.filter((b) => b.id !== id) } })); setModal(null); };
  const agregarBanco = () => { if (!nuevoBanco.trim()) return; setData((d) => ({ ...d, ahorros: { ...d.ahorros, bancos: [...d.ahorros.bancos, { id: Date.now(), nombre: nuevoBanco.trim(), monto: 0 }] } })); setNuevoBanco(""); };

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", fontFamily: "'DM Mono','Courier New',monospace", color: "#f0ebe0", maxWidth: 480, margin: "0 auto", position: "relative" }}>

      {/* Menú lateral */}
      {menuAbierto && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div onClick={() => setMenuAbierto(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 290, background: "#111", borderLeft: "1px solid #1f1f1f", padding: 24, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#555", textTransform: "uppercase" }}>Historial 🔥</div>
              <button onClick={() => setMenuAbierto(false)} style={{ background: "none", border: "none", color: "#555", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            {mesesEnHistorial.map((mes, i) => {
              const d = historial[mes];
              const tg = d ? d.categorias.reduce((s, c) => s + c.gastos.reduce((ss, g) => ss + parseFloat(g.monto || 0), 0), 0) : 0;
              const esActivo = i === 0;
              return (
                // FIX 2: botón × por quincena para eliminarla (excepto la activa)
                <div key={mes} style={{ position: "relative", marginBottom: 8 }}>
                  <button onClick={() => cambiarMes(mes)} style={{
                    width: "100%", textAlign: "left",
                    background: mesActual === mes ? "#1a1a1a" : "transparent",
                    border: mesActual === mes ? `1px solid ${esActivo ? "#c8f060" : "#60c8f0"}` : "1px solid #1f1f1f",
                    borderRadius: 10, padding: "14px", color: "#f0ebe0",
                    cursor: "pointer", fontFamily: "inherit",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: esActivo ? 0 : 20 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{labelQuincena(mes)}</span>
                      {esActivo && <span style={{ fontSize: 9, color: "#c8f060", letterSpacing: 1 }}>ACTUAL</span>}
                    </div>
                    <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>gastos {fmt(tg)} · sueldo {fmt(d?.sueldo || 0)}</div>
                  </button>
                  {!esActivo && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModal({ tipo: "eliminarQuincena", mes, label: labelQuincena(mes) });
                        setMenuAbierto(false);
                      }}
                      style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 4px" }}>
                      ×
                    </button>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: "auto", paddingTop: 20, borderTop: "1px solid #1a1a1a" }}>
              <button onClick={() => { setModal({ tipo: "nuevoMes" }); setMenuAbierto(false); }}
                style={{ width: "100%", background: "#c8f060", border: "none", borderRadius: 10, padding: 14, color: "#0d0d0d", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", letterSpacing: 1 }}>
                + Agregar quincena
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "28px 24px 0", borderBottom: "1px solid #1f1f1f" }}>
        {esReadOnly && (
          <div style={{ background: "#1a1400", border: "1px solid #3a3000", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 10, color: "#f0c060", letterSpacing: 1 }}>
            👁 Viendo historial · solo lectura
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#555", textTransform: "uppercase", marginBottom: 2 }}>{labelQuincena(mesActual)}</div>
            {editSueldo && !esReadOnly ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: "#c8f060" }}>$</span>
                <input type="number" value={sueldoInput} onChange={(e) => setSueldoInput(e.target.value)}
                  onBlur={() => { setData((d) => ({ ...d, sueldo: parseFloat(sueldoInput) || 0 })); setEditSueldo(false); }}
                  autoFocus style={{ background: "transparent", border: "none", borderBottom: "1px solid #c8f060", color: "#c8f060", fontSize: 28, fontWeight: 700, width: 100, outline: "none", fontFamily: "inherit" }} />
              </div>
            ) : (
              <div onClick={() => { if (!esReadOnly) { setEditSueldo(true); setSueldoInput(data.sueldo); } }}
                style={{ fontSize: 32, fontWeight: 700, color: "#c8f060", cursor: esReadOnly ? "default" : "pointer", letterSpacing: -1 }}>
                {fmt(data.sueldo)}
              </div>
            )}
            <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{esReadOnly ? "sueldo" : "sueldo · toca para editar"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>disponible</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: libre >= 0 ? "#c8f060" : "#ff6b6b" }}>{fmt(libre)}</div>
            </div>
            <button onClick={() => setMenuAbierto(true)}
              style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 22, padding: "2px 0", marginTop: 4, lineHeight: 1 }}>☰</button>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ height: 6, background: "#1a1a1a", borderRadius: 999, overflow: "hidden", display: "flex" }}>
            <div style={{ width: `${pctGastos}%`, background: "#ff6b6b", transition: "width 0.4s" }} />
            <div style={{ width: `${pctAhorros}%`, background: "#60c8f0", transition: "width 0.4s" }} />
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 10, color: "#555", flexWrap: "wrap" }}>
            <span><span style={{ color: "#ff6b6b" }}>■</span> gastos {fmt(totalGastos)}</span>
            <span><span style={{ color: "#4caf50" }}>■</span> pagado {fmt(totalPagado)}</span>
            <span><span style={{ color: "#60c8f0" }}>■</span> ahorros {fmt(totalAhorros)}</span>
          </div>
        </div>

        <div style={{ display: "flex" }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "10px 0", background: "transparent", border: "none",
              borderBottom: tab === t ? "2px solid #c8f060" : "2px solid transparent",
              color: tab === t ? "#c8f060" : "#444", fontSize: 11, letterSpacing: 2,
              textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 20px", paddingBottom: 100 }}>

        {/* RESUMEN */}
        {tab === "Resumen" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Total gastos", val: totalGastos, color: "#ff6b6b" },
                { label: "Ya pagado", val: totalPagado, color: "#4caf50" },
                { label: "Total ahorros", val: totalAhorros, color: "#60c8f0" },
                { label: "Disponible", val: libre, color: libre >= 0 ? "#c8f060" : "#ff6b6b" },
              ].map((item) => (
                <div key={item.label} style={{ background: "#131313", borderRadius: 12, padding: 16, border: "1px solid #1f1f1f" }}>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{fmt(item.val)}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#444", textTransform: "uppercase", marginBottom: 12 }}>Por categoría</div>
            {data.categorias.map((cat) => {
              const total = cat.gastos.reduce((s, g) => s + parseFloat(g.monto || 0), 0);
              const pagados = cat.gastos.filter(g => g.pagado).reduce((s, g) => s + parseFloat(g.monto || 0), 0);
              const pct = (total / (data.sueldo || 1)) * 100;
              const pctP = total ? (pagados / total) * 100 : 0;
              return (
                <div key={cat.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12 }}>{cat.nombre}</span>
                    <span style={{ fontSize: 12, color: "#ff6b6b" }}>{fmt(total)}</span>
                  </div>
                  <div style={{ height: 4, background: "#1a1a1a", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: "#ff6b6b", borderRadius: 999, position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pctP}%`, background: "#4caf50", borderRadius: 999 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: "#444", marginTop: 3 }}>{cat.gastos.filter(g => g.pagado).length}/{cat.gastos.length} pagados</div>
                </div>
              );
            })}
          </div>
        )}

        {/* GASTOS */}
        {tab === "Gastos" && (
          <div>
            {data.categorias.map((cat) => {
              const totalCat = cat.gastos.reduce((s, g) => s + parseFloat(g.monto || 0), 0);
              const abierta = catAbierta === cat.id;
              return (
                <div key={cat.id} style={{ marginBottom: 12, background: "#131313", borderRadius: 14, border: "1px solid #1f1f1f", overflow: "hidden" }}>
                  <div onClick={() => setCatAbierta(abierta ? null : cat.id)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, cursor: "pointer" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{cat.nombre}</div>
                      <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{cat.gastos.filter(g => g.pagado).length}/{cat.gastos.length} pagados</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#ff6b6b" }}>{fmt(totalCat)}</div>
                      <span style={{ color: "#333", fontSize: 14 }}>{abierta ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {abierta && (
                    <div style={{ padding: "0 16px 16px" }}>
                      <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 9, color: "#444", letterSpacing: 1 }}>
                        <span style={{ color: "#4caf50" }}>● pagado</span>
                        <span style={{ color: "#c8f060" }}>F = próximo mes</span>
                      </div>
                      {cat.gastos.length === 0 && (
                        <div style={{ fontSize: 11, color: "#333", padding: "8px 0", textAlign: "center" }}>sin gastos aún</div>
                      )}
                      {cat.gastos.map((g) => (
                        <div key={g.id} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "10px 0", borderBottom: "1px solid #1a1a1a",
                          opacity: g.pagado ? 0.5 : 1, transition: "opacity 0.2s",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                            <button onClick={() => !esReadOnly && togglePagado(cat.id, g.id)}
                              style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: g.pagado ? "#4caf50" : "transparent", border: g.pagado ? "none" : "1px solid #333", cursor: esReadOnly ? "default" : "pointer", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {g.pagado ? "✓" : ""}
                            </button>
                            <button onClick={() => !esReadOnly && toggleFijo(cat.id, g.id)}
                              style={{ width: 22, height: 22, borderRadius: 4, flexShrink: 0, background: g.fijo ? "#c8f060" : "transparent", border: g.fijo ? "none" : "1px solid #333", cursor: esReadOnly ? "default" : "pointer", fontSize: 9, color: "#0d0d0d", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {g.fijo ? "F" : ""}
                            </button>
                            <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: g.pagado ? "line-through" : "none", color: g.pagado ? "#555" : "#f0ebe0" }}>{g.nombre}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: g.pagado ? "#555" : "#f0ebe0" }}>{fmt(g.monto)}</span>
                            {!esReadOnly && (
                              <button onClick={() => setModal({ tipo: "eliminarGasto", catId: cat.id, gastoId: g.id, nombre: g.nombre })}
                                style={{ background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}>×</button>
                            )}
                          </div>
                        </div>
                      ))}

                      {!esReadOnly && (
                        <>
                          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                            <input placeholder="nombre del gasto" value={nuevoGasto.nombre} onChange={(e) => setNuevoGasto((g) => ({ ...g, nombre: e.target.value }))} style={inputStyle} />
                            <input placeholder="monto" type="number" value={nuevoGasto.monto} onChange={(e) => setNuevoGasto((g) => ({ ...g, monto: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && agregarGasto(cat.id)} style={{ ...inputStyle, width: 85 }} />
                            <button onClick={() => agregarGasto(cat.id)} style={btnPrimary}>+</button>
                          </div>
                          <button onClick={() => setModal({ tipo: "eliminarCat", id: cat.id, nombre: cat.nombre })}
                            style={{ marginTop: 12, background: "none", border: "none", color: "#2a2a2a", fontSize: 10, cursor: "pointer", letterSpacing: 1 }}>
                            eliminar categoría
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {!esReadOnly && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input placeholder="+ nueva categoría" value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregarCategoria()} style={inputStyle} />
                <button onClick={agregarCategoria} style={btnPrimary}>+</button>
              </div>
            )}
          </div>
        )}

        {/* AHORROS */}
        {tab === "Ahorros" && (
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#444", textTransform: "uppercase", marginBottom: 12 }}>Propósitos</div>
            {data.ahorros.propositos.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, background: "#131313", borderRadius: 10, padding: "12px 14px", border: "1px solid #1f1f1f" }}>
                <button onClick={() => !esReadOnly && toggleFijoProp(p.id)}
                  style={{ width: 22, height: 22, borderRadius: 4, flexShrink: 0, background: p.fijo ? "#60c8f0" : "transparent", border: p.fijo ? "none" : "1px solid #333", cursor: esReadOnly ? "default" : "pointer", fontSize: 9, color: "#0d0d0d", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {p.fijo ? "F" : ""}
                </button>
                <span style={{ flex: 1, fontSize: 12 }}>{p.nombre}</span>
                <input type="number" value={p.monto || ""} onChange={(e) => !esReadOnly && updateProp(p.id, e.target.value)} placeholder="0" readOnly={esReadOnly}
                  style={{ ...inputStyle, width: 90, textAlign: "right", opacity: esReadOnly ? 0.5 : 1 }} />
                {!esReadOnly && <button onClick={() => setModal({ tipo: "eliminarProp", id: p.id, nombre: p.nombre })} style={{ background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: 18 }}>×</button>}
              </div>
            ))}
            {!esReadOnly && (
              <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
                <input placeholder="nuevo propósito" value={nuevoProp} onChange={(e) => setNuevoProp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregarProp()} style={inputStyle} />
                <button onClick={agregarProp} style={btnPrimary}>+</button>
              </div>
            )}

            <div style={{ background: "#0a1a24", borderRadius: 10, padding: "12px 14px", marginBottom: 28, border: "1px solid #1a2a34", marginTop: esReadOnly ? 16 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#60c8f0", letterSpacing: 1 }}>TOTAL PROPÓSITOS</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#60c8f0" }}>{fmt(totalAhorros)}</span>
              </div>
            </div>

            <div style={{ fontSize: 10, letterSpacing: 3, color: "#444", textTransform: "uppercase", marginBottom: 12 }}>Bancos</div>
            {data.ahorros.bancos.map((b) => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, background: "#131313", borderRadius: 10, padding: "12px 14px", border: "1px solid #1f1f1f" }}>
                <span style={{ flex: 1, fontSize: 12 }}>{b.nombre}</span>
                <input type="number" value={b.monto || ""} onChange={(e) => !esReadOnly && updateBanco(b.id, e.target.value)} placeholder="0" readOnly={esReadOnly}
                  style={{ ...inputStyle, width: 90, textAlign: "right", opacity: esReadOnly ? 0.5 : 1 }} />
                {!esReadOnly && <button onClick={() => setModal({ tipo: "eliminarBanco", id: b.id, nombre: b.nombre })} style={{ background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: 18 }}>×</button>}
              </div>
            ))}
            {!esReadOnly && (
              <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
                <input placeholder="nuevo banco" value={nuevoBanco} onChange={(e) => setNuevoBanco(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregarBanco()} style={inputStyle} />
                <button onClick={agregarBanco} style={btnPrimary}>+</button>
              </div>
            )}

            <div style={{ background: "#1a1a0a", borderRadius: 10, padding: "12px 14px", border: "1px solid #2a2a14", marginTop: esReadOnly ? 16 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "#f0c060", letterSpacing: 1 }}>TOTAL EN BANCOS</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#f0c060" }}>{fmt(totalBancos)}</span>
              </div>
              {Math.abs(totalBancos - totalAhorros) > 0.01 && (
                <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>diferencia vs propósitos: {fmt(totalBancos - totalAhorros)}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#131313", borderRadius: "20px 20px 0 0", padding: 28, width: "100%", maxWidth: 480, border: "1px solid #1f1f1f" }}>

            {modal.tipo === "nuevoMes" && (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Iniciar nueva quincena</div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 24, lineHeight: 1.7 }}>
                  Gastos marcados <span style={{ color: "#c8f060" }}>F</span> se copian sin marcar como pagados. Variables desaparecen. Propósitos <span style={{ color: "#60c8f0" }}>F</span> mantienen monto.
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setModal(null)} style={{ ...btnSecondary, flex: 1 }}>Cancelar</button>
                  <button onClick={nuevoMes} style={{ ...btnPrimary, flex: 1 }}>Confirmar</button>
                </div>
              </>
            )}

            {/* FIX 2: modal para confirmar eliminación de quincena */}
            {modal.tipo === "eliminarQuincena" && (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>¿Eliminar "{modal.label}"?</div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 24, lineHeight: 1.7 }}>
                  Se borrará del historial permanentemente. Esta acción no se puede deshacer.
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setModal(null)} style={{ ...btnSecondary, flex: 1 }}>Cancelar</button>
                  <button onClick={() => eliminarQuincena(modal.mes)} style={{ ...btnDanger, flex: 1 }}>Eliminar</button>
                </div>
              </>
            )}

            {["eliminarCat","eliminarProp","eliminarBanco","eliminarGasto"].includes(modal.tipo) && (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>¿Eliminar "{modal.nombre}"?</div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 24 }}>Esta acción no se puede deshacer.</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setModal(null)} style={{ ...btnSecondary, flex: 1 }}>Cancelar</button>
                  <button onClick={() => {
                    if (modal.tipo === "eliminarCat") eliminarCategoria(modal.id);
                    if (modal.tipo === "eliminarProp") eliminarProp(modal.id);
                    if (modal.tipo === "eliminarBanco") eliminarBanco(modal.id);
                    if (modal.tipo === "eliminarGasto") eliminarGasto(modal.catId, modal.gastoId);
                  }} style={{ ...btnDanger, flex: 1 }}>Eliminar</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a",
  borderRadius: 8, padding: "10px 12px", color: "#f0ebe0",
  fontSize: 12, fontFamily: "'DM Mono','Courier New',monospace", outline: "none",
};
const btnPrimary = {
  background: "#c8f060", border: "none", borderRadius: 8,
  padding: "10px 16px", color: "#0d0d0d", fontWeight: 700,
  fontSize: 16, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
};
const btnSecondary = {
  background: "transparent", border: "1px solid #2a2a2a", borderRadius: 8,
  padding: "12px", color: "#666", fontSize: 12, cursor: "pointer",
  fontFamily: "inherit", letterSpacing: 1, textTransform: "uppercase",
};
const btnDanger = {
  background: "#ff3333", border: "none", borderRadius: 8,
  padding: "12px", color: "#fff", fontWeight: 700,
  fontSize: 12, cursor: "pointer", fontFamily: "inherit",
};