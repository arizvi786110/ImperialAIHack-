
import os
from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

try:
    models = client.models.list(limit=100)

    print("Claude models available to your API key:\n")

    for model in models.data:
        print(f"Model: {model.display_name}")
        print(f"ID: {model.id}")
        print("-" * 40)

except Exception as e:
    print("Error:", e)
