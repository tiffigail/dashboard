# python_script_for_firestore_upload.py
# Reads a CSV file and uploads recitation data to Firestore.
# Updated paths for running within WSL (Ubuntu) accessing Windows folders.

import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore
import math # Used for checking NaN - Not strictly needed with fillna now
import sys # To exit gracefully on error

# --- Configuration ---
# !!! IMPORTANT: Please verify these paths before running !!!

# Path to your Service Account Key JSON file located in your WINDOWS Downloads folder,
# accessed from within WSL Ubuntu.
# *** Replace 'aharr' with your ACTUAL WINDOWS username if different. ***
# *** Make sure the filename matches exactly what you downloaded. ***
SERVICE_ACCOUNT_KEY_PATH = '/mnt/c/Users/aharr/Downloads/dashboard-bb237-firebase-adminsdk-fbsvc-76972dbf6d.json' # WSL Path to Windows Downloads

# Path to your CSV file.
# This assumes your 'gearshift-dashboard' project folder is located
# directly inside your WSL Ubuntu home directory (/home/aharr/).
# If your project is elsewhere (e.g., also on the C: drive), adjust this path accordingly
# (e.g., '/mnt/c/Users/aharr/path/to/project/public/Dashboard - Recitations.csv').
CSV_FILE_PATH = '/home/aharr/gearshift-dashboard/public/Dashboard - Recitations.csv'
# --- End Configuration ---

FIRESTORE_COLLECTION_NAME = 'recitations' # The target collection in Firestore

# --- Initialize Firebase Admin SDK ---
# This section connects the script to YOUR Firebase project using the key file.
try:
    # Check if already initialized (useful if running in interactive environments)
    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully.")
    else:
        # Use the already initialized default app if it exists
        firebase_admin.get_app()
        print("Firebase Admin SDK already initialized.")
    db = firestore.client() # Get a Firestore client instance
except FileNotFoundError:
     print(f"ERROR: Service Account Key file not found at '{SERVICE_ACCOUNT_KEY_PATH}'")
     print("Please ensure the path is correct for WSL access to your Windows Downloads folder and the filename is correct.")
     print("Remember to keep your service account key file secure.")
     sys.exit(1) # Exit the script
except Exception as e:
    print(f"ERROR: Failed to initialize Firebase Admin SDK: {e}")
    print("Ensure the path to your service account key is correct and the file is valid.")
    sys.exit(1) # Exit the script

# --- Read CSV Data using Pandas ---
try:
    # Read the CSV file.
    df = pd.read_csv(CSV_FILE_PATH, keep_default_na=False, na_values=[''])

    # Fill potential NaN values in essential string columns with empty strings
    df['Recitation'] = df['Recitation'].fillna('')
    df['Context'] = df['Context'].fillna('')
    df['Axis'] = df['Axis'].fillna('') # Axis is optional

    print(f"Successfully read {len(df)} rows from {CSV_FILE_PATH}")

except FileNotFoundError:
    print(f"ERROR: CSV file not found at '{CSV_FILE_PATH}'")
    print("Please ensure the path is correct. If your project is on your Windows C: drive, the path should start with /mnt/c/...")
    sys.exit(1) # Exit the script
except Exception as e:
    print(f"ERROR: Failed to read or process CSV file: {e}")
    sys.exit(1) # Exit the script

# --- Data Processing and Upload ---
print(f"Starting Firestore upload process to collection '{FIRESTORE_COLLECTION_NAME}'...")
success_count = 0
skipped_count = 0
error_count = 0

# Group rows by the 'Recitation' text.
df_grouped = df.groupby('Recitation')

for recitation_text, group in df_grouped:
    # Skip rows where the Recitation text itself is empty
    if not recitation_text:
        print("Skipping row(s) with empty Recitation text.")
        skipped_count += len(group)
        continue

    print(f"\nProcessing recitation: '{recitation_text}'")

    # Prepare the main data dictionary for this unique recitation text
    firestore_data = {
        'text': recitation_text,
        'axisTheme': None,
        'contexts': [],
        'isActiveFor': {},
        'isArchived': False,
        'createdAt': firestore.SERVER_TIMESTAMP
    }

    processed_contexts = set()

    # Iterate through all rows corresponding to this specific recitation text
    for index, row in group.iterrows():
        # Populate Fields
        if firestore_data['axisTheme'] is None and pd.notna(row['Axis']) and row['Axis'].strip():
            firestore_data['axisTheme'] = row['Axis'].strip()

        if index == group.index[0]:
             archived_str = str(row['Archived']).strip().upper()
             firestore_data['isArchived'] = (archived_str == 'TRUE')

        context = str(row['Context']).strip()
        if context:
            if context not in processed_contexts:
                 firestore_data['contexts'].append(context)
                 processed_contexts.add(context)
            active_str = str(row['Active']).strip().upper()
            firestore_data['isActiveFor'][context] = (active_str == 'TRUE')

    if firestore_data['axisTheme'] is None:
        del firestore_data['axisTheme']

    # --- Add the processed data to Firestore ---
    try:
        doc_ref = db.collection(FIRESTORE_COLLECTION_NAME).add(firestore_data)
        print(f"  Successfully added document with ID: {doc_ref[1].id}")
        success_count += 1
    except Exception as e:
        print(f"  ERROR: Failed to add document for recitation '{recitation_text}': {e}")
        error_count += 1

# --- Summary ---
print("\n--- Upload Summary ---")
print(f"Successfully added: {success_count}")
print(f"Skipped (e.g., empty text): {skipped_count}")
print(f"Errors: {error_count}")
print("----------------------")
