'use client';
import { searchQuery, showSuggestion } from '@/src/states/atoms/queryAtom';
import { Mic, Search,  Sparkles, X } from 'lucide-react';
import React, { useState, ChangeEvent, useEffect, useRef} from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';

type SearchBarProps = {
  suggestions: string[];
  onSelect: (value: string) => void;
};

const SearchBar: React.FC<SearchBarProps> = ({ suggestions, onSelect }) => {
  const query = useRecoilValue(searchQuery);
  const setQuery = useSetRecoilState(searchQuery);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const showSuggestions = useRecoilValue(showSuggestion);
  const setShowSuggestions = useSetRecoilState(showSuggestion);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [error, setError] = useState<string | null>(null);
  const [justSelected, setJustSelected] = useState(false);
  const [listening, setListening] = useState(false);
  const [endSpeech, setEndSpeech] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Add initial load flag

  const searchBarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setEndSpeech(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      if(isInitialLoad) {
        setShowSuggestions(false);
        setIsInitialLoad(false);
      }
      console.log("debouncedQuery", debouncedQuery);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    if (debouncedQuery && !justSelected) {
      const fetchSuggestions = async () => {
        try {
          if (debouncedQuery === 'error') {
            throw new Error('500 Internal Server Error');
          }

          setFilteredSuggestions(
            suggestions.filter((suggestion) =>
              suggestion.toLowerCase().includes(debouncedQuery.toLowerCase())
            )
          );

          // Only show suggestions if it's not the initial load
          if (!isInitialLoad) {
            console.log("iniral load", isInitialLoad);
            setShowSuggestions(debouncedQuery.length > 0);
          }

          setError(null);
        } catch (e) {
          setError('500 Internal Server Error');
        }
      };
      fetchSuggestions();
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      setError(null);
    }

    // Set initial load to false after the first render
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [debouncedQuery, suggestions, justSelected]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.blur();
    }
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (justSelected) {
      setJustSelected(false);
      return;
    }
    setQuery(e.target.value);
  };

  const handleSelect = (value: string) => {
    setQuery(value);
    setFilteredSuggestions([]);
    setShowSuggestions(false);
    setJustSelected(true);
    onSelect(value);

    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const SpeechRecog = () => {
    const SpeechRecognition = (window ).SpeechRecognition || (window).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();

    if (endSpeech) {
      recognition.stop();
      setListening(false);
      setEndSpeech(false);
      return;
    }

    recognition.onstart = () => {
      console.log("Listening...");
      setListening(true);
    };

    recognition.onspeechend = () => {
      recognition.stop();
      console.log("Stopped listening");
      setListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
    };

    recognition.start();
  };

  const clearButtonClicked = () => {
    setQuery('');
    setFilteredSuggestions([]);
    setShowSuggestions(false);
    setJustSelected(false);
    setListening(false);
  };

  return (
    <div className="relative flex justify-center items-center w-full max-w-5xl mx-auto" ref={searchBarRef}>
      <div className='relative w-[95vw] md:w-[50vw] px-5 py-1 bg-white rounded-3xl shadow-md shadow-gray-200  outline outline-1 outline-[#eceef2]'>
        <div className="absolute left-0 top-0 flex items-center pl-4 h-full">
          <Search size={20} color="#4A0A84" />
        </div>

        <input
          ref={inputRef}
          id="search-input"
          type="text"
          autoFocus={false}
          value={query}
          onChange={handleChange}
          className={`w-full pl-6 pr-10 py-2 focus:outline-none focus:border-blue-500 ${listening ? 'placeholder-blue-500' : 'placeholder-gray-050'}`}
          placeholder={listening ? 'Listening...' : 'Search...'}
        />

        {(query || listening) ? (
          <div className="absolute right-0 top-0 flex items-center pr-4 h-full">
            <X size={20} color="#B4B4B8" className='text-[#B4B4B8] hover:cursor-pointer hover:scale-125 hover:font-bold ease-in-out transition-all' onClick={clearButtonClicked} />
          </div>
        ) : (
          <div className="absolute right-0 top-0 flex items-center pr-4 h-full gap-1">
            <Mic
              size={20}
              color='#4A0A84'
              className='text-[#B4B4B8] hover:cursor-pointer hover:scale-125 hover:font-bold ease-in-out transition-all'
              onClick={SpeechRecog}
            />
            <Sparkles size={20} color="#4A0A84" className="text-[#B4B4B8] hover:cursor-pointer hover:scale-125 hover:font-bold ease-in-out transition-all" />
          </div>
        )}
      </div>

      {error && <div className="text-sm text-red-500 mt-1">{error}</div>}

      {showSuggestions && (
        <ul className="absolute top-full left-0 w-full md:w-[50vw] bg-white border border-gray-300 rounded-lg shadow-lg z-[1000] custom-scrollbar max-h-[300px] mt-1 overflow-y-auto">
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((suggestion, index) => (
              <li
                key={index}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSelect(suggestion)}
              >
                <HighlightedText text={suggestion} query={query} />
              </li>
            ))
          ) : (
            <li className="px-4 py-2 text-gray-500">No suggestions</li>
          )}
        </ul>
      )}
    </div>
  );
};

type HighlightedTextProps = {
  text: string;
  query: string;
};

const HighlightedText = ({ text, query }: HighlightedTextProps) => {
  if (!query) return <>{text}</>;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={index} className="text-gray-400 font-semibold">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};

export default SearchBar;
