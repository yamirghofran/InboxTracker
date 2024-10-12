import os
import mysql.connector
from dotenv import load_dotenv

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
    Who invokes this function?
    """
    conn = get_db_connection() 
    cursor = conn.cursor(dictionary=True)
    try:
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        if query.strip().upper().startswith("SELECT"):
            result = cursor.fetchall()
        else:
            conn.commit()
            result = cursor.lastrowid if cursor.lastrowid else None

        return result
    finally:
        cursor.close()
        conn.close()