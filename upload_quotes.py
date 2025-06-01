# Save this as 'upload_quotes.py' in your project folder (e.g., gearshift-dashboard)

import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
import datetime
import sys # To exit on error

# --- Configuration ---
# IMPORTANT: Replace with the *actual path* to your key file relative to where this script is.
SERVICE_ACCOUNT_KEY_PATH = "serviceAccountKey.json" # Example: Assumes key is in the same folder as script

# IMPORTANT: Replace with the *actual path* to your CSV file relative to where this script is.
DATA_FILE_PATH = "Dashboard - Dear Abi.csv" # Example: Assumes CSV is in the same folder as script

COLLECTION_NAME = "dearAbiQuotes"
# --- End Configuration ---

# --- Initialize Firebase Admin SDK ---
try:
    cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
    # Check if the app is already initialized to avoid errors on re-runs in some environments
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    else:
        # Get the default app if already initialized
        firebase_admin.get_app()
    db = firestore.client()
    print("Firebase Admin SDK initialized successfully.")
except FileNotFoundError:
    print(f"ERROR: Service account key not found at '{SERVICE_ACCOUNT_KEY_PATH}'")
    print("Please ensure the path is correct and the file exists.")
    sys.exit(1) # Exit the script
except Exception as e:
    print(f"Error initializing Firebase Admin SDK: {e}")
    sys.exit(1) # Exit the script
# --- End Initialization ---

# --- Function to read data (using pandas for CSV) ---
def read_data(file_path):
    try:
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path, dtype=str) # Read all as string initially
        # Add support for Excel if needed later
        # elif file_path.endswith(('.xls', '.xlsx')):
        #     df = pd.read_excel(file_path, dtype=str)
        else:
            print(f"Unsupported file type: {file_path}")
            return None
        # Replace potential missing values (NaN) with empty strings
        df = df.fillna('')
        print(f"Read {len(df)} rows from {file_path}")
        return df
    except FileNotFoundError:
        print(f"ERROR: Data file not found at {file_path}")
        return None
    except Exception as e:
        print(f"Error reading data file: {e}")
        return None

# --- Function to process and upload/update data ---
def upload_or_update_quotes(df):
    if df is None:
        return

    quotes_collection = db.collection(COLLECTION_NAME)
    added_count = 0
    updated_count = 0
    skipped_count = 0

    print(f"\nStarting upload/update to collection '{COLLECTION_NAME}'...")

    for index, row in df.iterrows():
        try:
            # --- Get required fields (quoteId and text) ---
            quote_id_from_csv = str(row.get('quoteId', '')).strip()
            quote_text = str(row.get('text', '')).strip()

            # Skip row if quoteId or text is empty
            if not quote_id_from_csv:
                print(f"Skipping row {index + 2}: quoteId is missing.")
                skipped_count += 1
                continue
            if not quote_text:
                print(f"Skipping row {index + 2}: Text is empty.")
                skipped_count += 1
                continue

            # --- Prepare data dictionary for Firestore ---
            data = {
                'quoteId': quote_id_from_csv, # Store the ID from CSV
                'text': quote_text,
                'author': str(row.get('author', 'Unknown')).strip() or 'Unknown',
                 # Split strings by ';' and create arrays, filter out empty strings, default to ['all'] if empty
                'relatedMonthIds': [m.strip() for m in str(row.get('relatedMonthIds', 'all')).split(';') if m.strip()] or ['all'],
                'relatedAxes': [a.strip() for a in str(row.get('relatedAxes', 'all')).split(';') if a.strip()] or ['all'],
                'tags': [t.strip() for t in str(row.get('tags', '')).split(';') if t.strip()], # Okay if tags array is empty
                'updatedAt': firestore.SERVER_TIMESTAMP # Update timestamp every time
            }

            # --- Check if document exists based on quoteId ---
            query = quotes_collection.where("quoteId", "==", quote_id_from_csv).limit(1)
            existing_docs = list(query.stream()) # Execute query

            if existing_docs:
                # --- Update Existing Document ---
                doc_ref = existing_docs[0].reference
                # Don't overwrite createdAt if it exists, just update other fields
                update_data = data.copy()
                # We won't add 'createdAt' during update, only set on creation
                doc_ref.update(update_data)
                print(f"  Updated quote (FS ID: {doc_ref.id}, quoteId: {quote_id_from_csv}): {data['text'][:50]}...")
                updated_count += 1
            else:
                # --- Add New Document ---
                # Add createdAt timestamp only when creating new document
                data['createdAt'] = firestore.SERVER_TIMESTAMP
                # Let Firestore generate the document ID, but store our quoteId field
                doc_ref_new = quotes_collection.document() # Create a reference with a new Firestore ID
                doc_ref_new.set(data) # Set the data
                print(f"  Added quote (FS ID: {doc_ref_new.id}, quoteId: {quote_id_from_csv}): {data['text'][:50]}...")
                added_count += 1

        except Exception as e:
            print(f"Error processing row {index + 2}: {e}")
            # print(f"  Row data: {row.to_dict()}") # Uncomment for detailed row debug
            skipped_count += 1

    print(f"\nUpload/Update complete. Added: {added_count}, Updated: {updated_count}, Skipped: {skipped_count}")

# --- Optional: Function to delete all documents ---
def delete_all_documents(coll_name):
    print(f"\nAttempting to delete all documents from '{coll_name}'...")
    coll_ref = db.collection(coll_name)
    batch_size = 50 # Firestore batch limit
    docs = coll_ref.limit(batch_size).stream()
    deleted_count = 0
    while True:
        docs_list = list(docs)
        if not docs_list:
            break # No more documents to delete
        # Create a new batch delete operation
        batch = db.batch()
        for doc in docs_list:
             print(f'  Deleting doc {doc.id}...')
             batch.delete(doc.reference)
             deleted_count += 1
        # Commit the batch
        batch.commit()
        print(f"  Deleted batch of {len(docs_list)} documents.")
        # Fetch the next batch
        docs = coll_ref.limit(batch_size).stream()

    print(f"Deleted {deleted_count} documents from {coll_name}.")


# --- Main Execution ---
if __name__ == "__main__":
    # Decide whether to delete first or not
    DELETE_FIRST = False # SET TO True IF YOU WANT TO WIPE THE COLLECTION FIRST

    if DELETE_FIRST:
        print("WARNING: DELETE_FIRST is set to True. All documents will be deleted.")
        # Add a confirmation step maybe? input("Press Enter to confirm deletion...")
        delete_all_documents(COLLECTION_NAME)

    # Read data from file
    dataframe = read_data(DATA_FILE_PATH)

    # Upload or update data
    if dataframe is not None:
        upload_or_update_quotes(dataframe)