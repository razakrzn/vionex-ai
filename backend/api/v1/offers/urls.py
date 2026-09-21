from rest_framework.routers import DefaultRouter
from .views import OfferViewSet

router = DefaultRouter()
router.register("", OfferViewSet, basename="offers")

urlpatterns = router.urls
