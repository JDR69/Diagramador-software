"""
Serializadores para modelos de diagrama - Capa de Presentación
"""
from rest_framework import serializers
from .models import Diagrama, EntidadClase, AtributoClase, Relacion


class SerializadorAtributoClase(serializers.ModelSerializer):
    """Serializador para atributos de clase"""
    
    class Meta:
        model = AtributoClase
        fields = ['id', 'name', 'data_type', 'visibility', 'created_at']
        read_only_fields = ['id', 'created_at']


class SerializadorEntidadClase(serializers.ModelSerializer):
    """Serializador para entidades de clase"""
    attributes = SerializadorAtributoClase(many=True, read_only=True)
    position = serializers.SerializerMethodField()
    
    class Meta:
        model = EntidadClase
        fields = ['id', 'name', 'position', 'attributes', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_position(self, obj):
        return {'x': obj.position_x, 'y': obj.position_y}
    
    def update(self, instance, validated_data):
        # Handle position updates
        if 'position' in self.initial_data:
            position = self.initial_data['position']
            instance.position_x = position.get('x', instance.position_x)
            instance.position_y = position.get('y', instance.position_y)
        
        return super().update(instance, validated_data)


class SerializadorRelacion(serializers.ModelSerializer):
    """Serializador para relaciones"""
    cardinality = serializers.SerializerMethodField()
    
    class Meta:
        model = Relacion
        fields = [
            'id', 'from_class', 'to_class', 'relationship_type', 
            'cardinality', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_cardinality(self, obj):
        return {
            'from': obj.cardinality_from,
            'to': obj.cardinality_to
        }


class SerializadorDiagrama(serializers.ModelSerializer):
    """Serializador para diagramas"""
    classes = SerializadorEntidadClase(many=True, read_only=True)
    relationships = SerializadorRelacion(many=True, read_only=True)
    
    class Meta:
        model = Diagrama
        fields = [
            'id', 'name', 'description', 'classes', 'relationships',
            'is_public', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SerializadorCrearDiagrama(serializers.ModelSerializer):
    """Serializador para crear diagramas con clases y relaciones"""
    classes = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)
    relationships = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)
    
    class Meta:
        model = Diagrama
        fields = ['id', 'name', 'description', 'classes', 'relationships', 'is_public']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        classes_data = validated_data.pop('classes', [])
        relationships_data = validated_data.pop('relationships', [])
        
        diagrama = Diagrama.objects.create(**validated_data)
        
        # Crear clases
        class_mapping = {}
        for class_data in classes_data:
            attributes_data = class_data.pop('attributes', [])
            position = class_data.pop('position', {'x': 0, 'y': 0})
            
            entidad_clase = EntidadClase.objects.create(
                diagram=diagrama,
                position_x=position['x'],
                position_y=position['y'],
                **class_data
            )
            class_mapping[class_data['name']] = entidad_clase
            
            # Crear atributos
            for attr_data in attributes_data:
                AtributoClase.objects.create(
                    class_entity=entidad_clase,
                    name=attr_data,
                    data_type='String'
                )
        
        # Crear relaciones
        for rel_data in relationships_data:
            from_class_name = rel_data.get('from')
            to_class_name = rel_data.get('to')
            
            if from_class_name in class_mapping and to_class_name in class_mapping:
                cardinality = rel_data.get('cardinality', {'from': '1', 'to': '1'})
                
                Relacion.objects.create(
                    diagram=diagrama,
                    from_class=class_mapping[from_class_name],
                    to_class=class_mapping[to_class_name],
                    relationship_type=rel_data.get('type', 'association'),
                    cardinality_from=cardinality['from'],
                    cardinality_to=cardinality['to']
                )
        
        return diagrama
