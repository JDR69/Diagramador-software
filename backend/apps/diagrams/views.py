"""
Vistas de la API - Capa de Presentación
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .models import Diagrama, EntidadClase, AtributoClase, Relacion
from .serializers import (
    SerializadorDiagrama, SerializadorCrearDiagrama, SerializadorEntidadClase,
    SerializadorAtributoClase, SerializadorRelacion
)
from .services import DiagramService, ClassEntityService


class VistaConjuntoDiagramas(viewsets.ModelViewSet):
    """Conjunto de vistas para operaciones CRUD de diagramas"""
    queryset = Diagrama.objects.all()
    service = DiagramService()

    def obtener_clase_serializador(self):
        if self.action == 'create':
            return SerializadorCrearDiagrama
        return SerializadorDiagrama

    def crear(self, request):
        """Crear un nuevo diagrama"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        diagrama = self.service.create_diagram(serializer.validated_data)
        response_serializer = SerializadorDiagrama(diagrama)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def obtener(self, request, pk=None):
        """Obtener diagrama con detalles"""
        diagrama = self.service.get_diagram_with_details(pk)
        if not diagrama:
            return Response(
                {'error': 'Diagram not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = SerializadorDiagrama(diagrama)
        return Response(serializer.data)

    def actualizar(self, request, pk=None):
        """Actualizar diagrama"""
        diagrama = self.service.update_diagram(pk, request.data)
        serializer = SerializadorDiagrama(diagrama)
        return Response(serializer.data)

    def eliminar(self, request, pk=None):
        """Eliminar diagrama"""
        success = self.service.delete_diagram(pk)
        if success:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(
            {'error': 'Diagram not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    @action(detail=True, methods=['post'])
    def duplicar(self, request, pk=None):
        """Duplicar un diagrama"""
        original = get_object_or_404(Diagrama, pk=pk)

        # Crear datos duplicados
        duplicate_data = {
            'name': f"{original.name} (Copia)",
            'description': original.description,
            'is_public': False,
            'classes': [],
            'relationships': []
        }

        # Copiar clases
        for class_entity in original.classes.all():
            class_data = {
                'name': class_entity.name,
                'position': {'x': class_entity.position_x, 'y': class_entity.position_y},
                'attributes': [attr.name for attr in class_entity.attributes.all()]
            }
            duplicate_data['classes'].append(class_data)

        # Copiar relaciones
        for relationship in original.relationships.all():
            rel_data = {
                'from': relationship.from_class.name,
                'to': relationship.to_class.name,
                'type': relationship.relationship_type,
                'cardinality': {
                    'from': relationship.cardinality_from,
                    'to': relationship.cardinality_to
                }
            }
            duplicate_data['relationships'].append(rel_data)

        # Crear duplicado
        duplicate = self.service.create_diagram(duplicate_data)
        serializer = SerializadorDiagrama(duplicate)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VistaConjuntoEntidadesClase(viewsets.ModelViewSet):
    """Conjunto de vistas para operaciones CRUD de entidades de clase"""
    queryset = EntidadClase.objects.all()
    serializer_class = SerializadorEntidadClase
    service = ClassEntityService()

    @action(detail=True, methods=['post'])
    def agregar_atributo(self, request, pk=None):
        """Agregar atributo a la clase"""
        attribute = self.service.add_attribute(pk, request.data)
        serializer = SerializadorAtributoClase(attribute)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='attributes/(?P<attr_name>[^/.]+)')
    def eliminar_atributo(self, request, pk=None, attr_name=None):
        """Eliminar atributo de la clase"""
        success = self.service.remove_attribute(pk, attr_name)
        if success:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(
            {'error': 'Attribute not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    @action(detail=True, methods=['patch'])
    def actualizar_posicion(self, request, pk=None):
        """Actualizar posición de la clase"""
        class_entity = self.service.update_class_position(pk, request.data['position'])
        serializer = SerializadorEntidadClase(class_entity)
        return Response(serializer.data)


class VistaConjuntoRelaciones(viewsets.ModelViewSet):
    """Conjunto de vistas para operaciones CRUD de relaciones"""
    queryset = Relacion.objects.all()
    serializer_class = SerializadorRelacion

# Alias para compatibilidad con urls.py
DiagramViewSet = VistaConjuntoDiagramas
ClassEntityViewSet = VistaConjuntoEntidadesClase
RelationshipViewSet = VistaConjuntoRelaciones
