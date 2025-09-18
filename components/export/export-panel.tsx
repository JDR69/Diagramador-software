// Panel de Exportación
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileImage, FileText, Package, Database } from "lucide-react"
import { DiagramExporter } from "@/app/lib/export-utils"
import type { ClassData, RelationshipData } from "@/components/diagram/diagram-canvas"

interface ExportPanelProps {
  classes?: ClassData[]
  relationships?: RelationshipData[]
}

export function ExportPanel({ classes = [], relationships = [] }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false)

  const downloadFile = (content: string | Blob, filename: string, type?: string) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: type || "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportImage = async (format: "png" | "svg" | "jpg" = "png") => {
    setIsExporting(true)
    try {
      let targetElement = document.querySelector('[data-canvas="true"]') as HTMLElement

      if (!targetElement) {
        targetElement = document.querySelector(".diagram-canvas") as HTMLElement
      }

      if (!targetElement) {
        // Try to find the main container
        targetElement = document.querySelector("main") as HTMLElement
        if (!targetElement) {
          targetElement = document.body
        }
      }

      console.log("[app] Exporting element:", targetElement)
      console.log("[app] Element dimensions:", {
        width: targetElement.offsetWidth,
        height: targetElement.offsetHeight,
        scrollWidth: targetElement.scrollWidth,
        scrollHeight: targetElement.scrollHeight,
      })

      const blob = await DiagramExporter.exportAsImage(targetElement, classes, relationships, format)

      const filename = `diagrama-clases.${format}`
      downloadFile(blob, filename)

      console.log("[app] Image exported successfully")
    } catch (error) {
      console.error("Error exporting image:", error)
      alert(`Error al exportar la imagen: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSQL = async () => {
    setIsExporting(true)
    try {
      const sqlScript = DiagramExporter.generateSQLScript(classes, relationships)
      downloadFile(sqlScript, "diagrama-clases.sql", "text/sql")
    } catch (error) {
      console.error("Error exporting SQL:", error)
      alert("Error al exportar el script SQL")
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSpringBoot = async () => {
    setIsExporting(true)
    try {
      const projectStructure = DiagramExporter.generateSpringBootProject(classes, relationships)

      // Create a zip file with all the project files
      const JSZip = (await import("jszip")).default
      const zip = new JSZip()

      // Add all files to the zip
      Object.entries(projectStructure).forEach(([path, content]) => {
        zip.file(path, content)
      })

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: "blob" })
      downloadFile(zipBlob, "spring-boot-project.zip")
    } catch (error) {
      console.error("Error exporting Spring Boot project:", error)
      alert("Error al generar el proyecto Spring Boot")
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportJSON = async () => {
    setIsExporting(true)
    try {
      const diagramData = {
        classes,
        relationships,
        metadata: {
          exportedAt: new Date().toISOString(),
          version: "1.0.0",
        },
      }

      const jsonContent = JSON.stringify(diagramData, null, 2)
      downloadFile(jsonContent, "diagrama-clases.json", "application/json")
    } catch (error) {
      console.error("Error exporting JSON:", error)
      alert("Error al exportar el JSON")
    } finally {
      setIsExporting(false)
    }
  }

  const hasData = classes.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || !hasData} className="bg-transparent">
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? "Exportando..." : "Exportar"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExportImage("png")}>
          <FileImage className="w-4 h-4 mr-2" />
          Exportar como PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExportImage("jpg")}>
          <FileImage className="w-4 h-4 mr-2" />
          Exportar como JPG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExportImage("svg")}>
          <FileImage className="w-4 h-4 mr-2" />
          Exportar como SVG
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportSQL}>
          <Database className="w-4 h-4 mr-2" />
          Exportar Script SQL
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON}>
          <FileText className="w-4 h-4 mr-2" />
          Exportar como JSON
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportSpringBoot}>
          <Package className="w-4 h-4 mr-2" />
          Generar Spring Boot
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
