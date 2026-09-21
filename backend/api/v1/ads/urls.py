from rest_framework.routers import DefaultRouter
from .views import AdViewSet

router = DefaultRouter()
router.register("", AdViewSet, basename="ads")

urlpatterns = router.urls

