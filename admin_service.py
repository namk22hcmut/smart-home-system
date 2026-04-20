"""
Admin Service - User and System Management
"""

from models import db, User, UserRole, UserStatus, AccessLevel, UserHouseAccess, ActivityLog
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class AdminService:
    """Service for admin operations"""
    
    # ====== USER MANAGEMENT ======
    
    @staticmethod
    def get_all_users(active_only=False):
        """Get all users with optional filtering"""
        try:
            query = User.query
            if active_only:
                query = query.filter_by(status=UserStatus.ACTIVE)
            
            users = query.all()
            return [u.to_dict() for u in users]
        except Exception as e:
            logger.error(f"Error fetching users: {e}")
            return []
    
    @staticmethod
    def get_user_by_id(user_id):
        """Get user details"""
        try:
            user = User.query.get(user_id)
            if user:
                return user.to_dict()
            return None
        except Exception as e:
            logger.error(f"Error fetching user: {e}")
            return None
    
    @staticmethod
    def create_admin_user(username, email, password, full_name=""):
        """Create a new admin user"""
        try:
            # Check if user exists
            if User.query.filter_by(username=username).first():
                logger.warning(f"User {username} already exists")
                return None
            
            if User.query.filter_by(email=email).first():
                logger.warning(f"Email {email} already exists")
                return None
            
            # Create admin user
            password_hash = generate_password_hash(password)
            user = User(
                username=username,
                email=email,
                password_hash=password_hash,
                full_name=full_name,
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE
            )
            
            db.session.add(user)
            db.session.commit()
            logger.info(f"✅ Admin user created: {username}")
            return user.to_dict()
        except Exception as e:
            logger.error(f"Error creating admin user: {e}")
            db.session.rollback()
            return None
    
    @staticmethod
    def disable_user(user_id, reason=""):
        """Disable a user account"""
        try:
            user = User.query.get(user_id)
            if not user:
                return False
            
            user.status = UserStatus.DISABLED
            db.session.commit()
            
            # Log activity
            from app import log_activity
            log_activity('user_disabled', 'user', user_id, f"User disabled: {reason}")
            
            logger.info(f"✅ User {user.username} disabled")
            return True
        except Exception as e:
            logger.error(f"Error disabling user: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def enable_user(user_id):
        """Enable a disabled user account"""
        try:
            user = User.query.get(user_id)
            if not user:
                return False
            
            user.status = UserStatus.ACTIVE
            db.session.commit()
            
            logger.info(f"✅ User {user.username} enabled")
            return True
        except Exception as e:
            logger.error(f"Error enabling user: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def delete_user(user_id):
        """Delete a user account"""
        try:
            user = User.query.get(user_id)
            if not user:
                return False
            
            username = user.username
            db.session.delete(user)
            db.session.commit()
            
            logger.info(f"✅ User {username} deleted")
            return True
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def change_user_role(user_id, new_role):
        """Change user role (user -> admin or admin -> user)"""
        try:
            user = User.query.get(user_id)
            if not user:
                return False
            
            old_role = user.role.value
            user.role = UserRole[new_role.upper()] if isinstance(new_role, str) else new_role
            db.session.commit()
            
            logger.info(f"✅ User {user.username} role changed from {old_role} to {new_role}")
            return True
        except Exception as e:
            logger.error(f"Error changing user role: {e}")
            db.session.rollback()
            return False
    
    # ====== HOUSE SHARING ======
    
    @staticmethod
    def share_house(house_id, owner_id, target_user_id, access_level='viewer'):
        """Share a house with another user"""
        try:
            from models import House
            
            # Verify house owner
            house = House.query.get(house_id)
            if not house or house.user_id != owner_id:
                logger.warning(f"House {house_id} not owned by user {owner_id}")
                return False
            
            # Check if target user exists
            target_user = User.query.get(target_user_id)
            if not target_user:
                logger.warning(f"Target user {target_user_id} not found")
                return False
            
            # Check if already shared
            existing = UserHouseAccess.query.filter_by(
                user_id=target_user_id,
                house_id=house_id
            ).first()
            
            if existing:
                # Update access level
                existing.access_level = AccessLevel[access_level.upper()]
                db.session.commit()
                logger.info(f"✅ House sharing updated: {house.house_name} → {target_user.username} ({access_level})")
                return True
            
            # Create new share
            access = UserHouseAccess(
                user_id=target_user_id,
                house_id=house_id,
                access_level=AccessLevel[access_level.upper()],
                sharedBy_user_id=owner_id
            )
            
            db.session.add(access)
            db.session.commit()
            logger.info(f"✅ House shared: {house.house_name} → {target_user.username} ({access_level})")
            return True
        except Exception as e:
            logger.error(f"Error sharing house: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def unshare_house(house_id, owner_id, target_user_id):
        """Revoke house access from a user"""
        try:
            from models import House
            
            # Verify house owner
            house = House.query.get(house_id)
            if not house or house.user_id != owner_id:
                return False
            
            # Remove access
            UserHouseAccess.query.filter_by(
                user_id=target_user_id,
                house_id=house_id
            ).delete()
            
            db.session.commit()
            logger.info(f"✅ House sharing removed: {house.house_name} from user {target_user_id}")
            return True
        except Exception as e:
            logger.error(f"Error unsharing house: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def get_house_users(house_id):
        """Get all users who have access to a house"""
        try:
            from models import House
            
            house_accesses = UserHouseAccess.query.filter_by(house_id=house_id).all()
            
            users_list = []
            for access in house_accesses:
                user = User.query.get(access.user_id)
                if user:
                    user_data = user.to_dict()
                    user_data['access_level'] = access.access_level.value
                    users_list.append(user_data)
            
            return users_list
        except Exception as e:
            logger.error(f"Error fetching house users: {e}")
            return []
    
    # ====== ACTIVITY MONITORING ======
    
    @staticmethod
    def get_activity_logs(limit=100, user_id=None, action=None):
        """Get activity logs with optional filtering"""
        try:
            query = ActivityLog.query
            
            if user_id:
                query = query.filter_by(user_id=user_id)
            if action:
                query = query.filter_by(action=action)
            
            logs = query.order_by(ActivityLog.created_at.desc()).limit(limit).all()
            return [log.to_dict() for log in logs]
        except Exception as e:
            logger.error(f"Error fetching activity logs: {e}")
            return []
    
    @staticmethod
    def get_user_activity(user_id, days=7):
        """Get activity for a specific user in the last N days"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            logs = ActivityLog.query.filter(
                ActivityLog.user_id == user_id,
                ActivityLog.created_at >= cutoff_date
            ).order_by(ActivityLog.created_at.desc()).all()
            
            return [log.to_dict() for log in logs]
        except Exception as e:
            logger.error(f"Error fetching user activity: {e}")
            return []
    
    # ====== STATISTICS ======
    
    @staticmethod
    def get_system_stats():
        """Get system statistics"""
        try:
            total_users = User.query.count()
            active_users = User.query.filter_by(status=UserStatus.ACTIVE).count()
            admin_users = User.query.filter_by(role=UserRole.ADMIN).count()
            
            from models import House, Device, Sensor
            total_houses = House.query.count()
            total_devices = Device.query.count()
            total_sensors = Sensor.query.count()
            
            # Activity in last 24 hours
            yesterday = datetime.utcnow() - timedelta(hours=24)
            today_activities = ActivityLog.query.filter(
                ActivityLog.created_at >= yesterday
            ).count()
            
            return {
                'total_users': total_users,
                'active_users': active_users,
                'admin_users': admin_users,
                'total_houses': total_houses,
                'total_devices': total_devices,
                'total_sensors': total_sensors,
                'today_activities': today_activities
            }
        except Exception as e:
            logger.error(f"Error calculating stats: {e}")
            return {}
