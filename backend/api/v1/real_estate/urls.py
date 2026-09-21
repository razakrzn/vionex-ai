from rest_framework.routers import DefaultRouter
from .views import (
    AssetTypeViewSet,
    PropertyTypeViewSet,
    PurposeViewSet,
    FurnishingStatusViewSet,
    CompletionStatusViewSet,
    OccupantTypeViewSet,
    AmenityViewSet,
    PropertyArchiveViewSet,
    PropertyViewSet,
)

router = DefaultRouter()
router.register("asset-types", AssetTypeViewSet, basename="asset-types")
router.register("property-types", PropertyTypeViewSet, basename="property-types")
router.register("purposes", PurposeViewSet, basename="purposes")
router.register("furnishing-statuses", FurnishingStatusViewSet, basename="furnishing-statuses")
router.register("completion-statuses", CompletionStatusViewSet, basename="completion-statuses")
router.register("occupant-types", OccupantTypeViewSet, basename="occupant-types")
router.register("amenities", AmenityViewSet, basename="amenities")
router.register("property-archives", PropertyArchiveViewSet, basename="property-archives")
router.register("properties", PropertyViewSet, basename="properties")

urlpatterns = router.urls

