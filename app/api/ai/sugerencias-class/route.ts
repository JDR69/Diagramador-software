import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

const suggestionCache = new Map<string, { suggestions: string[]; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

const fallbackSuggestions: Record<string, string[]> = {
  usuario: ["TipoUsuario", "Perfil", "Direccion", "Sesion"],
  producto: ["Categoria", "Proveedor", "Inventario", "HistorialPrecios"],
  pedido: ["DetallePedido", "Cliente", "EstadoPedido", "Factura"],
  empleado: ["Departamento", "Cargo", "Nomina", "Evaluacion"],
  cliente: ["TipoCliente", "Direccion", "Contacto", "Pedido"],
  factura: ["DetalleFactura", "Cliente", "Producto", "Pago"],
  curso: ["Materia", "Profesor", "Inscripcion", "Calificacion"],
  vehiculo: ["Marca", "Modelo", "Propietario", "Mantenimiento"],
  paciente: ["HistorialMedico", "Cita", "Doctor", "Tratamiento"],
  libro: ["Autor", "Editorial", "Categoria", "Prestamo"],
  avion: ["Modelo", "Aerolinea", "Vuelo", "Mantenimiento"],
  pista: ["Aeropuerto", "TipoPista", "Vuelo", "Mantenimiento"],
  aeropuerto: ["Terminal", "Pista", "Vuelo", "Ciudad"],
}

function getFallbackSuggestions(className: string): string[] {
  const key = className.toLowerCase()
  return fallbackSuggestions[key] || ["Tipo" + className, "Estado" + className, "Detalle" + className]
}

export async function POST(request: NextRequest) {
  try {
    const { className } = await request.json()

    if (!className) {
      return NextResponse.json({ error: "Class name is required" }, { status: 400 })
    }

    const cacheKey = className.toLowerCase().trim()

    const cached = suggestionCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("[App] Returning cached suggestions for:", className)
      return NextResponse.json({ suggestions: cached.suggestions })
    }

    try {
      const { text } = await generateText({
        model: groq("llama-3.1-8b-instant"),
        prompt: `Eres un experto en bases de datos y modelado UML. Dada la clase principal "${className}", sugiere 3 nombres de tablas relacionadas, que sean útiles, realistas y variadas, en español, en formato PascalCase, una por línea. No repitas palabras genéricas como Tipo, Detalle, Estado, Relacion, Generico, ni uses palabras del nombre de la clase. Ejemplo para "Usuario": Perfil, Direccion, Sesion. Ejemplo para "Producto": Categoria, Inventario, Proveedor.`,
        maxTokens: 80,
      })

      const suggestions = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.includes(":") && !line.includes("-") && !/Tipo|Detalle|Estado|Relacion|Generico/i.test(line) && !line.toLowerCase().includes(className.toLowerCase()))
        .slice(0, 3)

      if (suggestions.length > 0) {
        suggestionCache.set(cacheKey, { suggestions, timestamp: Date.now() })
        return NextResponse.json({ suggestions })
      } else {
        throw new Error("No valid suggestions generated")
      }
    } catch (apiError: any) {
      console.log("[App] API error, using fallback:", apiError.message)
      const fallback = getFallbackSuggestions(className)
      suggestionCache.set(cacheKey, { suggestions: fallback, timestamp: Date.now() })
      return NextResponse.json({ suggestions: fallback })
    }
  } catch (error) {
    console.error("Error generating suggestions:", error)

    const fallback = ["TipoGenerico", "EstadoGenerico", "DetalleGenerico"]
    return NextResponse.json({ suggestions: fallback })
  }
}
