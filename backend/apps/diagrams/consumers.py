import json
from channels.generic.websocket import AsyncWebsocketConsumer

# Consumidor WebSocket para colaboración en diagramas
class ConsumidorColaboracion(AsyncWebsocketConsumer):
    async def connect(self):
        self.diagram_id = self.scope['url_route']['kwargs']['diagram_id']
        self.room_group_name = f'collaboration_{self.diagram_id}'

        # Unirse al grupo de la sala
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Salir del grupo de la sala
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('type')
        payload = data.get('payload', {})
        # Difundir eventos de handshake y actualización al grupo
        if event_type in ["request_initial_state", "initial_state"]:
            # Para handshake, siempre reenviar a todos (los clientes filtran por userId)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'collaboration_event',
                    'event_type': event_type,
                    'payload': payload,
                }
            )
        else:
            # Difundir al grupo, reenviando tipo y payload
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'collaboration_event',
                    'event_type': event_type,
                    'payload': payload,
                }
            )

    async def collaboration_event(self, event):
        # Reenviar el tipo y payload tal como lo espera el frontend
        await self.send(text_data=json.dumps({
            'type': event['event_type'],
            'payload': event['payload'],
        }))
        # Si el tipo termina en '_update', también reenviar con '_updated' (ej: class_update -> class_updated)
        if event['event_type'] and event['event_type'].endswith('_update'):
            await self.send(text_data=json.dumps({
                'type': event['event_type'] + 'd',
                'payload': event['payload'],
            }))
