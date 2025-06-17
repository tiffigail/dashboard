# functions/main.py

import os.path
from firebase_functions import storage_fn
from firebase_admin import initialize_app, firestore, storage

# Initialize the Firebase Admin SDK
initialize_app()

# We will look for this marker in the filename to identify resized images.
RESIZED_IMAGE_MARKER = "_800x800"

@storage_fn.on_object_finalized(bucket="dashboard-bb237.firebasestorage.app")
def on_image_upload(event: storage_fn.CloudEvent[storage_fn.StorageObjectData]):
    """
    Triggered when a file is finalized in Cloud Storage.
    This function ONLY processes resized images and saves their details to Firestore.
    """
    
    file_path = event.data.name
    
    # --- THIS IS THE CORRECTED LOGIC ---
    # We now check if our marker string is contained anywhere in the file path.
    # This works for any file type (e.g., .jpg, .png, etc.).
    if RESIZED_IMAGE_MARKER not in file_path:
        print(f"Ignoring file: {file_path}. It is not a resized image.")
        return None

    # If it IS a resized image, proceed.
    print(f"Processing RESIZED file: {file_path}")
    
    bucket_name = event.data.bucket
    
    directory_path = os.path.dirname(file_path)
    associated_room = os.path.basename(directory_path)

    if not associated_room or associated_room == ".":
        associated_room = None
    else:
        print(f"Parent folder found. Setting associatedRoom to: '{associated_room}'")

    file_name = os.path.basename(file_path)

    try:
        bucket = storage.bucket(bucket_name)
        blob = bucket.blob(file_path)
        
        public_url = blob.public_url
        print(f"Got public URL for resized image: {public_url}")

    except Exception as e:
        print(f"Error getting public URL: {e}")
        return

    try:
        firestore_client = firestore.client()
        
        image_record = {
            "title": file_name,
            "context": directory_path,
            "imageUrl": public_url,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "storagePath": file_path,
        }

        if associated_room:
            image_record["associatedRoom"] = associated_room
        
        doc_ref = firestore_client.collection("images").add(image_record)
        print(f"Successfully created Firestore document for resized image: {doc_ref[1].id}")

    except Exception as e:
        print(f"Error creating Firestore document: {e}")