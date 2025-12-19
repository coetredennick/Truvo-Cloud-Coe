import httpx
from datetime import datetime, timedelta
from livekit.agents import llm
from config import Config


@llm.ai_callable(
    description="Check available tour times for a specific date. Use this before booking to see what times are open."
)
async def check_availability(
    date: str = llm.TypeInfo(description="The date to check availability for, in YYYY-MM-DD format")
) -> str:
    """Check available tour slots for a given date via Cal.com API."""

    if not Config.CAL_API_KEY:
        # Demo mode - return mock availability
        return f"Available times for {date}: 10:00 AM, 11:30 AM, 2:00 PM, 3:30 PM. Which time works best for you?"

    try:
        async with httpx.AsyncClient() as client:
            # Parse the date
            check_date = datetime.strptime(date, "%Y-%m-%d")
            start_time = check_date.replace(hour=0, minute=0, second=0).isoformat() + "Z"
            end_time = (check_date + timedelta(days=1)).replace(hour=0, minute=0, second=0).isoformat() + "Z"

            response = await client.get(
                f"https://api.cal.com/v1/availability",
                params={
                    "apiKey": Config.CAL_API_KEY,
                    "eventTypeId": Config.CAL_EVENT_TYPE_ID,
                    "startTime": start_time,
                    "endTime": end_time,
                },
                timeout=10.0
            )

            if response.status_code == 200:
                data = response.json()
                slots = data.get("slots", {}).get(date, [])

                if not slots:
                    return f"Sorry, there are no available times on {date}. Would you like to check another date?"

                # Format times nicely
                times = []
                for slot in slots[:6]:  # Limit to 6 options
                    slot_time = datetime.fromisoformat(slot["time"].replace("Z", "+00:00"))
                    times.append(slot_time.strftime("%I:%M %p"))

                times_str = ", ".join(times[:-1]) + f", or {times[-1]}" if len(times) > 1 else times[0]
                return f"Available times on {date}: {times_str}. Which time works for you?"
            else:
                return "I'm having trouble checking availability right now. Could you try again in a moment?"

    except Exception as e:
        return f"I'm having trouble checking availability right now. Could you try again in a moment?"


@llm.ai_callable(
    description="Book a property tour appointment. Use this after confirming the date, time, and getting the visitor's name."
)
async def book_tour(
    date: str = llm.TypeInfo(description="Tour date in YYYY-MM-DD format"),
    time: str = llm.TypeInfo(description="Tour time in HH:MM format (24-hour)"),
    name: str = llm.TypeInfo(description="Full name of the person booking the tour"),
    email: str = llm.TypeInfo(description="Email address for confirmation"),
    phone: str = llm.TypeInfo(description="Phone number for the booking", default="")
) -> str:
    """Book a tour via Cal.com API."""

    if not Config.CAL_API_KEY:
        # Demo mode - return success
        return f"I've booked your tour for {date} at {time}. You'll receive a confirmation email at {email}. We look forward to showing you around!"

    try:
        async with httpx.AsyncClient() as client:
            # Combine date and time
            start_datetime = f"{date}T{time}:00"

            booking_data = {
                "eventTypeId": int(Config.CAL_EVENT_TYPE_ID),
                "start": start_datetime,
                "responses": {
                    "name": name,
                    "email": email,
                    "phone": phone or "",
                    "notes": "Booked via Truvo AI Assistant"
                },
                "timeZone": "America/New_York",  # TODO: Make configurable
                "language": "en",
                "metadata": {
                    "source": "truvo-voice-agent"
                }
            }

            response = await client.post(
                f"https://api.cal.com/v1/bookings",
                params={"apiKey": Config.CAL_API_KEY},
                json=booking_data,
                timeout=15.0
            )

            if response.status_code in [200, 201]:
                return f"Excellent! I've booked your property tour for {date} at {time}. A confirmation email has been sent to {email}. Is there anything else I can help you with?"
            else:
                error = response.json().get("message", "Unknown error")
                return f"I wasn't able to complete the booking. {error}. Would you like to try a different time?"

    except Exception as e:
        return "I'm having trouble completing the booking right now. Would you like me to try again, or would you prefer to call back later?"
