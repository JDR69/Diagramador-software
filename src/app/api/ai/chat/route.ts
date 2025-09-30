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
      const prompt = `Crea un sistema de ${dominio} con 8 clases principales y sus relaciones. Responde ÚNICAMENTE con este JSON (sin explicaciones ni texto adicional):

{
  "classes": [
    { "name": "Clase1", "attributes": ["id", "nombre", "estado"] },
    { "name": "Clase2", "attributes": ["id", "descripcion"] }
  ],
  "relationships": [
    { "from": "Clase1", "to": "Clase2", "type": "association" }
  ]
}

Usa nombres de clases relevantes para ${dominio} y atributos apropiados.`
      
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
        console.error("❌ JSON Parse error:", error)
        return NextResponse.json({ error: "La IA no devolvió un JSON válido", raw: text }, { status: 500 })
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
          actions.push({ type: "add_relationship", data: { from: rel.from, to: rel.to, type: rel.type || "association" } })
        })
        console.log("🎯 Final actions array:", actions)
        return NextResponse.json({ response: `Diagrama de ${dominio} generado automáticamente.`, actions, diagram })
      } else {
        console.error("❌ Invalid diagram structure:", diagram)
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
