from datetime import datetime, timedelta, timezone

current_utc = datetime.now(timezone.utc)
print(f"Current UTC (aware): {current_utc}")

departure_str = (datetime.utcnow() + timedelta(hours=5)).isoformat() + "Z"
print(f"Departure String: {departure_str}")

departure_parsed = datetime.fromisoformat(departure_str.replace('Z', '+00:00'))
print(f"Departure Parsed (aware): {departure_parsed}")

is_valid = departure_parsed > current_utc
print(f"Is Departure Future? {is_valid}")

if departure_parsed <= current_utc:
    print("ERROR: Departure time must be in the future")
else:
    print("SUCCESS: Departure time is valid")
