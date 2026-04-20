"""
Automation Service - Handle automation rule evaluation and execution
"""

from models import db, AutomationRule, RuleCondition, Device, SensorData, Notification
from notification_service import NotificationService
from datetime import datetime
import logging
import operator as op

logger = logging.getLogger(__name__)

# Map string operators to Python operators
OPERATORS = {
    '>': op.gt,
    '<': op.lt,
    '>=': op.ge,
    '<=': op.le,
    '==': op.eq,
    '!=': op.ne,
}

class AutomationService:
    """Service for evaluating and executing automation rules"""
    
    @staticmethod
    def evaluate_condition(sensor_type, current_value, operator_str, threshold_value):
        """
        Evaluate a single condition
        
        Args:
            sensor_type: Type of sensor (temperature, humidity, etc.)
            current_value: Current sensor reading
            operator_str: Operator as string (>, <, >=, <=, ==, !=)
            threshold_value: Threshold to compare against
            
        Returns:
            True if condition is met, False otherwise
        """
        try:
            if current_value is None:
                logger.warning(f"No data for sensor type {sensor_type}")
                return False
            
            if operator_str not in OPERATORS:
                logger.error(f"Invalid operator: {operator_str}")
                return False
            
            op_func = OPERATORS[operator_str]
            result = op_func(float(current_value), float(threshold_value))
            
            logger.debug(f"Condition: {sensor_type}={current_value} {operator_str} {threshold_value} → {result}")
            return result
        except Exception as e:
            logger.error(f"Error evaluating condition: {e}")
            return False
    
    @staticmethod
    def get_latest_sensor_value(sensor_type, room_id):
        """
        Get latest sensor reading for a room and sensor type
        
        Args:
            sensor_type: Type of sensor (temperature, humidity, etc.)
            room_id: Room ID
            
        Returns:
            Latest sensor value or None if no data
        """
        try:
            # Find sensor by type and room
            from models import Sensor
            sensor = Sensor.query.filter_by(room_id=room_id, sensor_type=sensor_type).first()
            
            if not sensor:
                logger.warning(f"No sensor of type {sensor_type} in room {room_id}")
                return None
            
            # Get latest sensor data
            latest_data = SensorData.query.filter_by(sensor_id=sensor.sensor_id)\
                .order_by(SensorData.timestamp.desc())\
                .first()
            
            if not latest_data:
                logger.warning(f"No data for sensor {sensor.sensor_id}")
                return None
            
            return latest_data.value
        except Exception as e:
            logger.error(f"Error getting sensor value: {e}")
            return None
    
    @staticmethod
    def evaluate_rule(rule_id):
        """
        Evaluate a single rule and return if it should be triggered
        
        Args:
            rule_id: Rule ID to evaluate
            
        Returns:
            True if rule conditions are met, False otherwise
        """
        try:
            rule = AutomationRule.query.get(rule_id)
            if not rule or not rule.is_active:
                return False
            
            if not rule.conditions:
                logger.warning(f"Rule {rule_id} has no conditions")
                return False
            
            # Evaluate all conditions
            condition_results = []
            for condition in rule.conditions:
                current_value = AutomationService.get_latest_sensor_value(
                    condition.sensor_type, 
                    rule.room_id
                )
                
                result = AutomationService.evaluate_condition(
                    condition.sensor_type,
                    current_value,
                    condition.operator,
                    condition.threshold_value
                )
                condition_results.append(result)
            
            # Apply logic (AND/OR)
            if rule.logic_type == 'AND':
                rule_met = all(condition_results)
            elif rule.logic_type == 'OR':
                rule_met = any(condition_results)
            else:
                logger.error(f"Unknown logic type: {rule.logic_type}")
                return False
            
            logger.info(f"Rule {rule.rule_name}: conditions={condition_results}, logic={rule.logic_type}, result={rule_met}")
            return rule_met
        except Exception as e:
            logger.error(f"Error evaluating rule {rule_id}: {e}")
            return False
    
    @staticmethod
    def execute_rule_action(rule_id):
        """
        Execute the action of a rule (turn device on/off)
        
        Args:
            rule_id: Rule ID whose action to execute
            
        Returns:
            True if successful, False otherwise
        """
        try:
            rule = AutomationRule.query.get(rule_id)
            if not rule:
                logger.error(f"Rule {rule_id} not found")
                return False
            
            device = Device.query.get(rule.action_device_id)
            if not device:
                logger.error(f"Device {rule.action_device_id} not found")
                return False
            
            # Update device
            device.status = rule.action_status
            if rule.action_status == 'on':
                device.level = rule.action_level
            else:
                device.level = 0
            
            device.updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"✅ Rule {rule.rule_name} executed: {device.device_name} → {rule.action_status} (level: {device.level})")
            
            # Create notification
            if rule.action_status == 'on':
                message = f"Auto-triggered: {device.device_name} turned ON (level {rule.action_level}%)"
            else:
                message = f"Auto-triggered: {device.device_name} turned OFF"
            
            NotificationService.create_notification(
                user_id=device.room.floor.house.user_id,  # Get user through relationships
                title="Automation Rule Triggered",
                message=message,
                notification_type="automation_trigger",
                device_id=device.device_id
            )
            
            return True
        except Exception as e:
            logger.error(f"Error executing rule {rule_id}: {e}")
            db.session.rollback()
            return False
    
    @staticmethod
    def check_all_rules():
        """
        Check all active rules and execute any that are triggered
        Called periodically by scheduler
        
        Returns:
            Number of rules executed
        """
        try:
            rules = AutomationRule.query.filter_by(is_active=True).all()
            executed_count = 0
            
            for rule in rules:
                if AutomationService.evaluate_rule(rule.rule_id):
                    if AutomationService.execute_rule_action(rule.rule_id):
                        executed_count += 1
            
            if executed_count > 0:
                logger.info(f"✅ Checked {len(rules)} rules, executed {executed_count}")
            
            return executed_count
        except Exception as e:
            logger.error(f"Error checking all rules: {e}")
            return 0
    
    @staticmethod
    def create_rule(room_id, rule_name, logic_type, action_device_id, action_status, action_level, conditions):
        """
        Create a new automation rule with conditions
        
        Args:
            room_id: Room ID
            rule_name: Name of the rule
            logic_type: 'AND' or 'OR'
            action_device_id: Device to control
            action_status: 'on' or 'off'
            action_level: Level 0-100 (if action_status='on')
            conditions: List of dicts: [{'sensor_type': 'temperature', 'operator': '>', 'threshold_value': 30}]
            
        Returns:
            New AutomationRule object or None if error
        """
        try:
            # Create rule
            rule = AutomationRule(
                room_id=room_id,
                rule_name=rule_name,
                logic_type=logic_type,
                action_device_id=action_device_id,
                action_status=action_status,
                action_level=action_level if action_status == 'on' else 0
            )
            db.session.add(rule)
            db.session.flush()  # Get rule_id before adding conditions
            
            # Create conditions
            for cond in conditions:
                condition = RuleCondition(
                    rule_id=rule.rule_id,
                    sensor_type=cond['sensor_type'],
                    operator=cond['operator'],
                    threshold_value=cond['threshold_value']
                )
                db.session.add(condition)
            
            db.session.commit()
            logger.info(f"✅ Rule created: {rule_name} with {len(conditions)} conditions")
            return rule
        except Exception as e:
            logger.error(f"Error creating rule: {e}")
            db.session.rollback()
            return None
    
    @staticmethod
    def update_rule(rule_id, rule_name=None, logic_type=None, action_status=None, action_level=None, conditions=None):
        """Update an existing rule"""
        try:
            rule = AutomationRule.query.get(rule_id)
            if not rule:
                return None
            
            if rule_name:
                rule.rule_name = rule_name
            if logic_type:
                rule.logic_type = logic_type
            if action_status:
                rule.action_status = action_status
            if action_level is not None:
                rule.action_level = action_level
            
            # Update conditions if provided
            if conditions is not None:
                # Delete old conditions
                RuleCondition.query.filter_by(rule_id=rule_id).delete()
                
                # Add new conditions
                for cond in conditions:
                    condition = RuleCondition(
                        rule_id=rule_id,
                        sensor_type=cond['sensor_type'],
                        operator=cond['operator'],
                        threshold_value=cond['threshold_value']
                    )
                    db.session.add(condition)
            
            rule.updated_at = datetime.utcnow()
            db.session.commit()
            logger.info(f"✅ Rule {rule_id} updated")
            return rule
        except Exception as e:
            logger.error(f"Error updating rule: {e}")
            db.session.rollback()
            return None
    
    @staticmethod
    def delete_rule(rule_id):
        """Delete a rule"""
        try:
            rule = AutomationRule.query.get(rule_id)
            if not rule:
                return False
            
            db.session.delete(rule)
            db.session.commit()
            logger.info(f"✅ Rule {rule_id} deleted")
            return True
        except Exception as e:
            logger.error(f"Error deleting rule: {e}")
            db.session.rollback()
            return False
