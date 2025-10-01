import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

// Función para generar diagramas predefinidos como fallback
function generateFallbackDiagram(dominio: string) {
  const templates: Record<string, any> = {
    hospital: {
      classes: [
        { name: "Paciente", attributes: ["id", "nombre", "fechaNacimiento", "telefono", "email"] },
        { name: "Doctor", attributes: ["id", "nombre", "especialidad", "telefono", "email"] },
        { name: "Enfermero", attributes: ["id", "nombre", "turno", "departamento"] },
        { name: "Consulta", attributes: ["id", "fecha", "diagnostico", "tratamiento"] },
        { name: "Habitacion", attributes: ["id", "numero", "tipo", "estado", "precio"] },
        { name: "Departamento", attributes: ["id", "nombre", "jefe", "presupuesto"] },
        { name: "HistorialMedico", attributes: ["id", "fecha", "observaciones", "medicamentos"] },
        { name: "Factura", attributes: ["id", "fecha", "monto", "estado", "metodoPago"] }
      ],
      relationships: [
        { from: "Paciente", to: "Consulta", type: "association", name: "consultas", cardinality: { from: "1", to: "*" } },
        { from: "Doctor", to: "Consulta", type: "association", name: "atiende", cardinality: { from: "1", to: "*" } },
        { from: "Paciente", to: "HistorialMedico", type: "composition", name: "historial", cardinality: { from: "1", to: "1" } },
        { from: "Paciente", to: "Habitacion", type: "association", name: "alojadoEn", cardinality: { from: "0..1", to: "*" } },
        { from: "Doctor", to: "Departamento", type: "aggregation", name: "perteneceA", cardinality: { from: "*", to: "1" } },
        { from: "Enfermero", to: "Departamento", type: "aggregation", name: "adscritoA", cardinality: { from: "*", to: "1" } },
        { from: "Consulta", to: "Factura", type: "association", name: "genera", cardinality: { from: "1", to: "0..1" } }
      ]
    },
    universidad: {
      classes: [
        { name: "Estudiante", attributes: ["id", "nombre", "email", "carrera", "semestre"] },
        { name: "Profesor", attributes: ["id", "nombre", "email", "departamento", "grado"] },
        { name: "Curso", attributes: ["id", "nombre", "codigo", "creditos", "semestre"] },
        { name: "Inscripcion", attributes: ["id", "fecha", "calificacion", "estado"] },
        { name: "Departamento", attributes: ["id", "nombre", "jefe", "presupuesto"] },
        { name: "Aula", attributes: ["id", "numero", "capacidad", "tipo", "edificio"] },
        { name: "Horario", attributes: ["id", "horaInicio", "horaFin", "dia", "semestre"] },
        { name: "Carrera", attributes: ["id", "nombre", "duracion", "creditos", "modalidad"] }
      ],
      relationships: [
        { from: "Estudiante", to: "Inscripcion", type: "association", name: "inscripciones", cardinality: { from: "1", to: "*" } },
        { from: "Curso", to: "Inscripcion", type: "association", name: "matriculas", cardinality: { from: "1", to: "*" } },
        { from: "Profesor", to: "Curso", type: "association", name: "imparte", cardinality: { from: "1", to: "*" } },
        { from: "Estudiante", to: "Carrera", type: "association", name: "cursa", cardinality: { from: "*", to: "1" } },
        { from: "Profesor", to: "Departamento", type: "aggregation", name: "adscritoA", cardinality: { from: "*", to: "1" } },
        { from: "Curso", to: "Horario", type: "composition", name: "horario", cardinality: { from: "1", to: "1..*" } },
        { from: "Horario", to: "Aula", type: "association", name: "dictadoEn", cardinality: { from: "*", to: "1" } }
      ]
    }
  }

  // Usar template específico o genérico
  const template = templates[dominio.toLowerCase()] || {
    classes: [
      { name: "Usuario", attributes: ["id", "nombre", "email", "fechaCreacion"] },
      { name: "Producto", attributes: ["id", "nombre", "precio", "categoria"] },
      { name: "Pedido", attributes: ["id", "fecha", "total", "estado"] },
      { name: "Categoria", attributes: ["id", "nombre", "descripcion"] },
      { name: "Direccion", attributes: ["id", "calle", "ciudad", "codigoPostal"] },
      { name: "Pago", attributes: ["id", "monto", "metodoPago", "fecha"] },
      { name: "Inventario", attributes: ["id", "cantidad", "ubicacion"] },
      { name: "Factura", attributes: ["id", "numero", "fecha", "impuestos"] }
    ],
    relationships: [
      { from: "Usuario", to: "Pedido", type: "association", name: "realiza", cardinality: { from: "1", to: "*" } },
      { from: "Pedido", to: "Producto", type: "association", name: "incluye", cardinality: { from: "1", to: "*" } },
      { from: "Producto", to: "Categoria", type: "association", name: "perteneceA", cardinality: { from: "*", to: "1" } },
      { from: "Usuario", to: "Direccion", type: "aggregation", name: "tiene", cardinality: { from: "1", to: "1..*" } },
      { from: "Pedido", to: "Pago", type: "association", name: "pago", cardinality: { from: "1", to: "1" } },
      { from: "Producto", to: "Inventario", type: "composition", name: "stock", cardinality: { from: "1", to: "1" } },
      { from: "Pedido", to: "Factura", type: "association", name: "factura", cardinality: { from: "1", to: "0..1" } }
    ]
  }

  return template
}

export async function POST(request: NextRequest) {
  try {
    const { message, diagramId } = await request.json()
    console.log("📨 Received message:", message)
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "No message provided" }, { status: 400 })
    }

    // Detectar comandos simples en español
    const actions: any[] = []
    let shortResponse = ""
    const addClassMatch = message.match(/añadir clase ([a-zA-Z0-9_]+)/i)
    if (addClassMatch) {
      actions.push({ type: "add_class", data: { name: addClassMatch[1] } })
      shortResponse = `Clase "${addClassMatch[1]}" añadida.`
    }
    const connectMatch = message.match(/conectar ([a-zA-Z0-9_]+) con ([a-zA-Z0-9_]+)/i)
    if (connectMatch) {
      actions.push({ type: "add_relationship", data: { from: connectMatch[1], to: connectMatch[2], type: "association" } })
      shortResponse = `Relación creada entre "${connectMatch[1]}" y "${connectMatch[2]}".`
    }
    const addAttrMatch = message.match(/agregar atributo ([a-zA-Z0-9_]+) a ([a-zA-Z0-9_]+)/i)
    if (addAttrMatch) {
      actions.push({ type: "add_attribute", data: { className: addAttrMatch[2], attribute: addAttrMatch[1] } })
      shortResponse = `Atributo "${addAttrMatch[1]}" añadido a "${addAttrMatch[2]}".`
    }

    // Nuevo: Generar diagrama de clases para cualquier dominio (regex más flexible)
  const diagramaMatch = message.match(/crear(?:\s+un)?\s+diagrama(?:\s+de)?\s+([a-zA-Z0-9áéíóúüñ ]+)/i)
    console.log("🔍 Checking diagram pattern:", diagramaMatch)
    if (diagramaMatch) {
      const dominio = diagramaMatch[1].trim()
      console.log("🎯 Detected domain:", dominio)
      const prompt = `Genera un diagrama de clases para un sistema de ${dominio} con ~8 clases.
Responde SOLO JSON válido (sin comentarios ni texto extra) siguiendo exactamente este esquema:
{
  "classes": [ { "name": "Nombre", "attributes": ["id", "campo1", "campo2"] } ],
  "relationships": [ { "from": "ClaseA", "to": "ClaseB", "type": "association|aggregation|composition|inheritance", "name": "nombreRelacion", "cardinality": { "from": "1|0..1|*|1..*", "to": "1|0..1|*|1..*" } } ]
}
Reglas:
- Variar "type" (usa varios distintos si tiene sentido).
- Incluir cardinalidad coherente en ambos extremos.
- El nombre de relación (name) en camelCase y semántico.
- Atributos deben incluir siempre "id" y otros relevantes.
Si alguna relación es jerárquica usa "inheritance" (solo si aplica).`
      
      console.log("🤖 Sending prompt to AI:", prompt)
      const { text } = await generateText({
        model: groq("llama-3.1-8b-instant"),
        prompt,
      })
      console.log("🤖 AI Raw response:", text)
      
      let diagram
      try {
        // Limpiar la respuesta antes de parsear
        const cleanText = text.trim().replace(/```json|```/g, '').trim()
        console.log("🧹 Cleaned text:", cleanText)
        diagram = JSON.parse(cleanText)
        console.log("✅ Parsed diagram:", diagram)
      } catch (error) {
  console.error("❌ JSON Parse error, usando fallback silencioso")
        // Fallback: crear diagrama predefinido para el dominio
        diagram = generateFallbackDiagram(dominio)
        console.log("🛡️ Fallback diagram:", diagram)
      }
      // Construir acciones para frontend
      if (diagram && diagram.classes && diagram.relationships) {
        console.log("🔧 Building actions from diagram...")
        diagram.classes.forEach((cls: any) => {
          actions.push({ type: "add_class", data: { name: cls.name } })
          if (Array.isArray(cls.attributes)) {
            cls.attributes.forEach((attr: string) => {
              actions.push({ type: "add_attribute", data: { className: cls.name, attribute: attr } })
            })
          }
        })
        diagram.relationships.forEach((rel: any) => {
          actions.push({ 
            type: "add_relationship", 
            data: { 
              from: rel.from, 
              to: rel.to, 
              type: rel.type || "association",
              cardinality: rel.cardinality || { from: "1", to: "1" },
              name: rel.name || `${rel.from}_${rel.to}`
            } 
          })
        })
        console.log("🎯 Final actions array:", actions)
        return NextResponse.json({ response: `Diagrama de ${dominio} generado automáticamente.`, actions, diagram })
      } else {
        return NextResponse.json({ response: `No se pudo generar diagrama para "${dominio}". Intenta reformular.`, actions: [] })
      }
    }

    // Si hay acción, responder corto
    if (actions.length > 0) {
      return NextResponse.json({ response: shortResponse, actions })
    }

    // Si no hay acción, usar Groq
    const prompt = message
    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt,
    })
    return NextResponse.json({ response: text, actions })
  } catch (error: any) {
    console.error("Error in AI chat endpoint:", error)
    return NextResponse.json({ error: "Error processing AI chat" }, { status: 500 })
  }
}
