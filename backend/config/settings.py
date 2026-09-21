from pathlib import Path
import os
import platform
from datetime import timedelta
from dotenv import load_dotenv
import dj_database_url

_ENV_MISSING = object()


def env(name, default=_ENV_MISSING):
    value = os.getenv(name)
    if value is None:
        if default is _ENV_MISSING:
            raise ValueError(
                f"{name} environment variable is required. "
                "Please set it in the root .env file."
            )
        return default
    return value

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent

# Load environment variables from the repository root .env file
load_dotenv(REPO_ROOT / '.env')


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError(
        "SECRET_KEY environment variable is required. "
        "Please set SECRET_KEY in the root .env file."
    )

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get("DEBUG", "False") == "True"

# ALLOWED_HOSTS - comma-separated list of allowed hosts
ALLOWED_HOSTS_STR = os.environ.get('ALLOWED_HOSTS', '*')
if ALLOWED_HOSTS_STR == '*':
    # Only allow all hosts in development
    if DEBUG:
        ALLOWED_HOSTS = ["*"]
    else:
        raise ValueError(
            "ALLOWED_HOSTS cannot be '*' in production. "
            "Please set ALLOWED_HOSTS to a comma-separated list of allowed hosts in the root .env file."
        )
else:
    ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS_STR.split(',') if host.strip()]


# Application definition

# Check storage backend early to configure INSTALLED_APPS


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",  # Required for PointField and GIS functionality

    "rest_framework",
    "drf_spectacular",
    "corsheaders",
    "django_filters",
    "storages",

    "apps.users",
    "apps.countries",
    "apps.dashboard",
    "apps.real_estate",
    "apps.ads",
    "apps.payments",
    "apps.notifications",
    "apps.fitness",
    "apps.analytics",
    "apps.offers",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "config.middleware.APIFriendlyCommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "config.middleware.VisitorTrackingMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

# GDAL and GEOS Library Paths (required for PointField and GIS functionality)
# Only set paths on macOS (local development). On Linux (production), Django will auto-detect.
if platform.system() == 'Darwin':  # macOS
    GDAL_LIBRARY_PATH = '/opt/homebrew/opt/gdal/lib/libgdal.dylib'
    GEOS_LIBRARY_PATH = '/opt/homebrew/opt/geos/lib/libgeos_c.dylib'
else:
    # On Linux (Render), let Django auto-detect the libraries
    # They should be installed system-wide via apt-get or similar
    GDAL_LIBRARY_PATH = None
    GEOS_LIBRARY_PATH = None

# Use environment variable for database connection (external PostgreSQL provider)
DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL environment variable is required. "
        "Please set DATABASE_URL in the root .env file."
    )

# Database connection settings
DB_CONN_MAX_AGE = int(os.getenv('DB_CONN_MAX_AGE', 600))  # Default: 10 minutes
DB_CONN_HEALTH_CHECKS = os.getenv('DB_CONN_HEALTH_CHECKS', 'True') == 'True'

# Configure DATABASES using dj_database_url
DATABASES = {
    'default': dj_database_url.config(
        default=DATABASE_URL,
        conn_max_age=DB_CONN_MAX_AGE,
        conn_health_checks=DB_CONN_HEALTH_CHECKS,
        ssl_require=not DEBUG,  # Require SSL in production (AWS RDS requirement)
    )
}

# Override engine to use PostGIS
DATABASES['default']['ENGINE'] = 'django.contrib.gis.db.backends.postgis'

# Additional Database Options for Production
if not DEBUG:
    DATABASES['default']['OPTIONS'] = {
        'sslmode': 'require',
    }


# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

# Password minimum length
PASSWORD_MIN_LENGTH = int(os.getenv('PASSWORD_MIN_LENGTH', 6))

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {
            "min_length": PASSWORD_MIN_LENGTH,
        }
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = os.getenv('LANGUAGE_CODE', 'en-us')

TIME_ZONE = os.getenv('TIME_ZONE', 'UTC')

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Firebase Cloud Messaging (FCM) configuration
FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv(
    'FIREBASE_SERVICE_ACCOUNT_PATH',
    str(BASE_DIR / 'secrets' / 'firebase-service-account.json')
)

STORAGE_ACCESS_KEY_ID = env("STORAGE_ACCESS_KEY_ID")
STORAGE_SECRET_ACCESS_KEY = env("STORAGE_SECRET_ACCESS_KEY")
STORAGE_BUCKET_NAME = env("STORAGE_BUCKET_NAME")
STORAGE_REGION_NAME = env("STORAGE_REGION_NAME")

STORAGE_ENDPOINT_URL = env("STORAGE_ENDPOINT_URL", default=None)

STORAGE_CUSTOM_DOMAIN = env("STORAGE_CUSTOM_DOMAIN", default=None)
STORAGE_QUERYSTRING_AUTH = False
STORAGE_DEFAULT_ACL = None

# Media storage
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Max upload size in MB (default: 10MB), used by upload validation/logging
MEDIA_MAX_FILE_SIZE_MB = int(os.getenv('MEDIA_MAX_FILE_SIZE_MB', 10))

STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "access_key": STORAGE_ACCESS_KEY_ID,
            "secret_key": STORAGE_SECRET_ACCESS_KEY,
            "bucket_name": STORAGE_BUCKET_NAME,
            "region_name": STORAGE_REGION_NAME,
            "endpoint_url": STORAGE_ENDPOINT_URL,
            "custom_domain": STORAGE_CUSTOM_DOMAIN,
            "querystring_auth": STORAGE_QUERYSTRING_AUTH,
            "default_acl": STORAGE_DEFAULT_ACL,
        },
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}


# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "config.authentication.CustomJWTAuthentication",
    ),
    "EXCEPTION_HANDLER": "config.exceptions.custom_exception_handler",
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    # Global pagination settings
    "DEFAULT_PAGINATION_CLASS": "config.pagination.StandardResultsSetPagination",
    # Default page size if client does not specify ?page_size=
    "PAGE_SIZE": int(os.getenv('PAGE_SIZE', 20)),
    # OpenAPI schema generation
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Vionex API",
    "DESCRIPTION": "Vionex backend API schema",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# JWT Token Configuration
JWT_ACCESS_TOKEN_LIFETIME_MINUTES = int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', 5))
JWT_REFRESH_TOKEN_LIFETIME_DAYS = int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME_DAYS', 7))
JWT_ROTATE_REFRESH_TOKENS = os.getenv('JWT_ROTATE_REFRESH_TOKENS', 'False') == 'True'
JWT_BLACKLIST_AFTER_ROTATION = os.getenv('JWT_BLACKLIST_AFTER_ROTATION', 'False') == 'True'

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=JWT_ACCESS_TOKEN_LIFETIME_MINUTES),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=JWT_REFRESH_TOKEN_LIFETIME_DAYS),
    "ROTATE_REFRESH_TOKENS": JWT_ROTATE_REFRESH_TOKENS,
    "BLACKLIST_AFTER_ROTATION": JWT_BLACKLIST_AFTER_ROTATION,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

AUTH_USER_MODEL = "users.User"

# CORS Settings
# In development, allow all origins for easier frontend development
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True  # Only use in development!
else:
    # Production: Only allow specific origins from environment variable
    CORS_ALLOWED_ORIGINS_STR = os.environ.get('CORS_ALLOWED_ORIGINS')
    if not CORS_ALLOWED_ORIGINS_STR:
        raise ValueError(
            "CORS_ALLOWED_ORIGINS environment variable is required in production. "
            "Please set CORS_ALLOWED_ORIGINS to a comma-separated list of allowed origins in the root .env file."
        )
    CORS_ALLOWED_ORIGINS = [
        origin.strip() for origin in CORS_ALLOWED_ORIGINS_STR.split(',') if origin.strip()
    ]

CORS_ALLOW_CREDENTIALS = os.getenv('CORS_ALLOW_CREDENTIALS', 'True') == 'True'

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'api.v1.users.serializers.detail': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'api': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'api.v1.payments': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.payments': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.users.utils': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'api.v1.fitness.serializers.gym': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'apps.notifications': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.notifications.services': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'api.v1.real_estate.views': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'api.v1.real_estate.serializers.property': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Stripe Configuration
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')

# Payment Configuration
from decimal import Decimal
PAYMENT_AMOUNT_INDIVIDUAL = Decimal(os.getenv('PAYMENT_AMOUNT_INDIVIDUAL', '50.00'))  # AED per property
PAYMENT_AMOUNT_SUBSCRIPTION = Decimal(os.getenv('PAYMENT_AMOUNT_SUBSCRIPTION', '50.00'))  # AED for subscription
SUBSCRIPTION_DURATION_DAYS = int(os.getenv('SUBSCRIPTION_DURATION_DAYS', 90))  # Default: 3 months
SUBSCRIPTION_MIN_PAYABLE_AED = Decimal(os.getenv('SUBSCRIPTION_MIN_PAYABLE_AED', '20.00'))  # Min cash payment when using wallet

# Feature Flag: Require payment for property creation
# Payment is required for property and gym creation
# Can be overridden via environment variable REQUIRE_PAYMENT_FOR_PROPERTY_CREATION
REQUIRE_PAYMENT_FOR_PROPERTY_CREATION = os.environ.get('REQUIRE_PAYMENT_FOR_PROPERTY_CREATION', 'True') == 'True'

# Listing Validity Configuration
# Validity period in days for properties and gyms (starts when admin approves)
FREE_PROPERTY_VALIDITY_DAYS = int(os.environ.get('FREE_PROPERTY_VALIDITY_DAYS', 90))  # 3 months for free properties
PAID_VALIDITY_DAYS = int(os.environ.get('PAID_VALIDITY_DAYS', 90))  # Can be configured for paid properties and gyms

# Email Configuration
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'False') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER or 'noreply@vionex.com')
# SMTP timeout in seconds - prevents connection from hanging indefinitely
EMAIL_TIMEOUT = int(os.getenv('EMAIL_TIMEOUT', 10))  # 10 seconds timeout

# Frontend URL for password reset links
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

# Password Reset Settings
PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = int(os.getenv('PASSWORD_RESET_TOKEN_EXPIRY_MINUTES', 30))  # Default: 30 minutes

# Email Verification Settings
EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES = int(os.getenv('EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES', 10))  # Default: 10 minutes

# Firebase Cloud Messaging (FCM) uses FIREBASE_SERVICE_ACCOUNT_PATH above.

# Security Settings for Production
if not DEBUG:
    # SSL/HTTPS Settings
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True') == 'True'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    
    # HSTS (HTTP Strict Transport Security)
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', 31536000))  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    
    # Additional Security Headers
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    
    # Session Security
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # CSRF Settings
    CSRF_COOKIE_HTTPONLY = True
    CSRF_COOKIE_SAMESITE = 'Lax'
    CSRF_TRUSTED_ORIGINS = [
        origin.strip() for origin in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',')
        if origin.strip()
    ]
