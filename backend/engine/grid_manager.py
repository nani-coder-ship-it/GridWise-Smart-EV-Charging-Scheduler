from datetime import datetime

class GridLoadManager:
    def __init__(self, transformer_capacity_kw=100.0):
        self.transformer_capacity_kw = transformer_capacity_kw

    def get_base_load(self, timestamp: datetime) -> float:
        """
        Simulate base load curve (residential pattern).
        Peak around 18:00 - 21:00.
        Low around 02:00 - 05:00.
        """
        hour = timestamp.hour
        if 18 <= hour <= 22:
            return 60.0  # High base load
        elif 7 <= hour < 18:
            return 40.0  # Moderate
        else:
            return 20.0  # Low

    def calculate_stress_level(self, total_load_kw: float) -> str:
        """
        Returns 'Stable', 'Moderate', or 'Critical'
        """
        utilization = (total_load_kw / self.transformer_capacity_kw) * 100
        if utilization >= 85:
            return 'Critical'
        elif utilization >= 70:
            return 'Moderate'
        else:
            return 'Stable'
