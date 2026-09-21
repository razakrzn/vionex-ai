from rest_framework.routers import DefaultRouter
from .views import (
    CountryViewSet, 
    DynamicStateViewSet,
    DynamicCityViewSet
)

router = DefaultRouter()
# Register specific routes FIRST (before the generic "" route)
# This ensures /api/v1/countries/states/ goes to DynamicStateViewSet, not CountryViewSet
router.register("states", DynamicStateViewSet, basename="states")
router.register("dynamic-cities", DynamicCityViewSet, basename="dynamic-cities")
# Register the generic CountryViewSet LAST so it doesn't catch the specific routes above
router.register("", CountryViewSet, basename="countries")

urlpatterns = router.urls

