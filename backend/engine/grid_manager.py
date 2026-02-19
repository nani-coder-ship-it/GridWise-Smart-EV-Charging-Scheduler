from datetime import datetime

class GridLoadManager:
    def __init__(self, transformer_capacity_kw=100.0):
        self.transformer_capacity_kw = transformer_capacity_kw

    # Safety Thresholds (Percentage of Transformer Capacity)
    EMERGENCY_THRESHOLD = 110.0  # >110%
    THROTTLE_THRESHOLD = 90.0    # 90-110%
    RESCHEDULE_THRESHOLD = 70.0   # 70-90%

    def get_base_load(self, timestamp: datetime) -> float:
        """
        Simulate base building load (residential/commercial).
        Peak hours: 18:00 - 22:00.
        """
        hour = timestamp.hour
        # Simple simulation curve
        if 18 <= hour < 22:
            return 60.0 # High base load during peak
        elif 7 <= hour < 18:
            return 30.0 # Moderate day load
        else:
            return 15.0 # Low night load

    def calculate_stress_level(self, total_load_kw: float) -> str:
        utilization = (total_load_kw / self.transformer_capacity_kw) * 100
        
        if utilization > self.EMERGENCY_THRESHOLD:
            return 'Critical'
        elif utilization > self.THROTTLE_THRESHOLD:
            return 'High Load'
        elif utilization > self.RESCHEDULE_THRESHOLD:
            return 'Moderate'
        return 'Stable'

    def check_protection_rules(self, total_load_kw: float) -> str:
        utilization = (total_load_kw / self.transformer_capacity_kw) * 100
        
        if utilization > self.EMERGENCY_THRESHOLD:
            return 'RESTRICT'
        elif utilization > self.THROTTLE_THRESHOLD:
            return 'THROTTLE'
        elif utilization > self.RESCHEDULE_THRESHOLD:
            return 'RESCHEDULE'
        return 'SAFE'

    def check_emergency_mode(self, total_load_kw: float) -> bool:
        return (total_load_kw / self.transformer_capacity_kw) * 100 > self.EMERGENCY_THRESHOLD

    def predict_peak_load(self, current_time: datetime) -> dict:
        """
        Predict peak load time and value for the next 24 hours.
        Simple heuristic: Peak is usually around 19:00 - 20:00.
        """
        # Mock prediction logic
        predicted_peak_time = current_time.replace(hour=19, minute=0, second=0, microsecond=0)
        if predicted_peak_time < current_time:
            predicted_peak_time += timedelta(days=1)
            

        # Dynamic Recommendation Logic
        base_load = self.get_base_load(current_time)
        predicted_load = base_load + 30.0 # Estimated EV load

        # Align with new thresholds
        if predicted_load > 95:
             rec = "🚨 Critical Load — Load balancing activated. Emergency charging only."
        elif predicted_load > 85:
             rec = "⚠️ High Load Detected! Shift flexible loads to off-peak hours."
        elif predicted_load > 70:
             rec = "Moderate Load. Prioritize renewable energy sources."
        else:
             rec = "✅ Grid Stable. Optimal time for EV charging."

        return {
            "peak_time": predicted_peak_time.strftime("%H:%M"),
            "predicted_load": predicted_load,
            "recommendation": rec
        }
