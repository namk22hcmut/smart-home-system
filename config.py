# Configuration and Database Settings
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    # Database - Fall back to SQLite if PostgreSQL not available
    _db_url = os.getenv('DATABASE_URL', '')
    if _db_url and 'postgresql' in _db_url:
        SQLALCHEMY_DATABASE_URI = _db_url
    else:
        SQLALCHEMY_DATABASE_URI = 'sqlite:///smarthome.db'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv('SQLALCHEMY_ECHO', 'False') == 'True'
    
    # Flask
    DEBUG = os.getenv('FLASK_ENV', 'development') == 'development'
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET = os.getenv('JWT_SECRET', 'jwt-secret-key-change-in-production')
    JWT_ALGORITHM = 'HS256'
    JWT_EXPIRATION_HOURS = 24
    
    # MQTT / Adafruit (REQUIRED - must be set in .env file)
    ADAFRUIT_USERNAME = os.getenv('ADAFRUIT_USERNAME')
    ADAFRUIT_KEY = os.getenv('ADAFRUIT_KEY')
    if not ADAFRUIT_USERNAME or not ADAFRUIT_KEY:
        raise ValueError(
            '❌ Missing Adafruit credentials!\n'
            'Please set ADAFRUIT_USERNAME and ADAFRUIT_KEY in .env file\n'
            'Get them from: https://io.adafruit.com/settings/keys'
        )
    MQTT_BROKER = 'io.adafruit.com'
    MQTT_PORT = 1883
    
    # API
    BACKEND_API_URL = os.getenv('BACKEND_API_URL', 'http://localhost:8000')
    API_TIMEOUT = 10
    
    # Device Defaults (0-100% level scale)
    DEVICE_DEFAULT_LEVEL = 0
    DEVICE_LEVEL_LIGHTS = 75
    DEVICE_LEVEL_FANS = 50
    DEVICE_LEVEL_TV = 100
    DEVICE_LEVEL_AC = 70

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

# Config mapping for app.py
config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
