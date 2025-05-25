// ProjectMapGenerator.jsx
import React, { useState } from 'react';
import styles from './ProjectMapGenerator.module.css'; // Import the CSS module

function ProjectMapGenerator() {
  // State variables to manage input, loading, image, and messages
  const [projectDescription, setProjectDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' }); // type can be 'success' or 'error'

  // Handler for the generate button click
  const handleGenerateMap = async () => {
    if (!projectDescription.trim()) {
      setMessage({ text: 'Please enter a description for your project map.', type: 'error' });
      return;
    }

    // Reset previous results and messages
    setGeneratedImageUrl('');
    setMessage({ text: '', type: '' });
    setIsLoading(true);

    try {
      // Construct the prompt for the image generation model
      const prompt = `A visually appealing and clear project map representing: ${projectDescription}. Ensure the style is professional and easy to understand. Include elements like timelines, key milestones, dependencies, and resource allocation if relevant to the description.`;

      // Prepare the payload for the API call
      const payload = {
        instances: [{ prompt: prompt }],
        parameters: { "sampleCount": 1 }
      };

      const apiKey = ""; // API key will be injected by the environment in a production setting
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

      // Make the API call
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();

      // Check if predictions are available
      if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
        const imageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
        setGeneratedImageUrl(imageUrl);
        setMessage({ text: 'Project map generated successfully!', type: 'success' });
      } else {
        console.error('Unexpected API response structure:', result);
        throw new Error('Failed to get image data from the API response.');
      }

    } catch (error) {
      console.error('Error generating project map:', error);
      setMessage({ text: `Error: ${error.message}`, type: 'error' });
      // Set a placeholder image on error
      setGeneratedImageUrl(`https://placehold.co/600x400/334155/94a3b8?text=Error+Generating+Map`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback for image loading errors
  const handleImageError = () => {
    setGeneratedImageUrl(`https://placehold.co/600x400/334155/94a3b8?text=Image+Load+Error`);
    setMessage({ text: 'There was an error loading the generated image.', type: 'error' });
  };

  return (
    <div className={styles.appContainer}>
      <header className={styles.header}>
        <h1>Project Map Generator</h1>
        <p>Describe your project, and we'll generate a visual map for it!</p>
      </header>

      <main>
        <div className={styles.formGroup}>
          <label htmlFor="projectDescriptionInput">Describe your project map:</label>
          <textarea
            id="projectDescriptionInput"
            rows="4"
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="e.g., A mind map for a new software launch, showing key features, marketing plan, and development timeline. Use a futuristic theme."
            className={styles.textarea}
          />
        </div>

        <button
          onClick={handleGenerateMap}
          disabled={isLoading}
          className={`${styles.generateButton} ${isLoading ? styles.buttonDisabled : ''}`}
        >
          {isLoading ? 'Generating...' : 'Generate Map'}
        </button>

        {isLoading && (
          <div className={styles.loadingIndicator}>
            <div className={styles.loader}></div>
            <p>Generating your project map... this might take a moment.</p>
          </div>
        )}

        {message.text && (
          <div className={`${styles.messageBox} ${message.type === 'success' ? styles.messageBoxSuccess : styles.messageBoxError}`}>
            {message.text}
          </div>
        )}

        {generatedImageUrl && !isLoading && ( // Only show image if not loading and URL exists
          <div className={styles.imageResult}>
            <h2>Generated Project Map:</h2>
            <img
              src={generatedImageUrl}
              alt="Generated Project Map"
              onError={handleImageError}
              className={styles.generatedImage}
            />
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} AI Project Visualizer. Powered by Generative AI.</p>
      </footer>
    </div>
  );
}

export default ProjectMapGenerator;

// ProjectMapGenerator.module.css
/* You'll create this file separately */
/* Content for ProjectMapGenerator.module.css:

:global(body) {
  font-family: 'Inter', sans-serif;
  background-color: #0f172a;
  color: #f1f5f9;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  margin: 0;
}

:global(::selection) {
  background-color: #0ea5e9;
  color: #ffffff;
}

.appContainer {
  background-color: #1e293b;
  padding: 2rem;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 42rem;
}

.header {
  margin-bottom: 1.5rem;
  text-align: center;
}

.header h1 {
  font-size: 2.25rem;
  line-height: 2.5rem;
  font-weight: 700;
  color: #38bdf8;
}

.header p {
  color: #94a3b8;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.formGroup {
  margin-bottom: 1.5rem;
}

.formGroup label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 500;
  color: #7dd3fc;
}

.textarea {
  background-color: #334155;
  border: 1px solid #475569;
  color: #f1f5f9;
  font-size: 0.875rem;
  border-radius: 0.5rem;
  display: block;
  width: 100%;
  padding: 0.625rem;
  font-family: 'Inter', sans-serif;
}

.textarea::placeholder {
  color: #94a3b8;
}

.textarea:focus {
  outline: 2px solid #0ea5e9;
  border-color: #0ea5e9;
}

.generateButton {
  width: 100%;
  color: #ffffff;
  background-color: #0284c7;
  font-weight: 500;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  padding: 0.75rem 1.25rem;
  text-align: center;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease-in-out;
}

.generateButton:hover:not(:disabled) {
  background-color: #0369a1;
}

.generateButton:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(2, 132, 199, 0.5);
}

.buttonDisabled {
  background-color: #075985 !important; 
  cursor: not-allowed;
}

.loadingIndicator {
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.loader {
  border: 5px solid #f3f3f3;
  border-top: 5px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 20px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loadingIndicator p {
  color: #94a3b8;
  font-size: 0.875rem;
}

.messageBox {
  padding: 1rem;
  margin-top: 1rem;
  border-radius: 0.5rem;
  text-align: center;
}

.messageBoxSuccess {
  background-color: #d1fae5;
  color: #065f46;
}

.messageBoxError {
  background-color: #fee2e2;
  color: #991b1b;
}

.imageResult {
  margin-top: 1.5rem;
  background-color: #334155;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
}

.imageResult h2 {
  font-size: 1.25rem;
  line-height: 1.75rem;
  font-weight: 600;
  color: #38bdf8;
  margin-bottom: 0.75rem;
  text-align: center;
}

.generatedImage {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.footer {
  margin-top: 2rem;
  text-align: center;
}

.footer p {
  font-size: 0.75rem;
  line-height: 1rem;
  color: #64748b;
}

*/
