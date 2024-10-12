import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """ Sets up connection to the database """
    return mysql.connector.connect(
        host=os.environ['DB_HOST'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PASSWORD'],
        database=os.environ['DB_NAME']
    )

def execute_query(query, params=None) -> dict | int | None:
    """ Executes a query and returns the result 
    Returns:
        - dictionary if query = SELECT
        - id of last row if query = INSERT/UPDATE/DELETE
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True) # Returns result of query as a dictionary (attribute:value)
    try:
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        if query.strip().upper().startswith("SELECT"):
            result = cursor.fetchall() # Returning dict
        else:
            conn.commit()
            result = cursor.lastrowid if cursor.lastrowid else None 

        return result
    finally:
        cursor.close()
        conn.close()