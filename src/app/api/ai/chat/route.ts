import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

export async function POST(request: NextRequest) {
  try {
    const { message, diagramId } = await request.json()
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

    // Nuevo: Generar diagrama de clases para cualquier dominio
    const diagramaMatch = message.match(/crear diagrama de ([a-zA-Z0-9_ ]+)/i)
    if (diagramaMatch) {
      const dominio = diagramaMatch[1].trim()
      const prompt = `Genera una estructura de diagrama de clases para un sistema de ${dominio} con aproximadamente 8 entidades principales, cada una con atributos relevantes (id, nombre, estado, etc) y relaciones entre ellas. Devuelve la información en formato JSON con este esquema:\n{
        "classes": [
          { "name": "NombreClase", "attributes": ["id", "nombre", "estado", ...] },
          ...
        ],
        "relationships": [
          { "from": "ClaseA", "to": "ClaseB", "type": "association" },
          ...
        ]
      }\nNo expliques nada, solo devuelve el JSON.`
      const { text } = await generateText({
        model: groq("llama-3.1-8b-instant"),
        prompt,
      })
      let diagram
      try {
        diagram = JSON.parse(text)
      } catch {
        return NextResponse.json({ error: "La IA no devolvió un JSON válido", raw: text }, { status: 500 })
      }
      // Construir acciones para frontend
      if (diagram && diagram.classes && diagram.relationships) {
        diagram.classes.forEach((cls: any) => {
          actions.push({ type: "add_class", data: { name: cls.name } })
          if (Array.isArray(cls.attributes)) {
            cls.attributes.forEach((attr: string) => {
              actions.push({ type: "add_attribute", data: { className: cls.name, attribute: attr } })
            })
          }
        })
        diagram.relationships.forEach((rel: any) => {
          actions.push({ type: "add_relationship", data: { from: rel.from, to: rel.to, type: rel.type || "association" } })
        })
        return NextResponse.json({ response: `Diagrama de ${dominio} generado automáticamente.`, actions, diagram })
      } else {
        return NextResponse.json({ error: "La IA no devolvió la estructura esperada", raw: text }, { status: 500 })
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
