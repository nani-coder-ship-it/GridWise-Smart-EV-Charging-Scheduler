from datetime import datetime, timedelta
from database.models import ChargingAllocation
from engine.grid_manager import GridLoadManager
from engine.cost_optimizer import CostOptimizer
from engine.fairness import FairnessEngine
from engine.insights import InsightsGenerator

class Scheduler:
    def __init__(self):
        self.grid_manager = GridLoadManager()
        self.fairness_engine = FairnessEngine()

    def schedule_request(self, request):
        """
        Main scheduling logic.
        """
        # 1. Calculate Needs
        required_kwh = (request.target_battery_percent - request.current_battery_percent) / 100.0 * request.battery_capacity_kwh
        # Assume standard charger power if not specified (e.g., 7.2 kW Level 2)
        charger_power = 7.2 
        duration_hours = required_kwh / charger_power
        
        # 2. Constraints & Priority
        current_time = datetime.utcnow()
        # For simulation, let's assume 'now' is the request time
        # In real app, we might schedule for future.
        
        # 3. Optimization
        is_emergency = request.priority_level == 'emergency'
        
        if is_emergency:
            # Schedule immediately
            start_time = current_time
            peak_optimized = False
        else:
            # Find optimal slot
            departure_hour = request.departure_time.hour
            current_hour = current_time.hour
            
            # Simple heuristic optimization
            best_start_hour = CostOptimizer.find_optimal_start_time(required_kwh, duration_hours, departure_hour, current_hour)
            
            # Create a datetime from the hour (handling next day if needed)
            if best_start_hour < current_hour:
                 # Assumes next day if optimal hour is 'earlier' than now (simplified)
                 # In reality, find_optimal_start_time handles ranges logic.
                 # Let's simplify: just add the difference in hours
                 hours_to_add = (24 - current_hour) + best_start_hour
                 start_time = current_time + timedelta(hours=hours_to_add)
            else:
                 start_time = current_time + timedelta(hours=best_start_hour - current_hour)
            
            peak_optimized = (start_time.hour != current_time.hour) # If moved, it's optimized

        end_time = start_time + timedelta(hours=duration_hours)
        
        # 4. Cost Calculation
        allocated_cost = CostOptimizer.calculate_cost(required_kwh, start_time.hour, duration_hours)
        raw_cost = CostOptimizer.calculate_cost(required_kwh, current_time.hour, duration_hours)
        
        # 5. Allocation Object
        allocation = ChargingAllocation(
            request_id=request.id,
            allocated_start_time=start_time,
            allocated_end_time=end_time,
            charger_power_kw=charger_power,
            estimated_cost=round(allocated_cost, 2),
            cost_without_optimization=round(raw_cost, 2),
            peak_optimized=peak_optimized,
            carbon_savings_kg=round((raw_cost - allocated_cost) * 0.5, 2) # Mock carbon calc based on cost savings
        )
        
        return allocation
