
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import diagram_backend.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'diagram_backend.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        diagram_backend.routing.application
    ),
})
