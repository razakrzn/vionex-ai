from rest_framework.routers import DefaultRouter
from .views import (
    GymTypeViewSet,
    FacilityViewSet,
    GymViewSet,
)

router = DefaultRouter()
router.register("gym-types", GymTypeViewSet, basename="gym-types")
router.register("facilities", FacilityViewSet, basename="facilities")
router.register("gyms", GymViewSet, basename="gyms")

urlpatterns = router.urls
