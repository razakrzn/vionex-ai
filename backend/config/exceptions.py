from rest_framework.views import exception_handler
from rest_framework import status
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


def custom_exception_handler(exc, context):
    """
    Custom exception handler that adds status_code to JWT token validation errors
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Check if this is a JWT token validation error
    if isinstance(exc, (InvalidToken, TokenError)):
        if response is not None:
            # Add status_code to the response data
            response.data['status_code'] = response.status_code
        else:
            # If response is None, create a default response
            from rest_framework.response import Response
            response = Response(
                {
                    "detail": "Given token not valid for any token type",
                    "code": "token_not_valid",
                    "messages": [
                        {
                            "token_class": "AccessToken",
                            "token_type": "access",
                            "message": str(exc)
                        }
                    ],
                    "status_code": status.HTTP_401_UNAUTHORIZED
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
    elif response is not None:
        # For other exceptions, check if status_code is already in the response
        # If not, add it
        if 'status_code' not in response.data:
            response.data['status_code'] = response.status_code
    
    return response





























