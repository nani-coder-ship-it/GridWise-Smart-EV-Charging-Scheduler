try:
    from backend.engine.scheduler import Scheduler
    print("Scheduler imported successfully.")
except Exception as e:
    print(f"Failed to import Scheduler: {e}")
