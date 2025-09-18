// Utilidades de exportación
import type { ClassData, RelationshipData } from "@/components/diagram/diagram-canvas"

export class DiagramExporter {
  static async exportAsImage(
    element: HTMLElement,
    classes: ClassData[],
    relationships: RelationshipData[],
    format: "png" | "svg" | "jpg" = "png",
  ): Promise<Blob> {
    try {
      console.log("[app] Starting export with format:", format)

      if (format === "svg") {
        return this.exportAsSVG(element, classes, relationships)
      }

      return await this.exportWithCanvas(element, classes, relationships, format)
    } catch (error) {
      console.error("Error in exportAsImage:", error)
      throw new Error(`Failed to export image: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private static async exportWithCanvas(
    element: HTMLElement,
    classes: ClassData[],
    relationships: RelationshipData[],
    format: "png" | "jpg",
  ): Promise<Blob> {
    // Get element dimensions
    const rect = element.getBoundingClientRect()
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!

    // Set high resolution
    const scale = 2
    canvas.width = rect.width * scale
    canvas.height = rect.height * scale
    ctx.scale(scale, scale)

    // Fill background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Draw classes
    classes.forEach((classData) => {
      this.drawClass(ctx, classData)
    })

    // Draw relationships
    relationships.forEach((relationship) => {
      const fromClass = classes.find((c) => c.id === relationship.from)
      const toClass = classes.find((c) => c.id === relationship.to)
      if (fromClass && toClass) {
        this.drawRelationship(ctx, relationship, fromClass, toClass)
      }
    })

    return new Promise((resolve) => {
      if (format === "jpg") {
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9)
      } else {
        canvas.toBlob((blob) => resolve(blob!), "image/png")
      }
    })
  }

  private static drawClass(ctx: CanvasRenderingContext2D, classData: ClassData) {
    const x = classData.position.x
    const y = classData.position.y
    const width = 200
    const headerHeight = 40
    const attributeHeight = 30
    const totalHeight = headerHeight + classData.attributes.length * attributeHeight + 40

    // Draw class rectangle
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(x, y, width, totalHeight)

    // Draw border
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, width, totalHeight)

    // Draw header
    ctx.fillStyle = "#f3f4f6"
    ctx.fillRect(x, y, width, headerHeight)
    ctx.strokeRect(x, y, width, headerHeight)

    // Draw class name
    ctx.fillStyle = "#111827"
    ctx.font = "14px system-ui, -apple-system, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(classData.name, x + width / 2, y + headerHeight / 2 + 5)

    // Draw attributes
    ctx.textAlign = "left"
    ctx.font = "12px system-ui, -apple-system, sans-serif"
    classData.attributes.forEach((attr, index) => {
      const attrY = y + headerHeight + index * attributeHeight + 20
      ctx.fillText(`• ${attr}`, x + 10, attrY)
    })
  }

  private static drawRelationship(
    ctx: CanvasRenderingContext2D,
    relationship: RelationshipData,
    fromClass: ClassData,
    toClass: ClassData,
  ) {
    const fromCenter = {
      x: fromClass.position.x + 100,
      y: fromClass.position.y + 60,
    }
    const toCenter = {
      x: toClass.position.x + 100,
      y: toClass.position.y + 60,
    }

    // Calculate connection points on class borders
    const fromPoint = this.getConnectionPoint(fromClass, toCenter)
    const toPoint = this.getConnectionPoint(toClass, fromCenter)

    // Draw line
    ctx.strokeStyle = "#6366f1"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(fromPoint.x, fromPoint.y)
    ctx.lineTo(toPoint.x, toPoint.y)
    ctx.stroke()

    // Draw cardinality labels
    ctx.fillStyle = "#6366f1"
    ctx.font = "11px system-ui, -apple-system, sans-serif"
    ctx.textAlign = "center"

    // From cardinality
    const fromLabelPos = {
      x: fromPoint.x + (toPoint.x - fromPoint.x) * 0.2,
      y: fromPoint.y + (toPoint.y - fromPoint.y) * 0.2 - 5,
    }
    ctx.fillText(relationship.fromCardinality, fromLabelPos.x, fromLabelPos.y)

    // To cardinality
    const toLabelPos = {
      x: fromPoint.x + (toPoint.x - fromPoint.x) * 0.8,
      y: fromPoint.y + (toPoint.y - fromPoint.y) * 0.8 - 5,
    }
    ctx.fillText(relationship.toCardinality, toLabelPos.x, toLabelPos.y)

    // Draw relationship type label
    const midPoint = {
      x: (fromPoint.x + toPoint.x) / 2,
      y: (fromPoint.y + toPoint.y) / 2 - 10,
    }
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(midPoint.x - 25, midPoint.y - 8, 50, 16)
    ctx.fillStyle = "#6366f1"
    ctx.fillText(relationship.type, midPoint.x, midPoint.y + 3)
  }

  private static getConnectionPoint(classData: ClassData, targetPoint: { x: number; y: number }) {
    const classRect = {
      x: classData.position.x,
      y: classData.position.y,
      width: 200,
      height: 100, // Approximate height
    }

    const center = {
      x: classRect.x + classRect.width / 2,
      y: classRect.y + classRect.height / 2,
    }

    // Calculate direction vector
    const dx = targetPoint.x - center.x
    const dy = targetPoint.y - center.y

    // Find intersection with rectangle border
    const absRatioX = Math.abs(dx / (classRect.width / 2))
    const absRatioY = Math.abs(dy / (classRect.height / 2))

    if (absRatioX > absRatioY) {
      // Intersect with left or right edge
      const x = center.x + (dx > 0 ? classRect.width / 2 : -classRect.width / 2)
      const y = center.y + (dy * (classRect.width / 2)) / Math.abs(dx)
      return { x, y }
    } else {
      // Intersect with top or bottom edge
      const x = center.x + (dx * (classRect.height / 2)) / Math.abs(dy)
      const y = center.y + (dy > 0 ? classRect.height / 2 : -classRect.height / 2)
      return { x, y }
    }
  }

  private static exportAsSVG(
    element: HTMLElement,
    classes: ClassData[],
    relationships: RelationshipData[],
  ): Promise<Blob> {
    return new Promise((resolve) => {
      const rect = element.getBoundingClientRect()

      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}" viewBox="0 0 ${rect.width} ${rect.height}">\n`
      svgContent += `<rect width="100%" height="100%" fill="white"/>\n`

      // Draw classes
      classes.forEach((classData) => {
        const x = classData.position.x
        const y = classData.position.y
        const width = 200
        const headerHeight = 40
        const totalHeight = headerHeight + classData.attributes.length * 30 + 40

        // Class rectangle
        svgContent += `<rect x="${x}" y="${y}" width="${width}" height="${totalHeight}" fill="white" stroke="#e5e7eb" strokeWidth="1"/>\n`

        // Header
        svgContent += `<rect x="${x}" y="${y}" width="${width}" height="${headerHeight}" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1"/>\n`

        // Class name
        svgContent += `<text x="${x + width / 2}" y="${y + headerHeight / 2 + 5}" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontSize="14" fill="#111827">${classData.name}</text>\n`

        // Attributes
        classData.attributes.forEach((attr, index) => {
          const attrY = y + headerHeight + index * 30 + 20
          svgContent += `<text x="${x + 10}" y="${attrY}" fontFamily="system-ui, -apple-system, sans-serif" fontSize="12" fill="#111827">• ${attr}</text>\n`
        })
      })

      // Draw relationships
      relationships.forEach((relationship) => {
        const fromClass = classes.find((c) => c.id === relationship.from)
        const toClass = classes.find((c) => c.id === relationship.to)
        if (fromClass && toClass) {
          const fromPoint = this.getConnectionPoint(fromClass, {
            x: toClass.position.x + 100,
            y: toClass.position.y + 60,
          })
          const toPoint = this.getConnectionPoint(toClass, {
            x: fromClass.position.x + 100,
            y: fromClass.position.y + 60,
          })

          svgContent += `<line x1="${fromPoint.x}" y1="${fromPoint.y}" x2="${toPoint.x}" y2="${toPoint.y}" stroke="#6366f1" strokeWidth="2"/>\n`

          // Cardinality labels
          const fromLabelPos = {
            x: fromPoint.x + (toPoint.x - fromPoint.x) * 0.2,
            y: fromPoint.y + (toPoint.y - fromPoint.y) * 0.2 - 5,
          }
          const toLabelPos = {
            x: fromPoint.x + (toPoint.x - fromPoint.x) * 0.8,
            y: fromPoint.y + (toPoint.y - fromPoint.y) * 0.8 - 5,
          }

          svgContent += `<text x="${fromLabelPos.x}" y="${fromLabelPos.y}" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontSize="11" fill="#6366f1">${relationship.fromCardinality}</text>\n`
          svgContent += `<text x="${toLabelPos.x}" y="${toLabelPos.y}" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontSize="11" fill="#6366f1">${relationship.toCardinality}</text>\n`

          // Relationship type
          const midPoint = {
            x: (fromPoint.x + toPoint.x) / 2,
            y: (fromPoint.y + toPoint.y) / 2,
          }
          svgContent += `<rect x="${midPoint.x - 25}" y="${midPoint.y - 8}" width="50" height="16" fill="white"/>\n`
          svgContent += `<text x="${midPoint.x}" y="${midPoint.y + 3}" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontSize="11" fill="#6366f1">${relationship.type}</text>\n`
        }
      })

      svgContent += `</svg>`

      const blob = new Blob([svgContent], { type: "image/svg+xml" })
      resolve(blob)
    })
  }

  static generateSQLScript(classes: ClassData[], relationships: RelationshipData[]): string {
    let sql = "-- Diagrama de Clases UML - Script SQL\n"
    sql += "-- Generado automáticamente\n\n"

    // Generate CREATE TABLE statements
    classes.forEach((classData) => {
      sql += `-- Tabla: ${classData.name}\n`
      sql += `CREATE TABLE ${classData.name.toLowerCase()} (\n`

      // Add ID field
      sql += `    id BIGINT PRIMARY KEY AUTO_INCREMENT,\n`

      // Add class attributes
      classData.attributes.forEach((attr, index) => {
        const isLast = index === classData.attributes.length - 1
        sql += `    ${attr.toLowerCase()} VARCHAR(255)${isLast ? "" : ","}\n`
      })

      sql += ");\n\n"
    })

    // Generate foreign key constraints based on relationships
    relationships.forEach((rel) => {
      const fromClass = classes.find((c) => c.id === rel.from)
      const toClass = classes.find((c) => c.id === rel.to)

      if (fromClass && toClass) {
        sql += `-- Relación: ${fromClass.name} -> ${toClass.name}\n`
        sql += `ALTER TABLE ${fromClass.name.toLowerCase()} ADD COLUMN ${toClass.name.toLowerCase()}_id BIGINT;\n`
        sql += `ALTER TABLE ${fromClass.name.toLowerCase()} ADD FOREIGN KEY (${toClass.name.toLowerCase()}_id) REFERENCES ${toClass.name.toLowerCase()}(id);\n\n`
      }
    })

    return sql
  }

  static generateSpringBootProject(classes: ClassData[], relationships: RelationshipData[]): Record<string, string> {
    const projectStructure: Record<string, string> = {}

    // Generate pom.xml
    projectStructure["pom.xml"] = this.generatePomXml()

    // Generate application.properties
    projectStructure["src/main/resources/application.properties"] = this.generateApplicationProperties()

    // Generate entity classes
    classes.forEach((classData) => {
      const entityContent = this.generateEntityClass(classData, relationships, classes)
      projectStructure[`src/main/java/com/example/demo/entity/${classData.name}.java`] = entityContent
    })

    // Generate repository interfaces
    classes.forEach((classData) => {
      const repositoryContent = this.generateRepositoryInterface(classData)
      projectStructure[`src/main/java/com/example/demo/repository/${classData.name}Repository.java`] = repositoryContent
    })

    // Generate service classes
    classes.forEach((classData) => {
      const serviceContent = this.generateServiceClass(classData)
      projectStructure[`src/main/java/com/example/demo/service/${classData.name}Service.java`] = serviceContent
    })

    // Generate controller classes
    classes.forEach((classData) => {
      const controllerContent = this.generateControllerClass(classData)
      projectStructure[`src/main/java/com/example/demo/controller/${classData.name}Controller.java`] = controllerContent
    })

    // Generate main application class
    projectStructure["src/main/java/com/example/demo/DemoApplication.java"] = this.generateMainApplication()

    return projectStructure
  }

  private static generatePomXml(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>
    <groupId>com.example</groupId>
    <artifactId>demo</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>demo</name>
    <description>Demo project for Spring Boot</description>
    <properties>
        <java.version>17</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>`
  }

  private static generateApplicationProperties(): string {
    return `# Database Configuration
spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=password
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.h2.console.enabled=true
spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.show-sql=true`
  }

  private static generateEntityClass(
    classData: ClassData,
    relationships: RelationshipData[],
    allClasses: ClassData[],
  ): string {
    let entityClass = `package com.example.demo.entity;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "${classData.name.toLowerCase()}")
public class ${classData.name} {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
`

    // Add attributes
    classData.attributes.forEach((attr) => {
      entityClass += `    @Column(name = "${attr.toLowerCase()}")
    private String ${attr};
    
`
    })

    // Add relationships
    relationships.forEach((rel) => {
      const relatedClass = allClasses.find(
        (c) => (c.id === rel.to && classData.id === rel.from) || (c.id === rel.from && classData.id === rel.to),
      )

      if (relatedClass && relatedClass.id !== classData.id) {
        if (rel.type === "one-to-many") {
          entityClass += `    @OneToMany(mappedBy = "${classData.name.toLowerCase()}")
    private List<${relatedClass.name}> ${relatedClass.name.toLowerCase()}List;
    
`
        } else if (rel.type === "many-to-one") {
          entityClass += `    @ManyToOne
    @JoinColumn(name = "${relatedClass.name.toLowerCase()}_id")
    private ${relatedClass.name} ${relatedClass.name.toLowerCase()};
    
`
        }
      }
    })

    // Add constructors, getters, and setters
    entityClass += `    // Constructors
    public ${classData.name}() {}
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
`

    classData.attributes.forEach((attr) => {
      const capitalizedAttr = attr.charAt(0).toUpperCase() + attr.slice(1)
      entityClass += `    public String get${capitalizedAttr}() {
        return ${attr};
    }
    
    public void set${capitalizedAttr}(String ${attr}) {
        this.${attr} = ${attr};
    }
    
`
    })

    entityClass += "}"
    return entityClass
  }

  private static generateRepositoryInterface(classData: ClassData): string {
    return `package com.example.demo.repository;

import com.example.demo.entity.${classData.name};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ${classData.name}Repository extends JpaRepository<${classData.name}, Long> {
}`
  }

  private static generateServiceClass(classData: ClassData): string {
    return `package com.example.demo.service;

import com.example.demo.entity.${classData.name};
import com.example.demo.repository.${classData.name}Repository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class ${classData.name}Service {
    
    @Autowired
    private ${classData.name}Repository ${classData.name.toLowerCase()}Repository;
    
    public List<${classData.name}> findAll() {
        return ${classData.name.toLowerCase()}Repository.findAll();
    }
    
    public Optional<${classData.name}> findById(Long id) {
        return ${classData.name.toLowerCase()}Repository.findById(id);
    }
    
    public ${classData.name} save(${classData.name} ${classData.name.toLowerCase()}) {
        return ${classData.name.toLowerCase()}Repository.save(${classData.name.toLowerCase()});
    }
    
    public void deleteById(Long id) {
        ${classData.name.toLowerCase()}Repository.deleteById(id);
    }
}`
  }

  private static generateControllerClass(classData: ClassData): string {
    return `package com.example.demo.controller;

import com.example.demo.entity.${classData.name};
import com.example.demo.service.${classData.name}Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/${classData.name.toLowerCase()}")
public class ${classData.name}Controller {
    
    @Autowired
    private ${classData.name}Service ${classData.name.toLowerCase()}Service;
    
    @GetMapping
    public List<${classData.name}> getAll() {
        return ${classData.name.toLowerCase()}Service.findAll();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<${classData.name}> getById(@PathVariable Long id) {
        return ${classData.name.toLowerCase()}Service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ${classData.name} create(@RequestBody ${classData.name} ${classData.name.toLowerCase()}) {
        return ${classData.name.toLowerCase()}Service.save(${classData.name.toLowerCase()});
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<${classData.name}> update(@PathVariable Long id, @RequestBody ${classData.name} ${classData.name.toLowerCase()}) {
        return ${classData.name.toLowerCase()}Service.findById(id)
                .map(existing -> {
                    ${classData.name.toLowerCase()}.setId(id);
                    return ResponseEntity.ok(${classData.name.toLowerCase()}Service.save(${classData.name.toLowerCase()}));
                })
                .orElse(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return ${classData.name.toLowerCase()}Service.findById(id)
                .map(${classData.name.toLowerCase()} -> {
                    ${classData.name.toLowerCase()}Service.deleteById(id);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}`
  }

  private static generateMainApplication(): string {
    return `package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}`
  }
}
