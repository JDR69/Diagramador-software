
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DiagramViewSet, ClassEntityViewSet, RelationshipViewSet

router = DefaultRouter()
router.register(r'diagrams', DiagramViewSet)
router.register(r'classes', ClassEntityViewSet)
router.register(r'relationships', RelationshipViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
