"""
Servicios de lógica de negocio - Capa de Negocio
"""
from typing import List, Dict, Any, Optional
from django.db import transaction
from .models import Diagrama, EntidadClase, AtributoClase, Relacion
from .repositories import DiagramRepository, ClassEntityRepository, RelationshipRepository



class DiagramService:
    """Servicio para la lógica de negocio de diagramas"""
    def __init__(self):
        self.diagram_repo = DiagramRepository()
        self.class_repo = ClassEntityRepository()
        self.relationship_repo = RelationshipRepository()

    def crear_diagrama(self, data: Dict[str, Any]) -> Diagrama:
        """Crear un nuevo diagrama con clases y relaciones"""
        with transaction.atomic():
            diagram = self.diagram_repo.create(data)

            # Process classes
            classes_data = data.get('classes', [])
            class_mapping = {}

            for class_data in classes_data:
                class_entity = self.class_repo.create_with_attributes(
                    diagram=diagram,
                    class_data=class_data
                )
                class_mapping[class_data['name']] = class_entity

            # Process relationships
            relationships_data = data.get('relationships', [])
            for rel_data in relationships_data:
                self.relationship_repo.create_relationship(
                    diagram=diagram,
                    relationship_data=rel_data,
                    class_mapping=class_mapping
                )

            return diagram

    def actualizar_diagrama(self, diagram_id: str, data: Dict[str, Any]) -> Diagrama:
        """Actualizar diagrama con nueva información"""
        with transaction.atomic():
            diagram = self.diagram_repo.get_by_id(diagram_id)

            # Update basic info
            for field in ['name', 'description', 'is_public']:
                if field in data:
                    setattr(diagram, field, data[field])
            diagram.save()

            # Handle classes update
            if 'classes' in data:
                self._actualizar_clases(diagram, data['classes'])

            # Handle relationships update
            if 'relationships' in data:
                self._actualizar_relaciones(diagram, data['relationships'])

            return diagram

    def _actualizar_clases(self, diagram: Diagrama, classes_data: List[Dict]):
        """Actualizar clases de un diagrama"""
        existing_classes = {cls.name: cls for cls in diagram.classes.all()}
        new_class_names = {cls_data['name'] for cls_data in classes_data}

        # Remove deleted classes
        for name, class_entity in existing_classes.items():
            if name not in new_class_names:
                class_entity.delete()

        # Update or create classes
        for class_data in classes_data:
            if class_data['name'] in existing_classes:
                self.class_repo.update_class(
                    existing_classes[class_data['name']],
                    class_data
                )
            else:
                self.class_repo.create_with_attributes(diagram, class_data)

    def _actualizar_relaciones(self, diagram: Diagrama, relationships_data: List[Dict]):
        """Actualizar relaciones de un diagrama"""
        # Clear existing relationships and recreate
        diagram.relationships.all().delete()

        class_mapping = {cls.name: cls for cls in diagram.classes.all()}

        for rel_data in relationships_data:
            self.relationship_repo.create_relationship(
                diagram=diagram,
                relationship_data=rel_data,
                class_mapping=class_mapping
            )

    def obtener_diagrama_con_detalles(self, diagram_id: str) -> Optional[Diagrama]:
        """Obtener diagrama con todos los datos relacionados"""
        return self.diagram_repo.get_with_details(diagram_id)

    def listar_diagramas(self, user=None, is_public=None) -> List[Diagrama]:
        """Listar diagramas con filtrado opcional"""
        return self.diagram_repo.list_diagrams(user=user, is_public=is_public)

    def eliminar_diagrama(self, diagram_id: str) -> bool:
        """Eliminar un diagrama"""
        return self.diagram_repo.delete(diagram_id)



class ClassEntityService:
    """Servicio para operaciones de entidades de clase"""
    def __init__(self):
        self.class_repo = ClassEntityRepository()

    def agregar_atributo(self, class_id: str, attribute_data: Dict[str, Any]) -> AtributoClase:
        """Agregar atributo a una clase"""
        class_entity = self.class_repo.get_by_id(class_id)
        return AtributoClase.objects.create(
            class_entity=class_entity,
            **attribute_data
        )

    def eliminar_atributo(self, class_id: str, attribute_name: str) -> bool:
        """Eliminar atributo de una clase"""
        try:
            class_entity = self.class_repo.get_by_id(class_id)
            attribute = class_entity.attributes.get(name=attribute_name)
            attribute.delete()
            return True
        except AtributoClase.DoesNotExist:
            return False

    def actualizar_posicion_clase(self, class_id: str, position: Dict[str, int]) -> EntidadClase:
        """Actualizar posición de la clase"""
        class_entity = self.class_repo.get_by_id(class_id)
        class_entity.position_x = position['x']
        class_entity.position_y = position['y']
        class_entity.save()
        return class_entity
