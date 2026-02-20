from datetime import datetime, timedelta
from database.db import db
from database.models import ChargingAllocation, SystemLog
from engine.grid_manager import GridLoadManager
from engine.cost_optimizer import CostOptimizer
from engine.fairness import FairnessEngine
from engine.insights import InsightsGenerator

class Scheduler:
    def __init__(self):
        self.grid_manager = GridLoadManager()
        self.fairness_engine = FairnessEngine()
        
        # Logging State Tracking
        self.last_protection_state = 'SAFE'
        self.last_log_time = datetime.min

    def log_system_action(self, level, message, action_type=None):
        try:
            log = SystemLog(level=level, message=message, action_type=action_type)
            db.session.add(log)
            db.session.commit()
            print(f"[SYSTEM LOG] {level}: {message}")
        except Exception as e:
            print(f"Failed to log system action: {e}")

    def balance_grid(self, current_load_kw):
        """
        Active Grid Protection Logic.
        Checks current load against thresholds and takes corrective action on ACTIVE sessions.
        """
        action_needed = self.grid_manager.check_protection_rules(current_load_kw)
        now = datetime.utcnow()
        
        # Get active sessions
        active_allocations = ChargingAllocation.query.filter(
            ChargingAllocation.allocated_start_time <= now,
            ChargingAllocation.allocated_end_time >= now,
            ChargingAllocation.status == 'Scheduled'
        ).all()

    def balance_grid(self, current_load_kw):
        action_needed = self.grid_manager.check_protection_rules(current_load_kw)
        now = datetime.utcnow()
        
        # State Machine & Logging Logic
        current_state = action_needed
        state_changed = current_state != self.last_protection_state
        time_since_last_log = (now - self.last_log_time).total_seconds()
        
        should_log = state_changed or (time_since_last_log > 180 and current_state != 'SAFE') # Log change or every 3 mins if not safe
        
        if should_log:
            if state_changed:
                # TRANSITION LOGS
                if current_state == 'SAFE':
                    self.log_system_action('RESOLVED', "🟢 RESOLVED: Load returned to safe range. System operation restored.", 'RESOLVED')
                
                elif current_state == 'RESCHEDULE':
                    self.log_system_action('WARNING', "🟡 WARNING: Load approaching critical level. Flexible sessions delayed.", 'WARNING')
                    
                elif current_state == 'THROTTLE':
                    self.log_system_action('WARNING', f"🔴 CRITICAL: Transformer load exceeded safe limit ({current_load_kw}kW). AC charging throttled.", 'CRITICAL')
                    
                elif current_state == 'RESTRICT':
                    self.log_system_action('ERROR', f"🔴 CRITICAL: Emergency load detected ({current_load_kw}kW). DC fast charging restricted.", 'CRITICAL')

            else:
                # PERSISTENCE LOGS (Cooldown passed)
                duration_mins = int((now - self.last_log_time).total_seconds() / 60) + 3 # Add previous buffer roughly
                if current_state == 'RESTRICT':
                    self.log_system_action('ERROR', f"🔴 CRITICAL LOAD persisted for >3 minutes. Restrictions remain active.", 'CRITICAL')
                elif current_state == 'THROTTLE':
                    self.log_system_action('WARNING', f"🔴 CRITICAL LOAD persisted. Throttling remains active.", 'CRITICAL')

            self.last_protection_state = current_state
            self.last_log_time = now

        # --- EXECUTE ACTIONS (Idempotent) ---
        
        active_allocations = ChargingAllocation.query.filter(
            ChargingAllocation.allocated_start_time <= now,
            ChargingAllocation.allocated_end_time > now,
            ChargingAllocation.status == 'Scheduled'
        ).all()

        if action_needed == 'THROTTLE':
             active_found = False
             count_throttled = 0
             for alloc in active_allocations:
                 if alloc.charger_type == 'AC' and alloc.charger_power_kw > 3.6: 
                     active_found = True
                     count_throttled += 1
                     old_power = alloc.charger_power_kw
                     new_power = old_power * 0.5
                     alloc.charger_power_kw = new_power
                     
                     remaining_duration = (alloc.allocated_end_time - now).total_seconds() / 3600
                     if remaining_duration > 0:
                         added_time_hours = remaining_duration 
                         alloc.allocated_end_time += timedelta(hours=added_time_hours)
             
             if state_changed and count_throttled > 0:
                 # Optional: Log detail only on transition
                 pass # The main log covers it "AC charging throttled"
             
             db.session.commit()

        elif action_needed == 'RESCHEDULE':
            count_rescheduled = 0
            for alloc in active_allocations:
                if alloc.request.priority_level == 'flexible':
                     count_rescheduled += 1
                     shift_mins = 30
                     alloc.allocated_start_time += timedelta(minutes=shift_mins)
                     alloc.allocated_end_time += timedelta(minutes=shift_mins)
            
            db.session.commit()
            
    def schedule_request(self, request, preferred_start=None):
        """
        Main scheduling logic.
        """
        # 1. Calculate Needs
        charger_type = request.charger_type or 'AC'
        power_kw = 50.0 if charger_type == 'DC' else 7.2
        
        required_kwh = (request.target_battery_percent - request.current_battery_percent) / 100.0 * request.battery_capacity_kwh
        duration_hours = required_kwh / power_kw
        
        # 2. Constraints & Priority
        from datetime import timezone
        current_time = datetime.now(timezone.utc)
        # For simulation, let's assume 'now' is the request time
        # In real app, we might schedule for future.
        
        # 3. Optimization
        is_emergency = request.priority_level == 'emergency'
        
        # Check Grid Stress
        # Calculate current load (Base + Active EVs) - simplified for scheduler context
        # In a real app, this would query DB. Here we estimate or check strictly if needed.
        # Let's rely on GridManager's base load + a safety margin for now, or just trust the optimizer unless it defines specific emergency.
        
        # New Feature: Emergency Mode Check
        # We need to know active EVs to be accurate. 
        # For this scope, let's assume we fetch it or pass it. 
        # To keep it self-contained without circular DB dependency risks here, we'll use a heuristic:
        # If base load is high (>90% capacity), we are in trouble.
        current_base_load = self.grid_manager.get_base_load(current_time)
        # Assume some EVs are always there in peak
        estimated_load = current_base_load + 20.0 # buffer
        
        in_emergency = self.grid_manager.check_emergency_mode(estimated_load)
        
        if preferred_start:
            # User selected a suggested slot — use it directly
            try:
                ps = datetime.fromisoformat(str(preferred_start).replace('Z', '+00:00'))
                start_time = ps.replace(tzinfo=None)  # normalize to UTC-naive
            except Exception:
                start_time = current_time
            peak_optimized = True
        elif is_emergency:
            # Schedule immediately
            start_time = current_time
            peak_optimized = False
        elif in_emergency and request.priority_level == 'flexible':
            # Force delay to off-peak/safe time (e.g. after 22:00 or next solar window)
            # Find next safe slot (e.g. tomorrow 10:00 or tonight 23:00)
            # Simple: Delay by 4 hours
            start_time = current_time + timedelta(hours=4)
            peak_optimized = True
        else:
            # Smart Optimization
            if charger_type == 'DC':
                 start_time = current_time
                 peak_optimized = False
            else:
                 start_time = CostOptimizer.find_optimal_start_time(required_kwh, duration_hours, request.departure_time, current_time)
                 time_diff = (start_time - current_time).total_seconds() / 60
                 peak_optimized = time_diff > 15
        # Calculate Cost & Carbon
        # Fix: passing (kwh, start_time, duration, priority)
        cost = CostOptimizer.calculate_cost(required_kwh, start_time, duration_hours, request.priority_level)
        
        # Calculate savings (Mock logic for now since optimizer doesn't return it)
        # Assuming optimized cost vs peak cost
        max_cost = required_kwh * CostOptimizer.PEAK_RATE
        total_savings = max(0, max_cost - cost)
        
        # Carbon savings logic 
        carbon_factor = 0.4 # kg CO2 per kWh saved (approx diff between coal and solar/wind)
        carbon_savings = (required_kwh * carbon_factor) if peak_optimized else 0.0
        
        allocation = ChargingAllocation(
            request_id=request.id,
            allocated_start_time=start_time,
            allocated_end_time=start_time + timedelta(hours=duration_hours),
            charger_power_kw=power_kw,
            estimated_cost=round(cost, 2),
            cost_without_optimization=round(cost + total_savings, 2),
            peak_optimized=peak_optimized,
            status='Scheduled',
            charger_type=charger_type,
            carbon_savings_kg=round(carbon_savings, 2) 
        )
        
        return allocation
