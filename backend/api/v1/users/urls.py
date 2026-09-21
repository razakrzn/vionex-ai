from rest_framework.routers import DefaultRouter
from .views import UserViewSet
from .views_role import RoleViewSet, PermissionViewSet

router = DefaultRouter()
# Register specific routes FIRST (before the generic "" route)
# This ensures /api/v1/users/roles/ goes to RoleViewSet, not UserViewSet
router.register("roles", RoleViewSet, basename="roles")
router.register("permissions", PermissionViewSet, basename="permissions")
# Register the generic UserViewSet LAST so it doesn't catch the specific routes above
router.register("", UserViewSet, basename="users")

urlpatterns = router.urls
