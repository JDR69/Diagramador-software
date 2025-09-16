"""
Capa de acceso a datos - Patrón Repositorio
"""
from typing import List, Dict, Any, Optional
from django.db.models import Prefetch
from .models import Diagrama, EntidadClase, AtributoClase, Relacion


class RepositorioDiagrama:
    """Repositorio para acceso a datos de diagramas"""
    
    def create(self, data: Dict[str, Any]) -> Diagrama:
        """Crear un nuevo diagrama"""
        return Diagrama.objects.create(**data)
    
    def get_by_id(self, diagram_id: str) -> Optional[Diagrama]:
        """Obtener diagrama por ID"""
        try:
            return Diagrama.objects.get(id=diagram_id)
        except Diagrama.DoesNotExist:
            return None
    
    def get_with_details(self, diagram_id: str) -> Optional[Diagrama]:
        """Obtener diagrama con todos los datos relacionados"""
        try:
            return Diagrama.objects.prefetch_related(
                Prefetch('classes', queryset=EntidadClase.objects.prefetch_related('attributes')),
                'relationships__from_class',
                'relationships__to_class'
            ).get(id=diagram_id)
        except Diagrama.DoesNotExist:
            return None
    
    def list_diagrams(self, user=None, is_public=None) -> list[Diagrama]:
        """Listar diagramas con filtrado opcional"""
        queryset = Diagrama.objects.all()
        if user:
            queryset = queryset.filter(created_by=user)
        if is_public is not None:
            queryset = queryset.filter(is_public=is_public)
        return list(queryset)
    
    def update(self, diagram: Diagrama, data: Dict[str, Any]) -> Diagrama:
        """Update diagram"""
        for field, value in data.items():
            setattr(diagram, field, value)
        diagram.save()
        return diagram
    
    def delete(self, diagram_id: str) -> bool:
        """Eliminar diagrama"""
        try:
            diagram = Diagrama.objects.get(id=diagram_id)
            diagram.delete()
            return True
        except Diagrama.DoesNotExist:
            return False


class RepositorioEntidadClase:
    """Repositorio para acceso a datos de entidades de clase"""
    
    def create_with_attributes(self, diagram: Diagrama, class_data: Dict[str, Any]) -> EntidadClase:
        """Crear entidad de clase con atributos"""
        attributes_data = class_data.pop('attributes', [])
        position = class_data.pop('position', {'x': 0, 'y': 0})
        class_entity = EntidadClase.objects.create(
            diagram=diagram,
            position_x=position['x'],
            position_y=position['y'],
            **class_data
        )
        # Crear atributos
        for attr_name in attributes_data:
            AtributoClase.objects.create(
                class_entity=class_entity,
                name=attr_name,
                data_type='String'
            )
        return class_entity
    
    def get_by_id(self, class_id: str) -> Optional[EntidadClase]:
        """Obtener entidad de clase por ID"""
        try:
            return EntidadClase.objects.get(id=class_id)
        except EntidadClase.DoesNotExist:
            return None
    
    def update_class(self, class_entity: EntidadClase, class_data: Dict[str, Any]) -> EntidadClase:
        """Update class entity"""
        # Update basic fields
        for field in ['name']:
            if field in class_data:
                setattr(class_entity, field, class_data[field])
        
        # Update position
        if 'position' in class_data:
            position = class_data['position']
            class_entity.position_x = position['x']
            class_entity.position_y = position['y']
        
        class_entity.save()
        
        # Update attributes
        if 'attributes' in class_data:
            self._update_attributes(class_entity, class_data['attributes'])
        
        return class_entity
    
    def _update_attributes(self, class_entity: EntidadClase, attributes_data: List[str]):
        """Update class attributes"""
        existing_attrs = {attr.name: attr for attr in class_entity.attributes.all()}
        new_attr_names = set(attributes_data)
        
        # Remove deleted attributes
        for name, attr in existing_attrs.items():
            if name not in new_attr_names:
                attr.delete()
        
        # Add new attributes
        for attr_name in new_attr_names:
            if attr_name not in existing_attrs:
                AtributoClase.objects.create(
                    class_entity=class_entity,
                    name=attr_name,
                    data_type='String'
                )
        def create_with_attributes(self, diagram: Diagrama, class_data: Dict[str, Any]) -> EntidadClase:
            """Crear entidad de clase con atributos"""
            attributes_data = class_data.pop('attributes', [])
            position = class_data.pop('position', {'x': 0, 'y': 0})
            class_entity = EntidadClase.objects.create(
                diagram=diagram,
                position_x=position['x'],
                position_y=position['y'],
                **class_data
            )
            # Crear atributos
            for attr_name in attributes_data:
                AtributoClase.objects.create(
                    class_entity=class_entity,
                    name=attr_name,
                    data_type='String'
                )
            return class_entity


class RepositorioRelacion:

    """
    Capa de acceso a datos - Patrón Repositorio
    """
    from typing import List, Dict, Any, Optional
    from django.db.models import Prefetch
    from .models import Diagrama, EntidadClase, AtributoClase, Relacion


    class RepositorioDiagrama:
        """Repositorio para acceso a datos de diagramas"""
        def create(self, data: Dict[str, Any]) -> Diagrama:
            """Crear un nuevo diagrama"""
            return Diagrama.objects.create(**data)

        def get_by_id(self, diagram_id: str) -> Optional[Diagrama]:
            """Obtener diagrama por ID"""
            try:
                return Diagrama.objects.get(id=diagram_id)
            except Diagrama.DoesNotExist:
                return None

        def get_with_details(self, diagram_id: str) -> Optional[Diagrama]:
            """Obtener diagrama con todos los datos relacionados"""
            try:
                return Diagrama.objects.prefetch_related(
                    Prefetch('classes', queryset=EntidadClase.objects.prefetch_related('attributes')),
                    'relationships__from_class',
                    'relationships__to_class'
                ).get(id=diagram_id)
            except Diagrama.DoesNotExist:
                return None

        def list_diagrams(self, user=None, is_public=None) -> List[Diagrama]:
            """Listar diagramas con filtrado opcional"""
            queryset = Diagrama.objects.all()
            if user:
                queryset = queryset.filter(created_by=user)
            if is_public is not None:
                queryset = queryset.filter(is_public=is_public)
            return list(queryset)

        def update(self, diagram: Diagrama, data: Dict[str, Any]) -> Diagrama:
            """Actualizar diagrama"""
            for field, value in data.items():
                setattr(diagram, field, value)
            diagram.save()
            return diagram

# Alias públicos en inglés para compatibilidad
DiagramRepository = RepositorioDiagrama
ClassEntityRepository = RepositorioEntidadClase
RelationshipRepository = RepositorioRelacion

        # Alias públicos en inglés para compatibilidad
DiagramRepository = RepositorioDiagrama
ClassEntityRepository = RepositorioEntidadClase
RelationshipRepository = RepositorioRelacion
