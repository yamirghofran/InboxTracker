import requests
import json

"""
MAKING A GET REQUEST TO THE AZURE FUNCTION:
curl "https://inboxtracker.azurewebsites.net/api/GetExpenses?code=DDcpu5KsbITe9zqwhb5SNVRg7KrcscLFlDee4VzPDy6vAzFuCh_l6w%3D%3D&userId=1"
"""

AZURE_FUNCTION_BASE_URL = 'https://inboxtracker.azurewebsites.net/api'
AZURE_FUNCTION_KEY_CODE = 'code=DDcpu5KsbITe9zqwhb5SNVRg7KrcscLFlDee4VzPDy6vAzFuCh_l6w%3D%3D'

import requests

def addExpense(user_id: int, expense: dict):
    url = f"{AZURE_FUNCTION_BASE_URL}/CreateExpense?{AZURE_FUNCTION_KEY_CODE}&userId={user_id}"
    
    # Create form data
    form_data = {'expense': json.dumps(expense)}
    
    # Debug: Print the request data
    print(f"Sending request to: {url}")
    print(f"Request data: {form_data}")
    
    response = requests.post(url)#, data=form_data)
    
    # Debug: Print the response
    print(f"Status code: {response.status_code}")
    print(f"Response text: {response.text}")
    
    return response.json()

if __name__ == "__main__":
    print(addExpense(2, {
        "expenseDate": "2024-01-01",
        "companyName": "Company Inc",
        "amount": 100, 
        "userId": 2,
        "description": "Dinner at the new restaurant"
    }))