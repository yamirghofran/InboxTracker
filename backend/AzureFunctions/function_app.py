import os
import bcrypt
import datetime
import json
import logging
import uuid
import azure.functions as func
from azure.storage.blob import BlobServiceClient, ContentSettings
from azure.core.exceptions import ResourceExistsError
from shared.db_utils import execute_query, validateCredentials, createUser
from azure.storage.queue import QueueClient



app = func.FunctionApp()

@app.function_name(name="CreateExpense")
@app.route(route="CreateExpense", methods=["POST"])
def CreateExpense(req: func.HttpRequest) -> func.HttpResponse:
    """
    Creates a new expense and connects to blob storage to upload the receipt
    """
    try:
        # Get the multipart form data
        form = req.form

        # Parse the expense data
        expense_data = json.loads(form['expense'])
        userId = expense_data.get('userId')
        categoryId = expense_data.get('categoryId')
        companyName = expense_data.get('companyName')
        amount = expense_data.get('amount')
        description = expense_data.get('description')
        notes = expense_data.get('notes')
        expenseDate = expense_data.get('expenseDate')

        if not all([userId, amount, expenseDate]):
            return func.HttpResponse("UserID, Amount, and ExpenseDate are required", status_code=400)
        
        # Initialize receipt_url before using it
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
            blob_name = f"{userId}_{expenseDate}_{uuid.uuid4()}{file_extension}"
            blob_client = blob_service_client.get_blob_client(container=container_name, blob=blob_name)
            
            try:
                blob_client.upload_blob(
                    receipt_file.read(),
                    content_settings=ContentSettings(content_type=content_type)
                )
                receipt_url = blob_client.url

            except ResourceExistsError:
                return func.HttpResponse("A blob with this name already exists", status_code=400)

        # Insert the expense into the database with or without the receipt URL
        query = """
        INSERT INTO Expenses (userId, categoryId, companyName, amount, description, notes, receiptURL, expenseDate)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (userId, categoryId, companyName, amount, description, notes, receipt_url, expenseDate)
        result = execute_query(query, params)
        new_expense_id = result['lastrowid']

        if new_expense_id is None:
            return func.HttpResponse("Failed to retrieve the new expense ID", status_code=500)

        new_expense = {
            "id": new_expense_id,
            "userId": userId,
            "categoryId": categoryId,
            "companyName": companyName,
            "amount": amount,
            "description": description,
            "notes": notes,
            "receiptURL": receipt_url,
            "expenseDate": expenseDate
        }

        return func.HttpResponse(json.dumps(new_expense), status_code=201, mimetype="application/json")

    except Exception as e:

        error_message = f"An error occurred in CreateExpense: {str(e)}"
        logging.error(error_message)
        
        # Send to dead-letter-queue
        send_to_dead_letter_queue(error_message, "CreateExpense", req.get_json())

        return func.HttpResponse(f"An error occurred: {str(e)}", status_code=500)

@app.function_name(name="DeleteExpense") # Defines name of the function within the function app
@app.route(route="DeleteExpense", methods=["DELETE"]) # Defines HTTP route for function invokation
def DeleteExpense(req: func.HttpRequest) -> func.HttpResponse:
    """
    Delete a receipt from the database
    """
    try:
        expenseId = req.params.get('expenseId') # Parameters passed via HTTPS
        userId = req.params.get('userId')

        if not expenseId or not userId: # If no parameters are passed through the HTTPS request
            return func.HttpResponse("id and UserID are required", status_code=400)

        query = "DELETE FROM Expenses WHERE id = %s AND UserID = %s"
        result = execute_query(query, (expenseId, userId))

        # Access rowcount as a key in the dictionary
        if result['rowcount'] == 0:
            return func.HttpResponse("Expense not found or user not authorized", status_code=404)

        return func.HttpResponse("Expense deleted successfully")

    except Exception as e:
        error_message = f"An error occurred in DeleteExpense: {str(e)}"
        logging.error(error_message)
        send_to_dead_letter_queue(error_message, "DeleteExpense", req.get_json())
        return func.HttpResponse(f"An error occurred: {str(e)}", status_code=500)
    
@app.function_name(name="UpdateExpense")
@app.route(route="UpdateExpense", methods=["PUT"])
def UpdateExpense(req: func.HttpRequest) -> func.HttpResponse:
    try:
        req_body = req.get_json()
        expenseId = req_body.get('id')
        userId = req_body.get('userId')
        categoryId = req_body.get('categoryId')
        amount = req_body.get('amount')
        description = req_body.get('description')
        companyName = req_body.get('companyName')
        notes = req_body.get('notes')
        receiptURL = req_body.get('receiptURL')
        expenseDate = req_body.get('expenseDate')

        if not all([expenseId, userId]):
            return func.HttpResponse("ExpenseID and UserID are required", status_code=400)

        query = """
        UPDATE Expenses
        SET categoryId = %s, amount = %s, description = %s, notes = %s, companyName = %s, expenseDate = %s
        WHERE id = %s AND userId = %s
        """
        params = (categoryId, amount, description, notes, companyName, expenseDate, expenseId, userId)
        result = execute_query(query, params)

        if result['rowcount'] == 0:
            return func.HttpResponse("Expense not found or user not authorized", status_code=404)

        return func.HttpResponse("Expense updated successfully")

    except Exception as e:
        error_message = f"An error occurred in UpdateExpense: {str(e)}"
        logging.error(error_message)
        send_to_dead_letter_queue(error_message, "UpdateExpense", req.get_json())
        return func.HttpResponse(f"An error occurred: {str(e)}", status_code=500)
    
@app.function_name(name="GetCategories")
@app.route(route="GetCategories", methods=["GET"])
def GetCategories(req: func.HttpRequest) -> func.HttpResponse:
    """
    Get all the the categories in the database
    """
    try:
        query = "SELECT id, name FROM Categories"
        result = execute_query(query)

        # Custom serialization function for datetime objects
        def datetime_serializer(obj):
            if isinstance(obj, datetime.datetime):
                return obj.isoformat()
            raise TypeError("Type not serializable")

        # Returns the result of the query as a JSON response with datetime serialization
        return func.HttpResponse(
            json.dumps(result, default=datetime_serializer),
            mimetype="application/json"
        )

    except Exception as e:
        error_message = f"An error occurred in GetCategories: {str(e)}"
        logging.error(error_message)
        send_to_dead_letter_queue(error_message, "GetCategories", req.get_json())
        return func.HttpResponse(f"An error occurred: {str(e)}", status_code=500)
    

@app.function_name(name="GetExpenses")
@app.route(route="GetExpenses")
def GetExpenses(req: func.HttpRequest) -> func.HttpResponse:
    try:
        userId = req.params.get('userId')
        if not userId:
            return func.HttpResponse("UserID is required", status_code=400)

        query = """
        SELECT e.*, c.name as categoryName
        FROM Expenses e
        LEFT JOIN Categories c ON e.categoryId = c.id
        WHERE e.userId = %s
        ORDER BY e.expenseDate DESC
        """
        result = execute_query(query, (userId,))

        # Ensure categoryName is never null
        for expense in result:
            expense['categoryName'] = expense['categoryName'] or 'Uncategorized'

        return func.HttpResponse(json.dumps(result, default=str), mimetype="application/json")

    except Exception as e:
        error_message = f"An error occurred in GetExpenses: {str(e)}"
        logging.error(error_message)
        send_to_dead_letter_queue(error_message, "GetExpenses", req.get_json())
        return func.HttpResponse(f"An error occurred: {str(e)}", status_code=500)
    

@app.function_name(name="Login")
@app.route(route="Login", methods=["POST"])
async def Login(req: func.HttpRequest) -> func.HttpResponse:
    try:
        req_body = req.get_json()
        email = req_body.get('email')
        password = req_body.get('password')

        if not email or not password:
            return func.HttpResponse("Email and password are required", status_code=400)

        user_id = await validateCredentials(email, password)

        if user_id:
            return func.HttpResponse(json.dumps({"id": user_id, "email": email}), mimetype="application/json")
        else:
            raise Exception("Invalid email or password")

    except Exception as e:
        error_message = f"An error occurred in Login: {str(e)}"
        logging.error(error_message)
        send_to_dead_letter_queue()
        return func.HttpResponse(f"An error occurred: {str(e)}", status_code=500)

@app.function_name(name="Signup")
@app.route(route="Signup", methods=["POST"])
async def Signup(req: func.HttpRequest) -> func.HttpResponse:
    try:
        req_body = req.get_json()
        logging.info(f"Received signup request: {req_body}")
        
        email = req_body.get('email')
        password = req_body.get('password')
        firstName = req_body.get('firstName')
        lastName = req_body.get('lastName')

        if not all([email, password, firstName, lastName]):
            missing_fields = [field for field in ['email', 'password', 'firstName', 'lastName'] if not req_body.get(field)]
            error_message = f"Missing required fields: {', '.join(missing_fields)}"
            logging.warning(error_message)
            return func.HttpResponse(
                json.dumps({"error": error_message}),
                status_code=400,
                mimetype="application/json"
            )

        logging.info(f"Creating user with email: {email}")
        new_user_id = await createUser(email, password, firstName, lastName)

        if new_user_id:
            logging.info(f"User created successfully with ID: {new_user_id}")
            return func.HttpResponse(
                json.dumps({"id": new_user_id, "email": email, "firstName": firstName, "lastName": lastName}),
                status_code=201,
                mimetype="application/json"
            )
        else:
            logging.warning(f"Email already exists or user creation failed: {email}")
            raise Exception("Email already exists or user creation failed")

    except Exception as e:
        error_message = f"An error occurred in Signup: {str(e)}"
        logging.error(error_message)
        send_to_dead_letter_queue(error_message, "Signup", req.get_json())

        return func.HttpResponse(
            json.dumps({"error": f"An error occurred: {str(e)}"}),
            status_code=500,
            mimetype="application/json"
        )
    

@app.function_name(name="ProcessDeadLetterQueue")
@app.queue_trigger(arg_name="msg", queue_name="dead-letter-queue", connection="AzureWebJobsStorage")
def ProcessDeadLetterQueue(msg: func.QueueMessage) -> None:
    try:
        # Log the received message
        logging.info(f"Received message from dead-letter-queue: {msg.get_body().decode('utf-8')}")

        # Parse the message (assuming it's JSON)
        message_body = json.loads(msg.get_body().decode('utf-8'))
        logging.info(f"Parsed message body: {message_body}")

        # Store the message in blob storage
        connect_str = os.environ['AZURE_STORAGE_CONNECTION_STRING']
        blob_service_client = BlobServiceClient.from_connection_string(connect_str)
        container_name = "dead-letter-messages"

        # Use a unique name for the blob
        blob_name = f"dead_letter_{datetime.datetime.now().isoformat()}.json"
        blob_client = blob_service_client.get_blob_client(container=container_name, blob=blob_name)
        
        # Upload the message content
        blob_client.upload_blob(json.dumps(message_body))
        logging.info(f"Stored dead letter message in blob: {blob_name}")

    except Exception as e:
        logging.error(f"Error processing dead letter message: {str(e)}. Please ensure the message is properly formatted and valid.")
        # Don't re-raise the exception, as this would cause the message to be retried


def send_to_dead_letter_queue():
        # Set your connection string and queue name
        connection_string = os.getenv('AZURE_STORAGE_CONNECTION_STRING')  # Replace with your connection string if not using env var
        queue_name = "dead-letter-queue"

        # Create a QueueClient
        queue_client = QueueClient.from_connection_string(connection_string, queue_name)

        # Message to send (can be JSON or plain text)
        message_content = {
            "order_id": "12345",
            "status": "failed",
            "error": "Invalid payment details"
        }

        # Convert the message to JSON format and send it
        message_json = json.dumps(message_content)
        queue_client.send_message(message_json)

        print(f"Message sent to queue {queue_name}: {message_json}")


"""def send_to_dead_letter_queue(error_message, original_function_name, original_payload):
    try:
        # Validate if the original_payload is JSON serializable
        try:
            json.dumps(original_payload)  # This will raise a TypeError if the payload is not serializable
        except (TypeError, ValueError) as json_err:
            logging.error(f"Invalid JSON payload: {str(json_err)}")
            original_payload = {"error": "Invalid payload, unable to serialize."}
        
        connect_str = os.environ['AzureWebJobsStorage']
        queue_name = "dead-letter-queue"
        queue_client = QueueClient.from_connection_string(connect_str, queue_name)

        # Construct the message content
        message_content = {
            "error": str(error_message),
            "function": original_function_name,
            "payload": original_payload,
        }

        message_json = json.dumps(message_content)
        logging.info(f"Sending message to dead-letter-queue: {message_json}")
        queue_client.send_message(message_json)
        logging.info("Message sent successfully")
    except Exception as e:
        logging.error(f"Failed to send message to dead-letter-queue: {str(e)}")"""