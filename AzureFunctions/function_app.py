import azure.functions as func
import datetime
import json
import logging
from shared.db_utils import execute_query
from azure.storage.blob import BlobServiceClient, ContentSettings
import os
import bcrypt
from azure.core.exceptions import ResourceExistsError
import uuid
app = func.FunctionApp()

@app.function_name(name="DeleteExpense")
@app.route(route="DeleteExpense")
def DeleteExpense(req: func.HttpRequest) -> func.HttpResponse:
    try:
        expenseId = req.params.get('expenseId')
        userId = req.params.get('userId')

        if not expenseId or not userId:
            return func.HttpResponse("id and UserID are required", status_code=400)

        query = "DELETE FROM Expenses WHERE id = %s AND UserID = %s"
        result = execute_query(query, (expenseId, userId))

        if result.rowcount == 0:
            return func.HttpResponse("Expense not found or user not authorized", status_code=404)

        return func.HttpResponse("Expense deleted successfully")

    except Exception as e:
        return func.HttpResponse(f"An error occurred: {str(e)}", status_code=500)

@app.function_name(name="GetCategories")
@app.route(route="GetCategories")
def GetCategories(req: func.HttpRequest) -> func.HttpResponse:
    try:
        query = "SELECT * FROM Categories"
        result = execute_query(query)

        return func.HttpResponse(json.dumps(result), mimetype="application/json")

    except Exception as e:
        return func.HttpResponse(f"An error occurred: {str(e)}", status_code=500)

@app.function_name(name="CreateExpense")
@app.route(route="CreateExpense", methods=["POST"])
def CreateExpense(req: func.HttpRequest) -> func.HttpResponse:
    try:
        # Get the multipart form data
        form = req.form

        # Parse the expense data
        expense_data = json.loads(form['expense'])
        userId = expense_data.get('userId')
        categoryId = expense_data.get('categoryId')
        amount = expense_data.get('amount')
        description = expense_data.get('description')
        notes = expense_data.get('notes')
        expenseDate = expense_data.get('expenseDate')

        if not all([userId, amount, expenseDate]):
            return func.HttpResponse("UserID, Amount, and ExpenseDate are required", status_code=400)

        receipt_url = None
        if 'receipt' in req.files:
            receipt_file = req.files['receipt']
            
            # Determine the content type based on the file extension
            file_extension = os.path.splitext(receipt_file.filename)[1].lower()
            content_type = 'application/octet-stream'  # Default content type

            if file_extension in ['.jpg', '.jpeg']:
                content_type = 'image/jpeg'
            elif file_extension == '.png':
                content_type = 'image/png'
            elif file_extension == '.pdf':
                content_type = 'application/pdf'

            # Upload the file to blob storage
            connect_str = os.environ['AZURE_STORAGE_CONNECTION_STRING']
            blob_service_client = BlobServiceClient.from_connection_string(connect_str)
            container_name = "receipts"
            blob_name = f"{uuid.uuid4()}{file_extension}"
            blob_client = blob_service_client.get_blob_client(container=container_name, blob=blob_name)
            
            try:
                blob_client.upload_blob(
                    receipt_file.read(),
                    content_settings=ContentSettings(content_type=content_type)
                )
                receipt_url = blob_client.url
            except ResourceExistsError:
                return func.HttpResponse("A blob with this name already exists", status_code=400)

        query = """
        INSERT INTO Expenses (userId, categoryId, amount, description, notes, receiptURL, expenseDate)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        params = (userId, categoryId, amount, description, notes, receipt_url, expenseDate)
        new_expense_id = execute_query(query, params)

        if new_expense_id is None:
            return func.HttpResponse("Failed to retrieve the new expense ID", status_code=500)

        new_expense = {
            "id": new_expense_id,
            "userId": userId,
            "categoryId": categoryId,
            "amount": amount,
            "description": description,
            "notes": notes,
            "receiptURL": receipt_url,
            "expenseDate": expenseDate
        }

        return func.HttpResponse(json.dumps(new_expense), status_code=201, mimetype="application/json")

    except Exception as e:
        return func.HttpResponse(f"An error occurred: {str(e)}", status_code=500)


@app.function_name(name="AuthenticateUser")
@app.route(route="AuthenticateUser", methods=["POST"])
def AuthenticateUser(req: func.HttpRequest) -> func.HttpResponse:
    try:
        req_body = req.get_json()
        username = req_body.get('username')
        password = req_body.get('password')

        if not username or not password:
            return func.HttpResponse("Username and password are required", status_code=400)

        query = "SELECT id, username, passwordHash FROM Users WHERE username = %s"
        result = execute_query(query, (username,))

        if not result:
            return func.HttpResponse("Invalid username or password", status_code=401)

        user = result[0]
        if bcrypt.checkpw(password.encode('utf-8'), user['passwordHash'].encode('utf-8')):
            return func.HttpResponse(json.dumps({"id": user['id'], "username": user['username']}), mimetype="application/json")
        else:
            return func.HttpResponse("Invalid username or password", status_code=401)

    except Exception as e:
        return func.HttpResponse(f"An error occurred: {str(e)}", status_code=500)

@app.function_name(name="UpdateExpense")
@app.route(route="UpdateExpense", methods=["PUT"])
def UpdateExpense(req: func.HttpRequest) -> func.HttpResponse:
    try:
        req_body = req.get_json()
        expenseId = req_body.get('expenseId')
        userId = req_body.get('userId')
        categoryId = req_body.get('categoryId')
        amount = req_body.get('amount')
        description = req_body.get('description')
        notes = req_body.get('notes')
        receiptURL = req_body.get('receiptURL')
        expenseDate = req_body.get('expenseDate')

        if not all([expenseId, userId]):
            return func.HttpResponse("ExpenseID and UserID are required", status_code=400)

        query = """
        UPDATE Expenses
        SET categoryId = %s, amount = %s, description = %s, notes = %s, receiptURL = %s, expenseDate = %s
        WHERE id = %s AND userId = %s
        """
        params = (categoryId, amount, description, notes, receiptURL, expenseDate, expenseId, userId)
        result = execute_query(query, params)

        if result.rowcount == 0:
            return func.HttpResponse("Expense not found or user not authorized", status_code=404)

        return func.HttpResponse("Expense updated successfully")

    except Exception as e:
        return func.HttpResponse(f"An error occurred: {str(e)}", status_code=500)

@app.function_name(name="GetExpenses")
@app.route(route="GetExpenses")
def GetExpenses(req: func.HttpRequest) -> func.HttpResponse:
    try:
        userId = req.params.get('userId')
        if not userId:
            return func.HttpResponse("UserID is required", status_code=400)

        query = """
        SELECT e.*, c.name
        FROM Expenses e
        LEFT JOIN Categories c ON e.categoryId = c.id
        WHERE e.userId = %s
        ORDER BY e.expenseDate DESC
        """
        result = execute_query(query, (userId,))

        return func.HttpResponse(json.dumps(result, default=str), mimetype="application/json")

    except Exception as e:
        return func.HttpResponse(f"An error occurred: {str(e)}", status_code=500)