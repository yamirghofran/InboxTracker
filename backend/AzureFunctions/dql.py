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





def send_to_dead_letter_queue(error_message, original_function_name, original_payload):
    """ Helper function for for sending messages to dead letter queue.
    Called by all exception from serverless functions
    """
    try:
        connect_str = os.environ['AzureWebJobsStorage']
        queue_name = "dead-letter-queue"
        queue_client = QueueClient.from_connection_string(connect_str, queue_name)
        
        message_content = {
            "error": str(error_message),
            "function": original_function_name,
            "payload": original_payload,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        
        queue_client.send_message(json.dumps(message_content))
        logging.info(f"Sent message to dead-letter-queue succesfully: {message_content}")
    except Exception as e:
        logging.error(f"Failed to send message to dead-letter-queue: {str(e)}")