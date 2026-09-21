"""
Google Places API service for fetching location data dynamically.
REST Countries API service for fetching country data.
"""
import os
from typing import List, Dict, Optional
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Optional import - requests library
try:
    import requests
except ImportError:
    requests = None
    logger.warning("requests library not installed. REST Countries API features will be disabled.")

# Optional import - googlemaps will be None if not installed
try:
    import googlemaps
except ImportError:
    googlemaps = None
    logger.warning("googlemaps library not installed. Google Places API features will be disabled.")


class GooglePlacesService:
    """
    Service class for interacting with Google Places API.
    Handles fetching states/administrative areas and cities for countries.
    """
    
    def __init__(self):
        api_key = os.getenv('GOOGLE_PLACES_API_KEY')
        if not api_key or googlemaps is None:
            if not api_key:
                logger.warning("GOOGLE_PLACES_API_KEY not set. Google Places API features will be disabled.")
            if googlemaps is None:
                logger.warning("googlemaps library not installed. Google Places API features will be disabled.")
            self.client = None
        else:
            self.client = googlemaps.Client(key=api_key)
    
    def get_states_for_country(self, country_code: str) -> List[Dict]:
        """
        Get states/administrative areas for a given country.
        
        Args:
            country_code: ISO 3166-1 alpha-2 country code (e.g., 'AE', 'IN', 'SA')
        
        Returns:
            List of dictionaries with state information:
            [
                {'name': 'Dubai', 'short_name': 'DXB'},
                {'name': 'Abu Dhabi', 'short_name': 'AZ'},
                ...
            ]
        """
        if not self.client:
            return []
        
        try:
            # Use Geocoding API to get administrative areas
            # First, get the country's bounds or use a known city
            country_name_map = {
                'AE': 'United Arab Emirates',
                'IN': 'India',
                'SA': 'Saudi Arabia',
                'US': 'United States',
                'GB': 'United Kingdom',
            }
            
            country_name = country_name_map.get(country_code.upper(), '')
            if not country_name:
                logger.warning(f"Unknown country code: {country_code}")
                return []
            
            # Use Autocomplete API with country restriction
            # This is a workaround since Google Places doesn't have a direct "get all states" endpoint
            # We'll use a combination of known major cities/states
            states = []
            
            # For UAE, we know the emirates
            if country_code.upper() == 'AE':
                states = [
                    {'name': 'Abu Dhabi', 'short_name': 'AZ'},
                    {'name': 'Dubai', 'short_name': 'DXB'},
                    {'name': 'Sharjah', 'short_name': 'SH'},
                    {'name': 'Ajman', 'short_name': 'AJ'},
                    {'name': 'Umm Al Quwain', 'short_name': 'UQ'},
                    {'name': 'Ras Al Khaimah', 'short_name': 'RK'},
                    {'name': 'Fujairah', 'short_name': 'FU'},
                ]
            else:
                # For other countries, use Geocoding API with administrative_area_level_1
                # This requires making requests for known cities and extracting states
                # For now, return empty list - can be enhanced with country-specific logic
                logger.info(f"States for {country_code} not pre-configured. Consider adding country-specific logic.")
            
            return states
            
        except Exception as e:
            logger.error(f"Error fetching states for country {country_code}: {str(e)}")
            return []
    
    def get_cities_for_state(self, country_code: str, state_name: str) -> List[Dict]:
        """
        Get cities for a given state/emirate using Google Places Autocomplete.
        
        Args:
            country_code: ISO 3166-1 alpha-2 country code (e.g., 'AE', 'IN')
            state_name: Name of the state/emirate (e.g., 'Dubai', 'Abu Dhabi')
        
        Returns:
            List of dictionaries with city information:
            [
                {'name': 'Dubai Marina', 'place_id': '...'},
                {'name': 'Business Bay', 'place_id': '...'},
                ...
            ]
        """
        if not self.client:
            return []
        
        try:
            # Use Places Autocomplete API with location bias
            # Restrict to the specific country
            query = f"{state_name}, {country_code}"
            
            # Get autocomplete predictions
            autocomplete_result = self.client.places_autocomplete(
                input_text=query,
                components={'country': country_code.lower()},
                types=['(cities)']  # Restrict to cities
            )
            
            cities = []
            seen_names = set()
            
            for prediction in autocomplete_result:
                # Extract city name from structured_formatting
                city_name = prediction.get('structured_formatting', {}).get('main_text', '')
                place_id = prediction.get('place_id', '')
                
                # Filter to only include cities in the specified state
                # We can refine this by checking the prediction's description
                description = prediction.get('description', '')
                if state_name.lower() in description.lower() or city_name:
                    if city_name and city_name not in seen_names:
                        cities.append({
                            'name': city_name,
                            'place_id': place_id,
                            'description': description
                        })
                        seen_names.add(city_name)
            
            # If we don't get enough results, try a different approach
            # Search for specific areas within the state
            if len(cities) < 5:
                # For UAE, add known areas
                if country_code.upper() == 'AE' and state_name.lower() == 'dubai':
                    known_areas = [
                        'Dubai Marina', 'Business Bay', 'Downtown Dubai', 
                        'Jumeirah', 'Al Barsha', 'Deira', 'Bur Dubai',
                        'Dubai Hills', 'Arabian Ranches', 'Palm Jumeirah',
                        'JBR', 'Al Nahda', 'Al Qusais', 'International City'
                    ]
                    for area in known_areas:
                        if area not in seen_names:
                            cities.append({
                                'name': area,
                                'place_id': '',
                                'description': f"{area}, {state_name}, UAE"
                            })
                            seen_names.add(area)
            
            return cities[:50]  # Limit to 50 results
            
        except Exception as e:
            logger.error(f"Error fetching cities for {state_name}, {country_code}: {str(e)}")
            return []
    
    def search_places(self, query: str, country_code: Optional[str] = None) -> List[Dict]:
        """
        Search for places using Google Places Autocomplete.
        
        Args:
            query: Search query (e.g., "Dubai Marina")
            country_code: Optional country code to restrict results
        
        Returns:
            List of place predictions
        """
        if not self.client:
            return []
        
        try:
            components = {}
            if country_code:
                components['country'] = country_code.lower()
            
            autocomplete_result = self.client.places_autocomplete(
                input_text=query,
                components=components if components else None
            )
            
            return [
                {
                    'name': pred.get('structured_formatting', {}).get('main_text', ''),
                    'description': pred.get('description', ''),
                    'place_id': pred.get('place_id', '')
                }
                for pred in autocomplete_result
            ]
            
        except Exception as e:
            logger.error(f"Error searching places: {str(e)}")
            return []


# Singleton instance
google_places_service = GooglePlacesService()


class RestCountriesService:
    """
    Service class for interacting with REST Countries API.
    Free API that provides country data including name, code, phone_code, currency, and flags.
    No API key required.
    Base URL: https://restcountries.com/v3.1
    """
    
    BASE_URL = "https://restcountries.com/v3.1"
    
    def get_all_countries(self) -> List[Dict]:
        """
        Get all countries from REST Countries API.
        
        Returns:
            List of dictionaries with country information:
            [
                {
                    'name': 'United Arab Emirates',
                    'code': 'AE',
                    'phone_code': '+971',
                    'currency': 'AED',
                    'flag_image_url': 'https://flagcdn.com/w320/ae.png'
                },
                ...
            ]
        """
        if not requests:
            logger.warning("requests library not installed. Cannot fetch countries from REST Countries API.")
            return []
        
        try:
            # REST Countries API v3.1 requires fields parameter (max 10 fields)
            # We need: name, cca2, idd, currencies, flags
            fields = "name,cca2,idd,currencies,flags"
            response = requests.get(f"{self.BASE_URL}/all?fields={fields}", timeout=10)
            response.raise_for_status()
            countries_data = response.json()
            
            countries = []
            for country in countries_data:
                # Extract country name (use common name)
                name = country.get('name', {}).get('common', '')
                
                # Extract ISO 3166-1 alpha-2 code
                code = country.get('cca2', '')
                
                # Extract phone code (international dialing code)
                idd = country.get('idd', {})
                root = idd.get('root', '')
                suffixes = idd.get('suffixes', [])
                phone_code = f"{root}{suffixes[0]}" if suffixes else root
                
                # Extract currency (get first currency code)
                currencies = country.get('currencies', {})
                currency = list(currencies.keys())[0] if currencies else 'USD'
                
                # Extract flag image URL
                flags = country.get('flags', {})
                flag_image_url = flags.get('png', '') or flags.get('svg', '')
                
                if name and code:
                    countries.append({
                        'name': name,
                        'code': code,
                        'phone_code': phone_code or '',
                        'currency': currency,
                        'flag_image_url': flag_image_url
                    })
            
            # Sort by name
            countries.sort(key=lambda x: x['name'])
            
            logger.info(f"Fetched {len(countries)} countries from REST Countries API")
            return countries
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching countries from REST Countries API: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error processing countries data: {str(e)}")
            return []
    
    def get_country_by_code(self, country_code: str) -> Optional[Dict]:
        """
        Get a single country by its ISO 3166-1 alpha-2 code.
        
        Args:
            country_code: ISO 3166-1 alpha-2 country code (e.g., 'AE', 'IN', 'SA')
        
        Returns:
            Dictionary with country information or None if not found
        """
        if not requests:
            logger.warning("requests library not installed. Cannot fetch country from REST Countries API.")
            return None
        
        try:
            # REST Countries API v3.1 requires fields parameter (max 10 fields)
            fields = "name,cca2,idd,currencies,flags"
            response = requests.get(f"{self.BASE_URL}/alpha/{country_code.upper()}?fields={fields}", timeout=10)
            response.raise_for_status()
            country_data = response.json()
            
            # Handle both single object and list responses
            if isinstance(country_data, list):
                country_data = country_data[0]
            
            # Extract country name
            name = country_data.get('name', {}).get('common', '')
            
            # Extract ISO 3166-1 alpha-2 code
            code = country_data.get('cca2', '')
            
            # Extract phone code
            idd = country_data.get('idd', {})
            root = idd.get('root', '')
            suffixes = idd.get('suffixes', [])
            phone_code = f"{root}{suffixes[0]}" if suffixes else root
            
            # Extract currency
            currencies = country_data.get('currencies', {})
            currency = list(currencies.keys())[0] if currencies else 'USD'
            
            # Extract flag image URL
            flags = country_data.get('flags', {})
            flag_image_url = flags.get('png', '') or flags.get('svg', '')
            
            return {
                'name': name,
                'code': code,
                'phone_code': phone_code or '',
                'currency': currency,
                'flag_image_url': flag_image_url
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching country {country_code} from REST Countries API: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error processing country data: {str(e)}")
            return None


# Singleton instance
rest_countries_service = RestCountriesService()
