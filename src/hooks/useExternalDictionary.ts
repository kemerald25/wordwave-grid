import { useState, useCallback } from 'react';

interface DictionaryResponse {
  isValid: boolean;
  definition?: string;
  error?: string;
}

export function useExternalDictionary() {
  const [isLoading, setIsLoading] = useState(false);

  const validateWord = useCallback(async (word: string): Promise<DictionaryResponse> => {
    if (!word || word.length < 2) {
      return { isValid: false, error: 'Word too short' };
    }

    const normalizedWord = word.toLowerCase().trim().replace(/[^a-z]/g, '');
    
    if (!normalizedWord) {
      return { isValid: false, error: 'Invalid word format' };
    }

    setIsLoading(true);

    try {
      // Try Free Dictionary API first
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${normalizedWord}`);
      
      if (response.ok) {
        const data = await response.json();
        const definition = data[0]?.meanings?.[0]?.definitions?.[0]?.definition || 'Valid word';
        return { isValid: true, definition };
      }

      // If Free Dictionary API fails, try Merriam-Webster (backup)
      // Note: In production, you'd want to use your own API key
      const backupResponse = await fetch(`https://www.dictionaryapi.com/api/v3/references/collegiate/json/${normalizedWord}?key=your-api-key`);
      
      if (backupResponse.ok) {
        const backupData = await backupResponse.json();
        if (Array.isArray(backupData) && backupData.length > 0 && typeof backupData[0] === 'object') {
          return { isValid: true, definition: 'Valid word' };
        }
      }

      // If both APIs fail, use a basic word list check
      const commonWords = await getCommonWords();
      const isCommonWord = commonWords.includes(normalizedWord);
      
      return { 
        isValid: isCommonWord, 
        error: isCommonWord ? undefined : 'Word not found in dictionary' 
      };

    } catch (error) {
      console.error('Dictionary API error:', error);
      
      // Fallback to basic validation
      const commonWords = await getCommonWords();
      const isCommonWord = commonWords.includes(normalizedWord);
      
      return { 
        isValid: isCommonWord, 
        error: isCommonWord ? undefined : 'Dictionary service unavailable' 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { validateWord, isLoading };
}

// Fallback word list for when APIs are unavailable
async function getCommonWords(): Promise<string[]> {
  // This could be cached or loaded from a CDN
  return [
    'apple', 'echo', 'orange', 'elephant', 'table', 'eagle', 'door', 'river',
    'rainbow', 'wolf', 'fire', 'energy', 'yarn', 'night', 'tree', 'earth',
    'house', 'sun', 'moon', 'nature', 'game', 'time', 'space', 'chair',
    'book', 'keyboard', 'dance', 'music', 'art', 'text', 'tiger', 'rabbit',
    'tower', 'road', 'dream', 'magic', 'castle', 'dragon', 'quest', 'team',
    'mountain', 'ocean', 'forest', 'thunder', 'lightning', 'storm', 'peace',
    'freedom', 'journey', 'adventure', 'mystery', 'wonder', 'cat', 'dog',
    'bird', 'fish', 'star', 'cloud', 'wind', 'rain', 'snow', 'ice',
    'water', 'light', 'dark', 'red', 'blue', 'green', 'yellow', 'black',
    'white', 'love', 'hope', 'joy', 'fear', 'anger', 'happy', 'sad',
    'big', 'small', 'fast', 'slow', 'hot', 'cold', 'new', 'old'
  ];
}