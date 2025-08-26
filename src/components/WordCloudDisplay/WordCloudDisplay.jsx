// src/components/WordCloudDisplay/WordCloudDisplay.jsx
import React, { useState, useEffect } from 'react';
import WordCloud from 'react-d3-cloud';
import styles from './WordCloudDisplay.module.css';

import { db } from '../../firebaseConfig';
import { collection, getDocs, query, where } from "firebase/firestore";

// The default list of common "stop words" to ignore.
const defaultStopWords = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself',
  'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom',
  'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an',
  'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at',
  'by', 'for', 'with', 'about', 'against', 'doesnt', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'like',
  'on', 'off', 'dont', 'got', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'don\'t', 'it\'s', 'that\'s'
]);

// Default options for styling the cloud (reverted to a cleaner style)
const defaultOptions = {
  font: 'Impact',
  padding: 2,
  rotations: 2,
  rotationAngles: [-90, 0],
  scale: 'sqrt',
  spiral: 'archimedean',
  fontSize: (word) => Math.log2(word.value) * 15 + 20,
};


function WordCloudDisplay({ collectionName, textField, filter, customStopWords = [], options = {} }) {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Combine default options with any custom options passed in as props
  const finalOptions = { ...defaultOptions, ...options };

  useEffect(() => {
    const processTextData = async () => {
      if (!collectionName || !textField) {
        setError("Error: collectionName and textField props are required.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const allText = [];

      try {
        const collectionRef = collection(db, collectionName);
        let q = query(collectionRef); 

        if (filter && filter.field && filter.value) {
          q = query(collectionRef, where(filter.field, "==", filter.value));
        }

        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data[textField] && typeof data[textField] === 'string') {
            allText.push(data[textField]);
          }
        });

        const combinedStopWords = new Set([...defaultStopWords, ...customStopWords.map(w => w.toLowerCase())]);

        const wordFrequencies = {};
        allText
          .join(' ')
          .toLowerCase()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"")
          .split(/\s+/)
          .forEach(word => {
            if (word && !combinedStopWords.has(word)) {
              wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
            }
          });
        
        const formattedWords = Object.entries(wordFrequencies).map(([text, value]) => ({
          text,
          value,
        }));

        setWords(formattedWords);

      } catch (err) {
          console.error(`Error fetching from ${collectionName}:`, err);
          setError(`Failed to load data from '${collectionName}'. Please check the console.`);
      } finally {
        setLoading(false);
      }
    };

    processTextData();
  }, [collectionName, textField, filter, customStopWords]); 

  if (loading) {
    return <div className={styles.container}><h2>Loading and analyzing text...</h2></div>;
  }
  if (error) {
    return <div className={styles.container}><h2>{error}</h2></div>;
  }
  if (words.length === 0) {
    return <div className={styles.container}><h2>No text found to display.</h2></div>
  }

  return (
    <div className={styles.container}>
      <h2>Common Themes in "{filter ? filter.value : collectionName}"</h2>
      <div className={`${styles.wordCloudWrapper} ${styles.customCloudColors}`}>
        <WordCloud
          data={words}
          {...finalOptions}
        />
      </div>
    </div>
  );
}

export default WordCloudDisplay;