"""
Django admin configuration for diagrams
"""
from django.contrib import admin
from .models import Diagrama, EntidadClase, AtributoClase, Relacion


@admin.register(Diagrama)
class DiagramaAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_by', 'is_public', 'created_at', 'updated_at']
    list_filter = ['is_public', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(EntidadClase)
class EntidadClaseAdmin(admin.ModelAdmin):
    list_display = ['name', 'diagram', 'position_x', 'position_y', 'created_at']
    list_filter = ['diagram', 'created_at']
    search_fields = ['name', 'diagram__name']


@admin.register(AtributoClase)
class AtributoClaseAdmin(admin.ModelAdmin):
    list_display = ['name', 'class_entity', 'data_type', 'visibility']
    list_filter = ['data_type', 'visibility']
    search_fields = ['name', 'class_entity__name']


@admin.register(Relacion)
class RelacionAdmin(admin.ModelAdmin):
    list_display = ['from_class', 'to_class', 'relationship_type', 'cardinality_from', 'cardinality_to']
    list_filter = ['relationship_type']
    search_fields = ['from_class__name', 'to_class__name']
