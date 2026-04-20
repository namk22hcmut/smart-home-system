"""
Notification Service - Handle sending notifications to users
"""

from models import db, Notification, Device
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    """Service for creating and managing notifications"""
    
    @staticmethod
    def create_notification(user_id, title, message, notification_type, device_id=None):
        """
        Create and save a notification
        
        Args:
            user_id: ID of user receiving notification
            title: Notification title
            message: Notification message
            notification_type: Type of notification (device_change, threshold_alert, automation_trigger)
            device_id: Optional device ID related to notification
            
        Returns:
            Notification object
        """
        try:
            notification = Notification(
                user_id=user_id,
                title=title,
                message=message,
                notification_type=notification_type,
                device_id=device_id
            )
            db.session.add(notification)
            db.session.commit()
            logger.info(f"✅ Notification created for user {user_id}: {title}")
            return notification
        except Exception as e:
            logger.error(f"❌ Error creating notification: {e}")
            db.session.rollback()
            return None
    
    @staticmethod
    def get_user_notifications(user_id, unread_only=False):
        """
        Get all notifications for a user
        
        Args:
            user_id: User ID
            unread_only: If True, return only unread notifications
            
        Returns:
            List of notification dictionaries
        """
        try:
            query = Notification.query.filter_by(user_id=user_id)
            if unread_only:
                query = query.filter_by(is_read=False)
            
            notifications = query.order_by(Notification.created_at.desc()).all()
            return [n.to_dict() for n in notifications]
        except Exception as e:
            logger.error(f"❌ Error fetching notifications: {e}")
            return []
    
    @staticmethod
    def mark_as_read(notification_id):
        """Mark notification as read"""
        try:
            notification = Notification.query.get(notification_id)
            if notification:
                notification.is_read = True
                notification.read_at = datetime.utcnow()
                db.session.commit()
                logger.info(f"✅ Notification {notification_id} marked as read")
                return True
            return False
        except Exception as e:
            logger.error(f"❌ Error marking notification as read: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def delete_notification(notification_id):
        """Delete a notification"""
        try:
            notification = Notification.query.get(notification_id)
            if notification:
                db.session.delete(notification)
                db.session.commit()
                logger.info(f"✅ Notification {notification_id} deleted")
                return True
            return False
        except Exception as e:
            logger.error(f"❌ Error deleting notification: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def notify_device_change(user_id, device_id, device_name, action):
        """
        Create notification when device status changes
        
        Args:
            user_id: User ID
            device_id: Device ID
            device_name: Device name
            action: Action (turned_on, turned_off, level_changed)
        """
        actions = {
            'turned_on': f"🔌 {device_name} turned ON",
            'turned_off': f"⚫ {device_name} turned OFF",
            'level_changed': f"⚡ {device_name} level changed"
        }
        
        title = actions.get(action, "Device updated")
        message = f"{device_name} status has been changed"
        
        return NotificationService.create_notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type='device_change',
            device_id=device_id
        )
    
    @staticmethod
    def notify_threshold_alert(user_id, sensor_name, reading, threshold):
        """Create notification when threshold is exceeded"""
        title = f"⚠️ {sensor_name} Alert"
        message = f"{sensor_name} reading ({reading}) exceeded threshold ({threshold})"
        
        return NotificationService.create_notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type='threshold_alert',
            device_id=None
        )
    
    @staticmethod
    def notify_automation_trigger(user_id, automation_name, action):
        """Create notification when automation rule is triggered"""
        title = f"🔄 Automation Triggered"
        message = f"Automation '{automation_name}' executed: {action}"
        
        return NotificationService.create_notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type='automation_trigger',
            device_id=None
        )
