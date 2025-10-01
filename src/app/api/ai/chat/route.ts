import { type NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { groq } from '@ai-sdk/groq'

// Fallback sencillo si el modelo no devuelve JSON válido
function generateFallbackDiagram(domain: string) {
  const base = (s: string) => s.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('')
  const root = base(domain || 'Sistema')
  return {
    classes: [
      { name: `${root}Principal`, attributes: ['id','nombre','estado'] },
      { name: `${root}Item`, attributes: ['id','codigo','descripcion'] },
      { name: `${root}Usuario`, attributes: ['id','nombre','email'] },
      { name: `${root}Transaccion`, attributes: ['id','fecha','monto'] }
    ],
    relationships: [
      { from: `${root}Principal`, to: `${root}Item`, type: 'composition', name: 'contieneItems', cardinality: { from: '1', to: '*' } },
      { from: `${root}Usuario`, to: `${root}Transaccion`, type: 'association', name: 'realizaTransacciones', cardinality: { from: '1', to: '*' } },
      { from: `${root}Principal`, to: `${root}Usuario`, type: 'aggregation', name: 'gestionaUsuarios', cardinality: { from: '1', to: '*' } }
    ]
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    const actions: any[] = []
    // Comandos simples
    const mAdd = message.match(/añadir clase ([a-zA-Z0-9_]+)/i)
    if (mAdd) {
      actions.push({ type: 'add_class', data: { name: mAdd[1] } })
      return NextResponse.json({ response: `Clase ${mAdd[1]} añadida.`, actions })
    }
    const mRel = message.match(/conectar ([a-zA-Z0-9_]+) con ([a-zA-Z0-9_]+)/i)
    if (mRel) {
      actions.push({ type: 'add_relationship', data: { from: mRel[1], to: mRel[2], type: 'association' } })
      return NextResponse.json({ response: 'Relación creada.', actions })
    }
    const mAttr = message.match(/agregar atributo ([a-zA-Z0-9_]+) a ([a-zA-Z0-9_]+)/i)
    if (mAttr) {
      actions.push({ type: 'add_attribute', data: { className: mAttr[2], attribute: mAttr[1] } })
      return NextResponse.json({ response: 'Atributo añadido.', actions })
    }

    // Prompt extendido con ':'
    const longMatch = message.match(/^(?:crear\s+|crea\s+)?diagrama(?:\s+personalizado)?\s*:\s*([\s\S]{20,1000})$/i)
    if (longMatch) {
      const specRaw = longMatch[1].trim().slice(0, 900)
      const countMatch = specRaw.match(/(\d{1,2})\s*(?:clases|classes)/i)
      const target = countMatch ? Math.min(parseInt(countMatch[1], 10), 20) : 8
      const prompt = `Genera SOLO JSON de un diagrama UML según: "${specRaw}"\nReglas: ${target} clases aprox, atributos (id + 2-6 más), relaciones con type/name/cardinality, sin texto extra. Formato: {"classes":[{"name":"X","attributes":["id","campo"]}],"relationships":[{"from":"A","to":"B","type":"association","name":"rel","cardinality":{"from":"1","to":"*"}}]}`
      const { text } = await generateText({ model: groq('llama-3.1-8b-instant'), prompt })
      let diagram: any
      try {
        diagram = JSON.parse(text.trim().replace(/```json|```/g, '').trim())
      } catch {
        const words = Array.from(new Set(specRaw.split(/[^a-zA-Záéíóúüñ0-9]+/).filter(w => w.length > 4))).slice(0, target)
        diagram = { classes: words.map(w => ({ name: w[0].toUpperCase() + w.slice(1), attributes: ['id', 'nombre', 'estado'] })), relationships: [] }
      }
      if (diagram?.classes) {
        diagram.classes.forEach((c: any) => {
          actions.push({ type: 'add_class', data: { name: c.name } })
          if (Array.isArray(c.attributes)) c.attributes.forEach((a: string) => actions.push({ type: 'add_attribute', data: { className: c.name, attribute: a } }))
        })
        if (Array.isArray(diagram.relationships)) {
          diagram.relationships.forEach((r: any) => {
            if (r?.from && r?.to) actions.push({ type: 'add_relationship', data: { from: r.from, to: r.to, type: r.type || 'association', cardinality: r.cardinality || { from: '1', to: '1' }, name: r.name || `${r.from}_${r.to}` } })
          })
        }
      }
      return NextResponse.json({ response: 'Diagrama generado.', actions, diagram })
    }

    // Comando corto "crear diagrama ..."
    const shortMatch = message.match(/^(?:crear|crea|generar|genera)\s+(?:un\s+)?diagrama(?:\s+de)?\s+([^\n]{3,200})/i)
    if (shortMatch) {
      const domainRaw = shortMatch[1].split(/\.|\n/)[0].trim()
      const countMatch = domainRaw.match(/(\d{1,2})\s*(?:clases|classes)/i)
      const target = countMatch ? Math.min(parseInt(countMatch[1], 10), 20) : 8
      const cleaned = domainRaw.replace(/[,;]+/g, ' ').replace(/[^a-zA-Z0-9áéíóúüñ ]/g, ' ').replace(/\s+/g, ' ').trim()
      const prompt = `JSON UML para: ${cleaned}. ${target} clases aprox. Formato compacto sin texto extra. {"classes":[{"name":"X","attributes":["id","nombre"]}],"relationships":[{"from":"A","to":"B","type":"association","name":"rel","cardinality":{"from":"1","to":"*"}}]}`
      const { text } = await generateText({ model: groq('llama-3.1-8b-instant'), prompt })
      let diagram: any
      try {
        diagram = JSON.parse(text.trim().replace(/```json|```/g, '').trim())
      } catch {
        diagram = generateFallbackDiagram(cleaned || 'Sistema')
      }
      if (diagram?.classes) {
        diagram.classes.forEach((c: any) => {
          actions.push({ type: 'add_class', data: { name: c.name } })
          if (Array.isArray(c.attributes)) c.attributes.forEach((a: string) => actions.push({ type: 'add_attribute', data: { className: c.name, attribute: a } }))
        })
        if (Array.isArray(diagram.relationships)) {
          diagram.relationships.forEach((r: any) => {
            if (r?.from && r?.to) actions.push({ type: 'add_relationship', data: { from: r.from, to: r.to, type: r.type || 'association', cardinality: r.cardinality || { from: '1', to: '1' }, name: r.name || `${r.from}_${r.to}` } })
          })
        }
      }
      return NextResponse.json({ response: 'Diagrama generado.', actions, diagram })
    }

    // Respuesta corta para cualquier otro mensaje (máx 3 líneas / 220 chars)
    const { text } = await generateText({ model: groq('llama-3.1-8b-instant'), prompt: message.slice(0, 500) })
    let trimmed = text.replace(/```[a-zA-Z]*|```/g, '').trim()
    const lines = trimmed.split(/\r?\n/).slice(0, 3)
    trimmed = lines.join('\n')
    if (trimmed.length > 220) trimmed = trimmed.slice(0, 217) + '...'
    return NextResponse.json({ response: trimmed, actions })
  } catch (e) {
    return NextResponse.json({ error: 'Error processing AI chat' }, { status: 500 })
  }
}
