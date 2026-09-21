from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import DashboardViewSet, DashboardModuleViewSet

router = DefaultRouter()
# Register specific routes FIRST (before the generic "" route)
# This ensures /api/v1/dashboard/modules/ goes to DashboardModuleViewSet, not DashboardViewSet
router.register("modules", DashboardModuleViewSet, basename="dashboard-modules")
# Register dashboard routes LAST so it doesn't catch the specific routes above
router.register("", DashboardViewSet, basename="dashboard")

urlpatterns = router.urls

