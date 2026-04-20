"""
Migration script to add new tables for Features 1, 2, 6
- DeviceActivityLog (Feature 6: Device Logs & History)
- DashboardStats (Feature 1: Dashboard & Statistics)
- Schedule updates (Feature 2: Device Scheduling - already exists but improved)

Run this after updating models.py
"""

from app import app, db
from models import DeviceActivityLog, DashboardStats, House, Floor, Room, Device, Sensor, AutomationRule
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_new_tables():
    """Create new tables if they don't exist"""
    with app.app_context():
        logger.info("🔄 Creating new tables...")
        
        try:
            # Create tables
            db.create_all()
            logger.info("✅ Tables created successfully")
            
            # Initialize DashboardStats for existing houses
            houses = House.query.all()
            for house in houses:
                # Check if stats already exist
                existing_stats = DashboardStats.query.filter_by(house_id=house.house_id).first()
                if not existing_stats:
                    logger.info(f"Creating dashboard stats for house: {house.house_name}")
                    
                    floors = Floor.query.filter_by(house_id=house.house_id).count()
                    rooms = Room.query.join(Floor).filter(Floor.house_id == house.house_id).count()
                    devices = Device.query.join(Room).join(Floor).filter(Floor.house_id == house.house_id).all()
                    
                    total_devices = len(devices)
                    devices_online = sum(1 for d in devices if d.connection_status == 'online')
                    devices_offline = total_devices - devices_online
                    devices_on = sum(1 for d in devices if d.status == 'on')
                    devices_off = total_devices - devices_on
                    
                    sensors = Sensor.query.join(Room).join(Floor).filter(Floor.house_id == house.house_id).count()
                    
                    rules = AutomationRule.query.join(Room).join(Floor).filter(Floor.house_id == house.house_id).all()
                    total_rules = len(rules)
                    active_rules = sum(1 for r in rules if r.is_active)
                    
                    stats = DashboardStats(
                        house_id=house.house_id,
                        total_devices=total_devices,
                        devices_online=devices_online,
                        devices_offline=devices_offline,
                        devices_on=devices_on,
                        devices_off=devices_off,
                        total_sensors=sensors,
                        automation_rules_total=total_rules,
                        automation_rules_active=active_rules,
                        total_rooms=rooms,
                        total_floors=floors,
                        last_updated=datetime.utcnow()
                    )
                    
                    db.session.add(stats)
            
            db.session.commit()
            logger.info("✅ Dashboard stats initialized for all houses")
            
        except Exception as e:
            logger.error(f"❌ Error creating tables: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("🚀 Starting migration for new features...")
    logger.info("=" * 60)
    
    create_new_tables()
    
    logger.info("=" * 60)
    logger.info("✅ Migration completed successfully!")
    logger.info("=" * 60)
    logger.info("")
    logger.info("New features added:")
    logger.info("  1️⃣  Dashboard & Statistics - Track house/device/sensor stats")
    logger.info("  2️⃣  Device Scheduling - Schedule device turn-on/off by time")
    logger.info("  6️⃣  Device Logs & History - Track all device activities")
    logger.info("")
