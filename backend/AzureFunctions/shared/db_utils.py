import os
import mysql.connector
from dotenv import load_dotenv
import bcrypt

load_dotenv()

def get_db_connection(): 
    """
    Connects the application to the database.
    Uses environmental variables for the database credentials (from host.json).
    """
    return mysql.connector.connect(
        host=os.environ['DB_HOST'], # How do host.json got to be einvormental variables?
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        database=os.environ['DB_NAME']
    )

def execute_query(query, params=None):
    """
    Executes a SQL query with optional parameters.
    Returns the result of the query.
    """
    conn = get_db_connection() 
    cursor = conn.cursor(dictionary=True) # Returns result of query as a dictionary (attribute:value)
    try:
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        if query.strip().upper().startswith("SELECT"):
            result = cursor.fetchall() 
        else:
            conn.commit()
            # For INSERT queries, return both rowcount and lastrowid
            result = {
                'rowcount': cursor.rowcount,
                'lastrowid': cursor.lastrowid
            }

        return result
    finally:
        cursor.close()
        conn.close()

async def validateCredentials(email, password):
    if not email or not password:
        return None

    query = "SELECT id, passwordHash FROM Users WHERE email = %s"
    result = execute_query(query, (email,))

    if not result:
        return None

    user = result[0]
    if bcrypt.checkpw(password.encode('utf-8'), user['passwordHash'].encode('utf-8')):
        return user['id']
    else:
        return None

async def createUser(email, password, firstName, lastName):
    if not email or not password or not firstName or not lastName:
        return None

    # Check if user already exists
    check_query = "SELECT id FROM Users WHERE email = %s"
    check_result = execute_query(check_query, (email,))
    if check_result:
        return None  # User already exists

    # Hash the password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    # Insert new user
    insert_query = "INSERT INTO Users (email, passwordHash, firstName, lastName) VALUES (%s, %s, %s, %s)"
    result = execute_query(insert_query, (email, hashed_password.decode('utf-8'), firstName, lastName))

    return result['lastrowid']  # Return the new user's ID
