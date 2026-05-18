import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import styles from '@/components/ui/ImageUploader/ImageUploader.module.css';

function ImageUploader({ onUploadSuccess, axisId, projectId }) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    setIsUploading(true);
    const storage = getStorage();
    const storagePath = `${axisId}/${projectId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(prog);
      }, 
      (error) => {
        console.error("Upload failed:", error);
        setIsUploading(false);
      }, 
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          if (onUploadSuccess) {
            onUploadSuccess(downloadURL, file.name);
          }
          setIsUploading(false);
          setProgress(0);
          if(fileInputRef.current) fileInputRef.current.value = "";
        });
      }
    );
  };

  return (
    <div className={styles.container}>
      <input 
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      <button 
        className={styles.button}
        onClick={handleFileSelect}
        disabled={isUploading || !projectId}
        title="Add an image to this project"
      >
        {isUploading ? `${Math.round(progress)}%` : '+ Add Image'}
      </button>
    </div>
  );
}

ImageUploader.propTypes = {
    onUploadSuccess: PropTypes.func.isRequired,
    axisId: PropTypes.string,
    projectId: PropTypes.string,
};

export default ImageUploader;