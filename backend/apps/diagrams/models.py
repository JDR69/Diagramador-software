"""
Modelos para la gestión de diagramas - Capa de Dominio
"""
from django.db import models
from django.contrib.auth.models import User
import uuid


class Diagrama(models.Model):
    """Modelo de diagrama que representa un diagrama de clases"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, default="Nuevo Diagrama")
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_public = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'diagrams'
        ordering = ['-updated_at']
    
    def __str__(self):
        return self.name


class EntidadClase(models.Model):
    """Modelo de entidad de clase que representa clases UML"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    diagram = models.ForeignKey(Diagrama, on_delete=models.CASCADE, related_name='classes')
    name = models.CharField(max_length=100)
    position_x = models.IntegerField(default=0)
    position_y = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'class_entities'
        unique_together = ['diagram', 'name']
    
    def __str__(self):
        return f"{self.diagram.name} - {self.name}"


class AtributoClase(models.Model):
    """Modelo de atributo de clase"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class_entity = models.ForeignKey(EntidadClase, on_delete=models.CASCADE, related_name='attributes')
    name = models.CharField(max_length=100)
    data_type = models.CharField(max_length=50, default='String')
    visibility = models.CharField(
        max_length=10,
        choices=[
            ('public', 'Public'),
            ('private', 'Private'),
            ('protected', 'Protected'),
        ],
        default='public'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'class_attributes'
        unique_together = ['class_entity', 'name']
    
    def __str__(self):
        return f"{self.class_entity.name}.{self.name}"


class Relacion(models.Model):
    """Modelo de relación entre clases"""
    RELATIONSHIP_TYPES = [
        ('association', 'Association'),
        ('inheritance', 'Inheritance'),
        ('composition', 'Composition'),
        ('aggregation', 'Aggregation'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    diagram = models.ForeignKey(Diagrama, on_delete=models.CASCADE, related_name='relationships')
    from_class = models.ForeignKey(EntidadClase, on_delete=models.CASCADE, related_name='outgoing_relationships')
    to_class = models.ForeignKey(EntidadClase, on_delete=models.CASCADE, related_name='incoming_relationships')
    relationship_type = models.CharField(max_length=20, choices=RELATIONSHIP_TYPES, default='association')
    cardinality_from = models.CharField(max_length=10, default='1')
    cardinality_to = models.CharField(max_length=10, default='1')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'relationships'
        unique_together = ['from_class', 'to_class', 'relationship_type']
    
    def __str__(self):
        return f"{self.from_class.name} -> {self.to_class.name} ({self.relationship_type})"
