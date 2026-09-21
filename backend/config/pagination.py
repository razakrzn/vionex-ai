from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """
    Default pagination class for API list endpoints.
    - Default page size: 20
    - Client can override with ?page_size=
    - Maximum page size: 100 (safety limit)
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


