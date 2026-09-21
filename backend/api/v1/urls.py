from django.urls import path, include

urlpatterns = [
    path("auth/", include("api.v1.auth.urls")),
    path("users/", include("api.v1.users.urls")),
    path("countries/", include("api.v1.locations.urls")),
    path("dashboard/", include("api.v1.dashboard.urls")),
    path("real-estate/", include("api.v1.real_estate.urls")),
    path("fitness/", include("api.v1.fitness.urls")),
    path("ads/", include("api.v1.ads.urls")),
    path("payments/", include("api.v1.payments.urls")),
    path("offers/", include("api.v1.offers.urls")),
    path("", include("api.v1.notifications.urls")),
]