
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path
from apps.diagrams import consumers

application = ProtocolTypeRouter({
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path("ws/collaboration/<str:diagram_id>/", consumers.CollaborationConsumer.as_asgi()),
        ])
    ),
})
