# Save this as 'upload_recitations.py' in your project folder

import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
import datetime
import sys
import math # Needed for checking NaN

# --- Configuration ---
# Assumes serviceAccountKey.json is in the same folder as this script
SERVICE_ACCOUNT_KEY_PATH = "serviceAccountKey.json"
# Assumes your CSV file is named this and in the same folder
DATA_FILE_PATH = "Dashboard - Recitations.csv"
COLLECTION_NAME = "recitations"
# --- End Configuration ---

# --- Initialize Firebase Admin SDK ---
try:
    print(f"Attempting to initialize Firebase Admin SDK using key: {SERVICE_ACCOUNT_KEY_PATH}")
    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
    # Prevent reinitialization error if run multiple times in same kernel/session
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.get_app() # Get default app if already initialized
    db = firestore.client()
    print("Firebase Admin SDK initialized successfully.")
except FileNotFoundError:
    print(f"ERROR: Service account key not found at '{SERVICE_ACCOUNT_KEY_PATH}'")
    print("Please ensure the path is correct and the file exists in the same directory as the script.")
    sys.exit(1) # Exit the script if key is missing
except ValueError as e:
    print(f"ERROR: Invalid service account key file at '{SERVICE_ACCOUNT_KEY_PATH}'. Check file format.")
    print(f"Error details: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")
    sys.exit(1) # Exit on other initialization errors
# --- End Initialization ---

# --- Function to read data (using pandas for CSV) ---
def read_data(file_path):
    """Reads data from CSV, handling potential errors and empty values."""
    print(f"Attempting to read data from: {file_path}")
    try:
        # Read all columns as strings initially to avoid type guessing issues
        df = pd.read_csv(file_path, dtype=str)
        # Replace pandas' NaN representation with empty strings for easier handling
        df = df.fillna('')
        print(f"Successfully read {len(df)} rows from {file_path}")
        return df
    except FileNotFoundError:
        print(f"ERROR: Data file not found at '{file_path}'")
        return None
    except pd.errors.EmptyDataError:
        print(f"ERROR: Data file at '{file_path}' is empty.")
        return None
    except Exception as e:
        print(f"Error reading data file '{file_path}': {e}")
        return None

# --- Function to safely get and clean string from row ---
def get_string(row, column_name, default_value=''):
    """Safely gets value, converts to string, strips whitespace."""
    value = row.get(column_name, default_value)
    # Handle potential non-string types like pandas NaN before converting
    # Also handle actual None type if the column was missing entirely
    if value is None or (isinstance(value, float) and math.isnan(value)):
        value = default_value
    return str(value).strip()

# --- Function to process and upload/update data ---
def upload_or_update_recitations(df):
    """Iterates through DataFrame rows, uploads or updates Firestore documents."""
    if df is None:
        print("No DataFrame provided to upload_or_update_recitations. Exiting.")
        return # Exit if DataFrame is None

    recitations_collection = db.collection(COLLECTION_NAME)
    # Initialize counters
    added_count = 0
    updated_count = 0
    skipped_count = 0

    print(f"\nStarting upload/update to collection '{COLLECTION_NAME}'...")

    # Iterate through each row in the DataFrame
    for index, row in df.iterrows():
        row_number = index + 2 # For user-friendly row number in logs (Excel/CSV is 1-based + header)
        recitation_id_from_csv = "" # Initialize for error logging scope
        try:
            # --- Get required fields (recitationId and text) ---
            recitation_id_from_csv = get_string(row, 'recitationId')
            recitation_text = get_string(row, 'text')

            # Basic validation: Skip row if essential ID or text is missing
            if not recitation_id_from_csv:
                print(f"Skipping row {row_number}: 'recitationId' is missing or empty.")
                skipped_count += 1
                continue # Go to the next row
            if not recitation_text:
                print(f"Skipping row {row_number}: 'text' is empty.")
                skipped_count += 1
                continue # Go to the next row

            # --- Prepare the data dictionary for Firestore ---
            data = {
                'recitationId': recitation_id_from_csv,
                'text': recitation_text,
                # Process potential array fields (split by ';', strip whitespace, filter empty)
                'relatedAxes': [a.strip() for a in get_string(row, 'relatedAxes').split(';') if a.strip()],
                'relatedMonthIds': [m.strip() for m in get_string(row, 'relatedMonthIds').split(';') if m.strip()],
                'tags': [t.strip() for t in get_string(row, 'tags').split(';') if t.strip()],
                # Process single string fields
                'activeContext': get_string(row, 'activeContext') or None, # Store None if blank
                'source': get_string(row, 'source'),
                'author': get_string(row, 'author') or 'Unknown', # Default to 'Unknown' if blank
                # Process boolean field
                'isArchived': get_string(row, 'isArchived', 'FALSE').upper() in ('TRUE', '1'), # Default False if missing/invalid
                'updatedAt': firestore.SERVER_TIMESTAMP # Always update this timestamp
            }

            # Clean up empty optional fields/arrays to avoid storing empty values
            if not data['relatedAxes']: del data['relatedAxes']
            if not data['relatedMonthIds']: del data['relatedMonthIds']
            if not data['tags']: del data['tags']
            if not data['source']: del data['source']
            if data['author'] == 'Unknown': del data['author'] # Only store if explicitly provided
            if data['activeContext'] is None: del data['activeContext'] # Don't store field if context is None

            # --- Check if document exists based on recitationId ---
            # print(f"Processing row {row_number}: recId '{recitation_id_from_csv}'. Checking Firestore...") # Verbose log
            query = recitations_collection.where("recitationId", "==", recitation_id_from_csv).limit(1)
            existing_docs = list(query.stream()) # Execute query

            if existing_docs:
                # --- Update Existing Document ---
                doc_ref = existing_docs[0].reference
                # Update doesn't add 'createdAt'
                doc_ref.update(data)
                print(f"  Updated recitation (FS ID: {doc_ref.id}, recId: {recitation_id_from_csv}): '{data['text'][:50]}...'")
                updated_count += 1
            else:
                # --- Add New Document ---
                # Add 'createdAt' only when creating a new document
                data['createdAt'] = firestore.SERVER_TIMESTAMP
                # Let Firestore generate the main document ID (doc_ref_new.id)
                doc_ref_new = recitations_collection.document() # Get ref to new doc with auto-ID
                doc_ref_new.set(data) # Set the data for the new doc
                print(f"  Added recitation (FS ID: {doc_ref_new.id}, recId: {recitation_id_from_csv}): '{data['text'][:50]}...'")
                added_count += 1

        except KeyError as e:
            # Handle cases where an expected column header is missing in the CSV
            print(f"Skipping row {row_number}: Missing expected column header in CSV: {e}")
            skipped_count += 1
        except Exception as e:
            # Catch any other errors during processing of a single row
            print(f"Error processing row {row_number} (recId: {recitation_id_from_csv}): {e}")
            # print(f"  Row data that caused error: {row.to_dict()}") # Uncomment for detailed row debug info
            skipped_count += 1

    # --- Final Summary ---
    print(f"\n--- Upload/Update Summary ---")
    print(f"  Documents Added:   {added_count}")
    print(f"  Documents Updated: {updated_count}")
    print(f"  Rows Skipped:      {skipped_count}")
    print(f"-----------------------------")

# --- Function to delete all documents in a collection (USE WITH EXTREME CAUTION) ---
def delete_all_documents(coll_name):
    """Deletes all documents in the specified collection using batches."""
    print(f"\nWARNING: Attempting to delete ALL documents from collection '{coll_name}'...")
    try:
        coll_ref = db.collection(coll_name)
        batch_size = 100 # Adjust batch size if needed (Firestore limit is 500 writes per batch)
        docs = coll_ref.limit(batch_size).stream()
        deleted_count = 0
        commit_count = 0

        # Keep deleting batches until no documents are left
        while True:
            docs_list = list(docs)
            if not docs_list:
                break # No more documents to delete in this collection

            # Create a new batch delete operation for the current batch of documents
            batch = db.batch()
            for doc in docs_list:
                batch.delete(doc.reference)

            # Commit the batch delete
            batch.commit()
            commit_count += 1
            deleted_count += len(docs_list)
            print(f"  Deleted batch #{commit_count} ({len(docs_list)} documents). Total deleted: {deleted_count}")

            # Check if we deleted fewer docs than the batch size, meaning we're done
            # This check might be slightly optimistic if deletions cause index changes,
            # but re-querying with limit handles pagination correctly.
            if len(docs_list) < batch_size:
                break

            # Fetch the next batch (using limit implicitly pages)
            docs = coll_ref.limit(batch_size).stream() # Re-fetch the stream after deletion

        # Final report
        if deleted_count > 0:
            print(f"Successfully deleted {deleted_count} documents from {coll_name}.")
        else:
            print(f"No documents found to delete in {coll_name}.")

    except Exception as e:
        print(f"ERROR during deletion process for collection '{coll_name}': {e}")
        print("Deletion may be incomplete.")

# --- Main Execution Block ---
if __name__ == "__main__":
    # --- Configuration for Deletion ---
    # SET TO True IF YOU WANT TO WIPE THE COLLECTION BEFORE UPLOADING.
    # USE WITH CAUTION! Set back to False for regular updates/additions.
    DELETE_FIRST = False
    # --- End Deletion Configuration ---

    print("--- Starting Recitation Upload Script ---")

    if DELETE_FIRST:
        print(f"\n*** WARNING: DELETE_FIRST is set to True. ***")
        # Add a simple confirmation step to prevent accidental deletion
        confirm = input(f"Type exactly 'DELETE' to confirm deletion of ALL documents in '{COLLECTION_NAME}': ")
        if confirm == 'DELETE':
            print("Proceeding with deletion...")
            delete_all_documents(COLLECTION_NAME)
            print("Deletion complete. Proceeding with upload...")
        else:
            print("Deletion cancelled by user. Exiting script.")
            sys.exit(0) # Exit safely
    else:
        print(f"\nINFO: DELETE_FIRST is False. Script will add/update documents in '{COLLECTION_NAME}'.")


    # Read data from CSV file
    dataframe = read_data(DATA_FILE_PATH)

    # Upload or update data only if dataframe was read successfully
    if dataframe is not None:
        upload_or_update_recitations(dataframe)
    else:
        print("\nExiting script because data could not be read from CSV.")

    print("\n--- Recitation Upload Script Finished ---")