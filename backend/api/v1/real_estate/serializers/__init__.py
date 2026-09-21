from .asset_type import (
    AssetTypeListSerializer,
    AssetTypeDetailSerializer,
    AssetTypeCreateSerializer
)
from .property_type import (
    PropertyTypeListSerializer,
    PropertyTypeDetailSerializer,
    PropertyTypeCreateSerializer
)
from .purpose import (
    PurposeListSerializer,
    PurposeDetailSerializer,
    PurposeCreateSerializer
)
from .furnishing_status import (
    FurnishingStatusListSerializer,
    FurnishingStatusDetailSerializer,
    FurnishingStatusCreateSerializer
)
from .completion_status import (
    CompletionStatusListSerializer,
    CompletionStatusDetailSerializer,
    CompletionStatusCreateSerializer
)
from .occupant_type import (
    OccupantTypeListSerializer,
    OccupantTypeDetailSerializer,
    OccupantTypeCreateSerializer
)
from .amenity import (
    AmenityListSerializer,
    AmenityDetailSerializer,
    AmenityCreateSerializer
)
from .property import (
    PropertyListSerializer,
    PropertyDetailSerializer,
    PropertyCreateSerializer,
    PropertyApproveRejectSerializer,
    PropertyListingStatusSerializer
)
from .property_contact import (
    PropertyContactCreateSerializer,
    PropertyContactListSerializer
)

from .property_archive import (
    PropertyArchiveListSerializer,
    PropertyArchiveDetailSerializer,
)

