const catMock = {
  "NACIONAL": {
    "DOCENTE": { "1111DH": "DOCENTE AULA", "2222DH": "DIRECTOR" },
    "ADMINISTRATIVO": { "3333AA": "SECRETARIA", "4444AA": "ASISTENTE" },
    "OBRERO": [
      { rango: "RANGO I", cargos: ["ASEADOR"], codigo_cargo: "OBO111" },
      { rango: "RANGO II", cargos: ["VIGILANTE"], codigo_cargo: "OBO222" }
    ]
  },
  "ESTADAL": {
    "DOCENTE": { "1111E": "DOC. ESTADAL I", "2222E": "DIR. ESTADAL" },
    "ADMINISTRATIVO": { "3333E": "SEC. ESTADAL" },
    "OBRERO": [
      { rango: "RANGO UNICO", cargos: ["MANTENIMIENTO E."], codigo_cargo: "OBE111" }
    ]
  }
};

const dep = "NACIONAL";
const tipo = "DOCENTE";

try {
  const data = catMock[dep][tipo];
  console.log("Data:", data);
  const cargosUnicos = [...new Set(Object.values(data))].sort();
  console.log("Cargos Unicos:", cargosUnicos);
} catch(e) {
  console.error("Error:", e);
}
